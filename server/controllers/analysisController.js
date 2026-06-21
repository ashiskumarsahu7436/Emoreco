import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@deepgram/sdk'
import Groq from 'groq-sdk'
import axios from 'axios'
import PDFDocument from 'pdfkit'
import { getOne, getAll, run } from '../config/database.js'

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function getDeepgramClient() {
  if (!process.env.DEEPGRAM_API_KEY) {
    throw new Error('DEEPGRAM_API_KEY is not configured')
  }
  return createClient(process.env.DEEPGRAM_API_KEY)
}

function getGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured')
  }
  return new Groq({ apiKey: process.env.GROQ_API_KEY })
}

export const analyzeAudio = async (req, res) => {
  let audioPath = null

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file required' })
    }

    audioPath = req.file.path
    const { spaceId, sourceType } = req.body
    const storedAudioPath = `${sourceType === 'upload' ? 'upload' : 'mic'}:${req.file.originalname || 'audio'}`

    const originalFilename = req.file.originalname || 'audio.wav'
    console.log('Steps 1 & 2: Running Deepgram and Behavioral Signals in parallel...')
    const [transcriptionResult, behavioralResult] = await Promise.allSettled([
      transcribeAudio(audioPath),
      analyzeBehavioralSignals(audioPath, originalFilename)
    ])

    const transcription = transcriptionResult.status === 'fulfilled'
      ? transcriptionResult.value
      : null

    if (!transcription) {
      console.error('Transcription failed:', transcriptionResult.reason)
      return res.status(500).json({ error: 'Transcription failed' })
    }

    const behavioral = behavioralResult.status === 'fulfilled'
      ? behavioralResult.value
      : { summary: 'Behavioral analysis unavailable', asrTranscription: '' }

    if (behavioralResult.status === 'rejected') {
      console.error('Behavioral Signals error:', behavioralResult.reason)
    }

    let autoMatchedSpaceId = null
    let autoMatchedProfileName = null
    if (behavioral.speakerEmbedding) {
      try {
        const profiles = await getAll(
          'SELECT * FROM speaker_profiles WHERE user_id = ? AND embedding IS NOT NULL',
          [req.user.userId]
        )
        for (const profile of profiles) {
          const storedEmb = JSON.parse(profile.embedding)
          const similarity = cosineSimilarity(behavioral.speakerEmbedding, storedEmb)
          console.log(`  → Similarity with "${profile.display_name}": ${similarity.toFixed(4)}`)
          if (similarity > 0.85 && profile.space_id) {
            autoMatchedSpaceId = profile.space_id
            autoMatchedProfileName = profile.display_name
            console.log(`  → Auto-matched to "${profile.display_name}" (space ${profile.space_id})`)
            break
          }
        }
      } catch (matchErr) {
        console.warn('Speaker auto-match error:', matchErr.message)
      }
    }

    const finalSpaceId = spaceId || autoMatchedSpaceId || null

    console.log('Step 3: Getting space history...')
    let spaceHistory = []
    if (finalSpaceId) {
      spaceHistory = await getAll(`
        SELECT transcription, primary_emotion, detailed_analysis
        FROM analyses
        WHERE space_id = ?
        ORDER BY created_at DESC
        LIMIT 5
      `, [finalSpaceId])
    }

    console.log('Step 4: Generating Primary Emotion analysis...')
    const primaryEmotion = await generatePrimaryEmotion(
      transcription.text,
      behavioral,
      spaceHistory
    )

    console.log('Step 5: Generating Detailed Analysis...')
    const detailedAnalysis = await generateDetailedAnalysis(
      transcription.text,
      behavioral,
      primaryEmotion,
      spaceHistory
    )

    const result = await run(`
      INSERT INTO analyses (
        user_id, space_id, audio_path, transcription, language,
        hume_emotions, primary_emotion, detailed_analysis
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.user.userId,
      finalSpaceId,
      storedAudioPath,
      transcription.text,
      transcription.language || 'en',
      JSON.stringify(behavioral),
      primaryEmotion,
      detailedAnalysis
    ])

    if (audioPath && fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath)
    }

    res.json({
      analysisId: result.lastInsertRowid,
      transcription: transcription.text,
      primaryEmotion,
      detailedAnalysis,
      autoMatchedProfile: autoMatchedProfileName || null,
      autoMatchedSpaceId: autoMatchedSpaceId || null
    })

  } catch (err) {
    console.error('Analysis error:', err)
    if (audioPath && fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath)
    }
    res.status(500).json({ error: err.message || 'Analysis failed' })
  }
}

async function transcribeAudio(audioPath) {
  try {
    const deepgram = getDeepgramClient()
    const audioBuffer = fs.readFileSync(audioPath)

    const { result } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: 'nova-2',
        smart_format: true,
        language: 'multi',
        detect_language: true
      }
    )

    const transcript = result.results.channels[0].alternatives[0].transcript
    const language = result.results.channels[0].detected_language || 'en'

    return { text: transcript, language }
  } catch (err) {
    console.error('Deepgram error:', err)
    throw new Error('Transcription failed: ' + err.message)
  }
}

async function analyzeBehavioralSignals(audioPath, originalFilename) {
  const cid = process.env.BEHAVIORAL_SIGNALS_CID
  const token = process.env.BEHAVIORAL_SIGNALS_TOKEN

  if (!cid || !token) {
    console.warn('Behavioral Signals credentials not configured, skipping emotion analysis')
    return { summary: 'Emotion analysis not configured', asrTranscription: '' }
  }

  try {
    const audioBuffer = fs.readFileSync(audioPath)
    const filename = originalFilename || path.basename(audioPath)
    const fileSize = audioBuffer.length

    const ext = path.extname(filename).toLowerCase()
    const mimeType = ext === '.mp3' ? 'audio/mpeg'
      : ext === '.m4a' ? 'audio/mp4'
      : ext === '.ogg' ? 'audio/ogg'
      : ext === '.webm' ? 'audio/webm'
      : 'audio/wav'

    const blob = new Blob([audioBuffer], { type: mimeType })
    const form = new FormData()
    form.append('file', blob, filename)
    form.append('name', 'emoreco-analysis')
    form.append('embeddings', 'true')

    console.log(`  → Submitting audio to Behavioral Signals: ${filename} (${fileSize} bytes, ${mimeType})`)
    const submitRes = await fetch(
      `https://api.behavioralsignals.com/v5/clients/${cid}/processes/audio`,
      {
        method: 'POST',
        headers: { 'X-Auth-Token': token, 'accept': 'application/json' },
        body: form
      }
    )

    if (!submitRes.ok) {
      const errText = await submitRes.text()
      throw new Error(`Behavioral Signals submit failed: ${submitRes.status} ${errText}`)
    }

    const submitData = await submitRes.json()
    const pid = submitData.pid

    if (!pid) {
      throw new Error('No process ID returned from Behavioral Signals')
    }

    console.log(`  → Submitted. Process ID: ${pid}. Polling for completion...`)

    const maxAttempts = 40
    const pollInterval = 4000
    let status = 0

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval))

      const pollRes = await fetch(
        `https://api.behavioralsignals.com/v5/clients/${cid}/processes/${pid}`,
        { headers: { 'X-Auth-Token': token, 'accept': 'application/json' } }
      )

      if (!pollRes.ok) {
        throw new Error(`Behavioral Signals poll failed: ${pollRes.status}`)
      }

      const pollData = await pollRes.json()
      status = pollData.status

      console.log(`  → Poll ${attempt + 1}: status ${status} (${pollData.statusmsg})`)

      if (status === 2) {
        break
      }
      if (status === -2) {
        throw new Error('Behavioral Signals: insufficient credits')
      }
      if (status === -1 || status === -3) {
        throw new Error(`Behavioral Signals: server error (status ${status})`)
      }
    }

    if (status !== 2) {
      throw new Error('Behavioral Signals: processing timed out')
    }

    console.log('  → Processing complete. Fetching results...')
    const resultsRes = await fetch(
      `https://api.behavioralsignals.com/v5/clients/${cid}/processes/${pid}/results`,
      { headers: { 'X-Auth-Token': token, 'accept': 'application/json' } }
    )

    if (!resultsRes.ok) {
      throw new Error(`Behavioral Signals results fetch failed: ${resultsRes.status}`)
    }

    const rawResults = await resultsRes.json()
    console.log('  → Behavioral Signals raw response type:', Array.isArray(rawResults) ? 'array' : typeof rawResults)
    if (!Array.isArray(rawResults)) {
      console.log('  → Behavioral Signals response keys:', Object.keys(rawResults))
    }
    return parseBehavioralResults(rawResults)

  } catch (err) {
    console.error('Behavioral Signals error:', err.message)
    return { summary: 'Unable to detect emotions from voice', asrTranscription: '' }
  }
}

