import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@deepgram/sdk'
import Groq from 'groq-sdk'
import axios from 'axios'
import PDFDocument from 'pdfkit'
import { getOne, getAll, run } from '../config/database.js'

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

    console.log('Step 3: Getting space history...')
    let spaceHistory = []
    if (spaceId) {
      spaceHistory = await getAll(`
        SELECT transcription, primary_emotion, detailed_analysis
        FROM analyses
        WHERE space_id = ?
        ORDER BY created_at DESC
        LIMIT 5
      `, [spaceId])
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
      spaceId || null,
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
      detailedAnalysis
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
    form.append('embeddings', 'false')

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

    const results = await resultsRes.json()
    return parseBehavioralResults(results)

  } catch (err) {
    console.error('Behavioral Signals error:', err.message)
    return { summary: 'Unable to detect emotions from voice', asrTranscription: '' }
  }
}

function parseBehavioralResults(results) {
  if (!results || !Array.isArray(results) || results.length === 0) {
    return { summary: 'No behavioral data returned', asrTranscription: '' }
  }

  const emotionCounts = {}
  const positivityCounts = {}
  const strengthCounts = {}
  const engagementCounts = {}
  const speakingRateCounts = {}
  const genderCounts = {}
  const languageCounts = {}
  const ageCounts = {}
  const speakerCounts = {}
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
      model: 'llama-3.3-70b-versatile',
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
      model: 'llama-3.3-70b-versatile',
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

    const beh = analysis.hume_emotions || {}
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
      model: 'llama-3.3-70b-versatile',
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

    const doc = new PDFDocument({ margin: 50 })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=emotion-analysis-${id}.pdf`)

    doc.pipe(res)

    doc.fontSize(24).fillColor('#6C63FF').text('EMORECO', { align: 'center' })
    doc.fontSize(16).fillColor('#36D1DC').text('Emotion Analysis Report', { align: 'center' })
    doc.moveDown()

    doc.fontSize(10).fillColor('black').text(`Date: ${new Date(analysis.created_at).toLocaleString()}`)
    if (analysis.space_name) {
      doc.text(`Space: ${analysis.space_name}`)
    }
    doc.moveDown()

    doc.fontSize(14).fillColor('#6C63FF').text('Transcription:')
    doc.fontSize(11).fillColor('black').text(analysis.transcription, { align: 'justify' })
    doc.moveDown()

    doc.fontSize(14).fillColor('#6C63FF').text('Primary Emotion:')
    doc.fontSize(11).fillColor('black').text(analysis.primary_emotion, { align: 'justify' })
    doc.moveDown()

    doc.fontSize(14).fillColor('#6C63FF').text('Detailed Analysis:')
    doc.fontSize(11).fillColor('black').text(analysis.detailed_analysis, { align: 'justify' })
    doc.moveDown()

    doc.fontSize(8).fillColor('gray').text('Generated by EMORECO - Voice-Based AI Emotion Recognition', { align: 'center' })

    doc.end()

  } catch (err) {
    console.error('PDF generation error:', err)
    res.status(500).json({ error: 'PDF generation failed' })
  }
}
