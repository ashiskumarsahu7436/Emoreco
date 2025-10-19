import express from 'express'
import multer from 'multer'
import { authenticateToken } from '../middleware/auth.js'
import { analyzeAudio, chatWithAI, generatePDF } from '../controllers/analysisController.js'
import db from '../config/database.js'

const router = express.Router()

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }
})

router.post('/', authenticateToken, upload.single('audio'), analyzeAudio)

router.get('/', authenticateToken, (req, res) => {
  try {
    const { spaceId, limit = 50 } = req.query

    let query = `
      SELECT a.*, s.name as space_name
      FROM analyses a
      LEFT JOIN spaces s ON a.space_id = s.id
      WHERE a.user_id = ?
    `
    
    const params = [req.user.userId]

    if (spaceId) {
      query += ' AND a.space_id = ?'
      params.push(spaceId)
    }

    query += ' ORDER BY a.created_at DESC'
    
    if (!spaceId) {
      query += ' LIMIT ?'
      params.push(parseInt(limit))
    }

    const analyses = db.prepare(query).all(...params)

    const result = analyses.map(a => ({
      ...a,
      hume_emotions: a.hume_emotions ? JSON.parse(a.hume_emotions) : null,
      chat_history: a.chat_history ? JSON.parse(a.chat_history) : []
    }))

    res.json(result)
  } catch (err) {
    console.error('Get analyses error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/:id', authenticateToken, (req, res) => {
  try {
    const analysis = db.prepare(`
      SELECT a.*, s.name as space_name
      FROM analyses a
      LEFT JOIN spaces s ON a.space_id = s.id
      WHERE a.id = ? AND a.user_id = ?
    `).get(req.params.id, req.user.userId)

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' })
    }

    res.json({
      ...analysis,
      hume_emotions: analysis.hume_emotions ? JSON.parse(analysis.hume_emotions) : null,
      chat_history: analysis.chat_history ? JSON.parse(analysis.chat_history) : []
    })
  } catch (err) {
    console.error('Get analysis error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/:id/chat', authenticateToken, chatWithAI)

router.get('/:id/pdf', authenticateToken, generatePDF)

export default router