function parseBehavioralResults(rawResults) {
  // Handle both raw array and wrapped response formats e.g. { data: [...] } or { results: [...] }
  let results = rawResults
  if (rawResults && !Array.isArray(rawResults)) {
    results = rawResults.data || rawResults.results || rawResults.predictions
      || rawResults.output || Object.values(rawResults).find(v => Array.isArray(v)) || []
    console.log('  → Unwrapped Behavioral Signals results, length:', results.length)
  }

  if (!results || !Array.isArray(results) || results.length === 0) {
    console.warn('  → parseBehavioralResults: no usable array found in response')
    return { summary: 'No behavioral data returned', asrTranscription: '' }
  }

  console.log(`  → Parsing ${results.length} result entries`)
  const tasksSeen = [...new Set(results.map(e => e.task))]
  console.log('  → Tasks in results:', tasksSeen)

  const emotionCounts = {}
  const positivityCounts = {}
  const strengthCounts = {}
  const engagementCounts = {}
  const speakingRateCounts = {}
  const genderCounts = {}
  const languageCounts = {}
  const ageCounts = {}
  const speakerCounts = {}
  const diarizationEmbeddings = {}
  let hesitationCount = 0
  let utteranceCount = 0
  const asrParts = []

  for (const entry of results) {
    if (entry.level !== 'utterance') continue
    const label = entry.finalLabel
    if (!label) continue

    switch (entry.task) {
      case 'asr':
        asrParts.push(label.trim())
        utteranceCount++
        break
      case 'emotion':
        emotionCounts[label] = (emotionCounts[label] || 0) + 1
        break
      case 'positivity':
        positivityCounts[label] = (positivityCounts[label] || 0) + 1
        break
      case 'strength':
        strengthCounts[label] = (strengthCounts[label] || 0) + 1
        break
      case 'engagement':
        engagementCounts[label] = (engagementCounts[label] || 0) + 1
        break
      case 'speaking_rate':
        speakingRateCounts[label] = (speakingRateCounts[label] || 0) + 1
        break
      case 'hesitation':
        if (label === 'yes') hesitationCount++
        break
      case 'gender':
        genderCounts[label] = (genderCounts[label] || 0) + 1
        break
      case 'language':
        languageCounts[label] = (languageCounts[label] || 0) + 1
        break
      case 'age':
        ageCounts[label] = (ageCounts[label] || 0) + 1
        break
      case 'diarization':
        speakerCounts[label] = (speakerCounts[label] || 0) + 1
        if (entry.embedding && Array.isArray(entry.embedding)) {
          if (!diarizationEmbeddings[label]) diarizationEmbeddings[label] = []
          diarizationEmbeddings[label].push(entry.embedding)
        }
        break
    }
  }

  const dominant = (counts) =>
    Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

  const dominantEmotion = dominant(emotionCounts)
  const dominantPositivity = dominant(positivityCounts)
  const dominantArousal = dominant(strengthCounts)
  const dominantEngagement = dominant(engagementCounts)
  const dominantSpeakingRate = dominant(speakingRateCounts)
  const detectedGender = dominant(genderCounts)
  const detectedLanguage = dominant(languageCounts)
  const hesitationDetected = hesitationCount > 0
  const asrTranscription = asrParts.join(' ').trim()
  const estimatedAge = dominant(ageCounts)
  const dominantSpeaker = dominant(speakerCounts)

  let speakerEmbedding = null
  const dominantSpeakerEmbeddings = dominantSpeaker && diarizationEmbeddings[dominantSpeaker]
  if (dominantSpeakerEmbeddings && dominantSpeakerEmbeddings.length > 0) {
    const len = dominantSpeakerEmbeddings[0].length
    const avg = new Array(len).fill(0)
    for (const emb of dominantSpeakerEmbeddings) {
      for (let i = 0; i < len; i++) avg[i] += emb[i]
    }
    speakerEmbedding = avg.map(v => v / dominantSpeakerEmbeddings.length)
    console.log(`  → Speaker embedding computed from ${dominantSpeakerEmbeddings.length} utterances (dim: ${len})`)
  }

  const summary = [
    dominantEmotion ? `Dominant emotion: ${dominantEmotion}` : null,
    dominantPositivity ? `Emotional positivity: ${dominantPositivity}` : null,
    dominantArousal ? `Arousal/energy level: ${dominantArousal}` : null,
    dominantEngagement ? `Engagement level: ${dominantEngagement}` : null,
    dominantSpeakingRate ? `Speaking rate: ${dominantSpeakingRate}` : null,
    hesitationDetected ? 'Hesitation detected in speech' : 'No hesitation detected'
  ].filter(Boolean).join(', ')

  return {
    dominantEmotion,
    dominantPositivity,
    dominantArousal,
    dominantEngagement,
    dominantSpeakingRate,
    hesitationDetected,
    asrTranscription,
    detectedGender,
    detectedLanguage,
    estimatedAge,
    dominantSpeaker,
    speakerEmbedding,
    summary
  }
}

