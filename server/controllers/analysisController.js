import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@deepgram/sdk'
import Groq from 'groq-sdk'
import axios from 'axios'
import PDFDocument from 'pdfkit'
import db from '../config/database.js'

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
    const { spaceId } = req.body

    console.log('Step 1: Transcribing audio with Deepgram...')
    const transcription = await transcribeAudio(audioPath)
    
    if (!transcription) {
      return res.status(500).json({ error: 'Transcription failed' })
    }

    console.log('Step 2: Analyzing emotions with Hume AI...')
    const emotions = await analyzeEmotions(audioPath)

    console.log('Step 3: Getting space history...')
    let spaceHistory = []
    if (spaceId) {
      const previousAnalyses = db.prepare(`
        SELECT transcription, primary_emotion, detailed_analysis
        FROM analyses
        WHERE space_id = ?
        ORDER BY created_at DESC
        LIMIT 5
      `).all(spaceId)
      spaceHistory = previousAnalyses
    }

    console.log('Step 4: Generating Primary Emotion analysis...')
    const primaryEmotion = await generatePrimaryEmotion(
      transcription.text,
      emotions,
      spaceHistory
    )

    console.log('Step 5: Generating Detailed Analysis...')
    const detailedAnalysis = await generateDetailedAnalysis(
      transcription.text,
      emotions,
      primaryEmotion,
      spaceHistory
    )

    const result = db.prepare(`
      INSERT INTO analyses (
        user_id, space_id, audio_path, transcription, language,
        hume_emotions, primary_emotion, detailed_analysis
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.userId,
      spaceId || null,
      audioPath,
      transcription.text,
      transcription.language || 'en',
      JSON.stringify(emotions),
      primaryEmotion,
      detailedAnalysis
    )

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

    return {
      text: transcript,
      language
    }
  } catch (err) {
    console.error('Deepgram error:', err)
    throw new Error('Transcription failed: ' + err.message)
  }
}

async function analyzeEmotions(audioPath) {
  try {
    const audioBuffer = fs.readFileSync(audioPath)
    const base64Audio = audioBuffer.toString('base64')

    const response = await axios.post(
      'https://api.hume.ai/v0/batch/jobs',
      {
        models: {
          prosody: {}
        },
        files: [
          {
            filename: 'audio.wav',
            content_type: 'audio/wav',
            data: base64Audio
          }
        ]
      },
      {
        headers: {
          'X-Hume-Api-Key': process.env.HUME_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    )

    const jobId = response.data.job_id

    await new Promise(resolve => setTimeout(resolve, 5000))

    const resultResponse = await axios.get(
      `https://api.hume.ai/v0/batch/jobs/${jobId}/predictions`,
      {
        headers: {
          'X-Hume-Api-Key': process.env.HUME_API_KEY
        }
      }
    )

    const predictions = resultResponse.data[0]?.results?.predictions?.[0]?.models?.prosody?.grouped_predictions
    
    if (!predictions || predictions.length === 0) {
      return { summary: 'Neutral emotional state' }
    }

    const topEmotions = predictions[0].predictions
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    return {
      topEmotions,
      summary: topEmotions.map(e => e.name).join(', ')
    }

  } catch (err) {
    console.error('Hume AI error:', err.response?.data || err.message)
    return { summary: 'Unable to detect emotions, using text analysis' }
  }
}

async function generatePrimaryEmotion(transcription, emotions, spaceHistory) {
  const prompt = `You are an expert emotion analyst. Based on the voice analysis and transcription, provide a 2-3 sentence summary of the PRIMARY EMOTION the person was feeling while speaking.

Transcription: "${transcription}"

Voice Emotion Data: ${emotions.summary}

${spaceHistory.length > 0 ? `Previous analyses of this person:\n${spaceHistory.map((h, i) => `${i + 1}. ${h.primary_emotion}`).join('\n')}` : ''}

Instructions:
- Write ONLY 2-3 sentences
- Focus on what emotion the person was FEELING while speaking
- Be specific and clear
- DO NOT use percentages or confidence scores
- DO NOT mention "transcription" or "voice data"
- Write in a natural, human way

Primary Emotion:`

  try {
    const groq = getGroqClient()
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-70b-versatile',
      temperature: 0.7,
      max_tokens: 200
    })

    return completion.choices[0].message.content.trim()
  } catch (err) {
    console.error('Groq error (primary):', err)
    return 'The speaker appears to be in a neutral emotional state based on the voice analysis.'
  }
}

async function generateDetailedAnalysis(transcription, emotions, primaryEmotion, spaceHistory) {
  const prompt = `You are an expert psychologist and emotion analyst. Provide a detailed analysis of what the person said and meant.

Transcription: "${transcription}"

Voice Emotions Detected: ${emotions.summary}

Primary Emotion: ${primaryEmotion}

${spaceHistory.length > 0 ? `\nPrevious personality insights about this person:\n${spaceHistory.slice(0, 2).map((h, i) => `${i + 1}. ${h.detailed_analysis.substring(0, 200)}`).join('\n')}` : ''}

Instructions:
Write a SINGLE PARAGRAPH analysis that covers:
1. What the person actually said (verbatim summary)
2. What emotions they were feeling while saying it
3. What each line/statement really means - the deeper meaning behind their words
4. What they truly want to express or communicate

${spaceHistory.length > 0 ? 'Use the previous analyses to provide deeper personality insights and patterns.' : ''}

Write naturally in paragraph form. DO NOT use bullet points or sections. DO NOT use percentages.

Detailed Analysis:`

  try {
    const groq = getGroqClient()
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-70b-versatile',
      temperature: 0.8,
      max_tokens: 800
    })

    return completion.choices[0].message.content.trim()
  } catch (err) {
    console.error('Groq error (detailed):', err)
    return `The speaker said: "${transcription}". Based on the voice analysis showing ${emotions.summary}, they appear to be expressing their thoughts in a straightforward manner.`
  }
}

export const chatWithAI = async (req, res) => {
  try {
    const { id } = req.params
    const { message } = req.body

    const analysis = db.prepare(`
      SELECT * FROM analyses WHERE id = ? AND user_id = ?
    `).get(id, req.user.userId)

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' })
    }

    const chatHistory = analysis.chat_history ? JSON.parse(analysis.chat_history) : []

    const contextPrompt = `You are an expert emotion analyst. The user is asking about this emotion analysis:

Transcription: "${analysis.transcription}"
Primary Emotion: ${analysis.primary_emotion}
Detailed Analysis: ${analysis.detailed_analysis}

Previous conversation:
${chatHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

User question: ${message}

Provide a helpful, insightful answer based on the analysis.`

    const groq = getGroqClient()
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: contextPrompt }],
      model: 'llama-3.1-70b-versatile',
      temperature: 0.7,
      max_tokens: 500
    })

    const aiResponse = completion.choices[0].message.content.trim()

    chatHistory.push({ role: 'user', content: message })
    chatHistory.push({ role: 'assistant', content: aiResponse })

    db.prepare('UPDATE analyses SET chat_history = ? WHERE id = ?')
      .run(JSON.stringify(chatHistory), id)

    res.json({ response: aiResponse })

  } catch (err) {
    console.error('Chat error:', err)
    res.status(500).json({ error: 'Chat failed' })
  }
}

export const generatePDF = async (req, res) => {
  try {
    const { id } = req.params

    const analysis = db.prepare(`
      SELECT a.*, s.name as space_name
      FROM analyses a
      LEFT JOIN spaces s ON a.space_id = s.id
      WHERE a.id = ? AND a.user_id = ?
    `).get(id, req.user.userId)

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

    doc.fontSize(8).fillColor('gray').text('Generated by EMORECO - Voice-Based AI Emotion Recognition', {
      align: 'center'
    })

    doc.end()

  } catch (err) {
    console.error('PDF generation error:', err)
    res.status(500).json({ error: 'PDF generation failed' })
  }
}