async function generatePrimaryEmotion(deepgramTranscript, behavioral, spaceHistory) {
  const bsTranscript = behavioral.asrTranscription
    ? `\nBehavioral Signals Transcription (cross-reference): "${behavioral.asrTranscription}"`
    : ''

  const prompt = `You are an expert emotion analyst. Based on the voice analysis and transcription data, provide a 2-3 sentence summary of the PRIMARY EMOTION the person was feeling while speaking.

Deepgram Transcription: "${deepgramTranscript}"${bsTranscript}

Voice Behavioral Analysis:
- Dominant Emotion: ${behavioral.dominantEmotion || 'unknown'}
- Sentiment: ${behavioral.dominantPositivity || 'unknown'}
- Vocal Strength / Arousal: ${behavioral.dominantArousal || 'unknown'}
- Speaking Rate: ${behavioral.dominantSpeakingRate || 'unknown'}
- Hesitation Detected: ${behavioral.hesitationDetected ? 'Yes' : 'No'}
- Speaker Gender: ${behavioral.detectedGender || 'unknown'}
- Estimated Age Range: ${behavioral.estimatedAge || 'unknown'}
- Detected Language: ${behavioral.detectedLanguage || 'unknown'}

${spaceHistory.length > 0 ? `Previous analyses of this person:\n${spaceHistory.map((h, i) => `${i + 1}. ${h.primary_emotion}`).join('\n')}` : ''}

Instructions:
- Write ONLY 2-3 sentences
- Focus on what emotion the person was FEELING while speaking
- Use the voice behavioral data as primary evidence
- Be specific and clear
- DO NOT use percentages or confidence scores
- DO NOT mention "transcription" or "voice data"
- Write in a natural, human way

Primary Emotion:`

  try {
    const groq = getGroqClient()
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'qwen/qwen3-32b',
      temperature: 0.7,
      max_tokens: 200
    })
    return completion.choices[0].message.content.trim()
  } catch (err) {
    console.error('Groq error (primary):', err)
    return 'The speaker appears to be in a neutral emotional state based on the voice analysis.'
  }
}

async function generateDetailedAnalysis(deepgramTranscript, behavioral, primaryEmotion, spaceHistory) {
  const bsTranscript = behavioral.asrTranscription
    ? `\nBehavioral Signals Transcription (cross-reference): "${behavioral.asrTranscription}"`
    : ''

  const prompt = `You are an expert psychologist and emotion analyst. Provide a detailed analysis of what the person said and meant.

Deepgram Transcription: "${deepgramTranscript}"${bsTranscript}

Voice Behavioral Analysis:
- Dominant Emotion: ${behavioral.dominantEmotion || 'unknown'}
- Sentiment: ${behavioral.dominantPositivity || 'unknown'}
- Vocal Strength / Arousal: ${behavioral.dominantArousal || 'unknown'}
- Speaking Rate: ${behavioral.dominantSpeakingRate || 'unknown'}
- Hesitation in speech: ${behavioral.hesitationDetected ? 'Yes' : 'No'}
- Speaker Gender: ${behavioral.detectedGender || 'unknown'}
- Estimated Age Range: ${behavioral.estimatedAge || 'unknown'}
- Detected Language: ${behavioral.detectedLanguage || 'unknown'}

Primary Emotion: ${primaryEmotion}

${spaceHistory.length > 0 ? `\nPrevious personality insights about this person:\n${spaceHistory.slice(0, 2).map((h, i) => `${i + 1}. ${h.detailed_analysis.substring(0, 200)}`).join('\n')}` : ''}

Instructions:
Write a SINGLE PARAGRAPH analysis that covers:
1. What the person actually said (verbatim summary)
2. What emotions they were feeling while saying it — grounded in the voice behavioral data
3. What each line/statement really means — the deeper meaning behind their words
4. What they truly want to express or communicate
5. Notable vocal patterns (hesitation, energy, engagement) and what they reveal

${spaceHistory.length > 0 ? 'Use the previous analyses to provide deeper personality insights and patterns.' : ''}

Write naturally in paragraph form. DO NOT use bullet points or sections. DO NOT use percentages.

Detailed Analysis:`

  try {
    const groq = getGroqClient()
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'qwen/qwen3-32b',
      temperature: 0.8,
      max_tokens: 800
    })
    return completion.choices[0].message.content.trim()
  } catch (err) {
    console.error('Groq error (detailed):', err)
    return `The speaker said: "${deepgramTranscript}". Based on the voice analysis showing ${behavioral.summary}, they appear to be expressing their thoughts in a straightforward manner.`
  }
}

export const chatWithAI = async (req, res) => {
  try {
    const { id } = req.params
    const { message } = req.body

    const analysis = await getOne(
      'SELECT * FROM analyses WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    )

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' })
    }

    const chatHistory = analysis.chat_history ? JSON.parse(analysis.chat_history) : []

    const beh = analysis.hume_emotions
      ? (typeof analysis.hume_emotions === 'string' ? JSON.parse(analysis.hume_emotions) : analysis.hume_emotions)
      : {}
    const voiceProfile = [
      beh.dominantEmotion    ? `Emotion: ${beh.dominantEmotion}` : null,
      beh.dominantPositivity ? `Sentiment: ${beh.dominantPositivity}` : null,
      beh.dominantArousal    ? `Vocal Strength: ${beh.dominantArousal}` : null,
      beh.dominantSpeakingRate ? `Speaking Rate: ${beh.dominantSpeakingRate}` : null,
      beh.hesitationDetected !== undefined ? `Hesitation: ${beh.hesitationDetected ? 'Yes' : 'No'}` : null,
      beh.detectedGender     ? `Gender: ${beh.detectedGender}` : null,
      beh.estimatedAge       ? `Age Range: ${beh.estimatedAge}` : null,
      beh.detectedLanguage   ? `Language: ${beh.detectedLanguage}` : null,
      beh.dominantSpeaker    ? `Speaker: ${beh.dominantSpeaker}` : null,
    ].filter(Boolean).join('\n')

    const contextPrompt = `You are an expert emotion analyst. The user is asking about this emotion analysis:

Transcription: "${analysis.transcription}"
Primary Emotion: ${analysis.primary_emotion}
Detailed Analysis: ${analysis.detailed_analysis}
${voiceProfile ? `\nVoice Profile:\n${voiceProfile}` : ''}

Previous conversation:
${chatHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

User question: ${message}

Provide a helpful, insightful answer based on the analysis and voice profile data.`

    const groq = getGroqClient()
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: contextPrompt }],
      model: 'qwen/qwen3-32b',
      temperature: 0.7,
      max_tokens: 500
    })

    const aiResponse = completion.choices[0].message.content.trim()

    chatHistory.push({ role: 'user', content: message })
    chatHistory.push({ role: 'assistant', content: aiResponse })

    await run(
      'UPDATE analyses SET chat_history = ? WHERE id = ?',
      [JSON.stringify(chatHistory), id]
    )

    res.json({ response: aiResponse })

  } catch (err) {
    console.error('Chat error:', err)
    res.status(500).json({ error: 'Chat failed' })
  }
}

export const generatePDF = async (req, res) => {
  try {
    const { id } = req.params

    const analysis = await getOne(`
      SELECT a.*, s.name as space_name
      FROM analyses a
      LEFT JOIN spaces s ON a.space_id = s.id
      WHERE a.id = ? AND a.user_id = ?
    `, [id, req.user.userId])

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' })
    }

    let beh = {}
    if (analysis.hume_emotions) {
      try {
        beh = typeof analysis.hume_emotions === 'string'
          ? JSON.parse(analysis.hume_emotions)
          : analysis.hume_emotions
      } catch {}
    }

    const stripAI = (text) => {
      if (!text) return ''
      return text
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
        .trim()
    }

    const safe = (text, maxLen) => {
      const s = stripAI(text || '')
      if (!s) return ''
      return s.length <= maxLen ? s : s.slice(0, maxLen) + '\n\n[See full analysis in app]'
    }

    const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'

    const LANG_MAP = {
      en:'English', hi:'Hindi', ta:'Tamil', te:'Telugu', mr:'Marathi',
      bn:'Bengali', gu:'Gujarati', kn:'Kannada', ml:'Malayalam', pa:'Punjabi',
      ur:'Urdu', fr:'French', de:'German', es:'Spanish', zh:'Chinese', ja:'Japanese',
    }

    const domEmotion    = beh.dominantEmotion?.toLowerCase()
    const domPositivity = beh.dominantPositivity?.toLowerCase()
    const domArousal    = beh.dominantArousal?.toLowerCase()
    const domRate       = beh.dominantSpeakingRate?.toLowerCase()
    const detLang       = beh.detectedLanguage?.toLowerCase() || analysis.language?.toLowerCase()
    const langLabel     = LANG_MAP[detLang] || (detLang ? detLang.toUpperCase() : '—')
    const arousalLabel  = domArousal === 'strong' ? 'Strong' : domArousal === 'neutral' ? 'Moderate' : domArousal === 'weak' ? 'Weak' : '—'

    const metrics = [
      { label: 'Dominant Emotion', value: cap(domEmotion) },
      { label: 'Sentiment',        value: cap(domPositivity) },
      { label: 'Vocal Strength',   value: arousalLabel },
      { label: 'Speaking Rate',    value: cap(domRate) },
      { label: 'Hesitation',       value: beh.hesitationDetected !== undefined ? (beh.hesitationDetected ? 'Detected' : 'None') : '—' },
      { label: 'Language',         value: langLabel },
      { label: 'Gender',           value: cap(beh.detectedGender) },
      { label: 'Age Range',        value: beh.estimatedAge || '—' },
      { label: 'Speaker ID',       value: beh.dominantSpeaker || '—' },
    ]

    // Font paths
    const __dir = path.dirname(fileURLToPath(import.meta.url))
    const FONT_REG  = path.join(__dir, '../fonts/NotoSans-Regular.ttf')
    const FONT_BOLD = path.join(__dir, '../fonts/NotoSans-Bold.ttf')
    const hasNoto   = fs.existsSync(FONT_REG) && fs.existsSync(FONT_BOLD)

    const PAGE_W    = 612
    const PAGE_H    = 792
    const MARGIN    = 48
    const CONTENT_W = PAGE_W - MARGIN * 2

    // Colors — clean light theme
    const C_BRAND   = '#1d4ed8'   // blue
    const C_HEADING = '#111827'   // near-black
    const C_BODY    = '#374151'   // dark gray
    const C_LABEL   = '#6b7280'   // medium gray
    const C_RULE    = '#e5e7eb'   // light rule
    const C_ACCENT  = '#dbeafe'   // light blue bg for section header

    const doc = new PDFDocument({ margin: MARGIN, size: 'letter', autoFirstPage: true })

    if (hasNoto) {
      doc.registerFont('Regular', FONT_REG)
      doc.registerFont('Bold',    FONT_BOLD)
    } else {
      doc.registerFont('Regular', 'Helvetica')
      doc.registerFont('Bold',    'Helvetica-Bold')
    }

    const chunks = []
    doc.on('data', chunk => chunks.push(chunk))
    doc.on('end', () => {
      const buf = Buffer.concat(chunks)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename=emotion-analysis-${id}.pdf`)
      res.end(buf)
    })
    doc.on('error', err => {
      console.error('PDF error:', err)
      if (!res.headersSent) res.status(500).json({ error: 'PDF generation failed' })
    })

    // ── TOP ACCENT BAR ────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 5).fill(C_BRAND)

    // ── HEADER ────────────────────────────────────────────────────
    const TOP = 24
    doc.font('Bold').fontSize(26).fillColor(C_BRAND)
      .text('EMORECO', MARGIN, TOP, { lineBreak: false })

    // Report number — right-aligned
    doc.font('Regular').fontSize(9).fillColor(C_LABEL)
      .text(`Report #${id}`, MARGIN, TOP + 6, { align: 'right', width: CONTENT_W, lineBreak: false })

    doc.font('Regular').fontSize(11).fillColor(C_HEADING)
      .text('Voice Emotion Analysis Report', MARGIN, TOP + 34, { lineBreak: false })

    const dateStr = new Date(analysis.created_at).toLocaleString([], {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
    doc.font('Regular').fontSize(9).fillColor(C_LABEL)
      .text(`Generated: ${dateStr}${analysis.space_name ? '   ·   Space: ' + analysis.space_name : ''}`,
            MARGIN, TOP + 52, { lineBreak: false })

    // Header rule
    doc.rect(MARGIN, TOP + 70, CONTENT_W, 1).fill(C_RULE)

    doc.y = TOP + 84
    doc.x = MARGIN

    // ── VOICE ANALYSIS SECTION ────────────────────────────────────
    doc.font('Bold').fontSize(9).fillColor(C_BRAND)
      .text('VOICE ANALYSIS', MARGIN, doc.y, { characterSpacing: 1 })
    doc.y += 14
    doc.x = MARGIN

    // Grid — 3 columns, values bold, labels small gray
    const COLS   = 3
    const COL_W  = CONTENT_W / COLS
    const ROW_H  = 38
    const gridY  = doc.y

    metrics.forEach((m, i) => {
      const col = i % COLS
      const row = Math.floor(i / COLS)
      const x   = MARGIN + col * COL_W
      const y   = gridY + row * ROW_H

      // Label
      doc.font('Regular').fontSize(8).fillColor(C_LABEL)
        .text(m.label, x + 6, y, { width: COL_W - 10, lineBreak: false })
      // Value
      doc.font('Bold').fontSize(12).fillColor(C_HEADING)
        .text(m.value, x + 6, y + 11, { width: COL_W - 10, lineBreak: false })
    })

    const totalRows = Math.ceil(metrics.length / COLS)
    doc.y = gridY + totalRows * ROW_H + 8
    doc.x = MARGIN

    // Rule after grid
    doc.rect(MARGIN, doc.y, CONTENT_W, 1).fill(C_RULE)
    doc.y += 16
    doc.x = MARGIN

    // ── SECTION HELPER ────────────────────────────────────────────
    const drawSection = (title, body) => {
      if (!body || !body.trim()) return
      const bodyText = body.trim()

      // Estimate if we need a page break before the header
      if (doc.y + 60 > PAGE_H - MARGIN) {
        doc.addPage()
        doc.y = MARGIN + 10
        doc.x = MARGIN
      }

      // Section header row with light blue background
      const sy = doc.y
      doc.rect(MARGIN, sy, CONTENT_W, 22).fill(C_ACCENT)
      doc.rect(MARGIN, sy, 3, 22).fill(C_BRAND)
      doc.font('Bold').fontSize(8.5).fillColor(C_BRAND)
        .text(title, MARGIN + 10, sy + 7, { lineBreak: false })

      doc.y = sy + 30
      doc.x = MARGIN

      doc.font('Regular').fontSize(10).fillColor(C_BODY)
        .text(bodyText, MARGIN, doc.y, { align: 'justify', width: CONTENT_W, lineGap: 3 })

      doc.y += 18
      doc.x = MARGIN
    }

    // ── CONTENT SECTIONS ─────────────────────────────────────────
    const langNote = langLabel !== '—' ? `  ·  ${langLabel}` : ''
    drawSection(`TRANSCRIPTION${langNote}`, safe(analysis.transcription, 3000))
    drawSection('PRIMARY EMOTION', safe(analysis.primary_emotion, 3000))
    drawSection('DETAILED ANALYSIS', safe(analysis.detailed_analysis, 6000))

    // ── FOOTER ───────────────────────────────────────────────────
    doc.rect(MARGIN, doc.y, CONTENT_W, 1).fill(C_RULE)
    doc.font('Regular').fontSize(8).fillColor(C_LABEL)
      .text('Generated by EMORECO · Voice-Based AI Emotion Recognition · Confidential',
            MARGIN, doc.y + 6, { align: 'center', width: CONTENT_W, lineBreak: false })

    doc.end()

  } catch (err) {
    console.error('PDF generation error:', err)
    res.status(500).json({ error: 'PDF generation failed' })
  }
}
