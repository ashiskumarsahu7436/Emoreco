import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import db from '../config/database.js'

const router = express.Router()

router.get('/', authenticateToken, (req, res) => {
  try {
    const spaces = db.prepare(`
      SELECT s.*, COUNT(a.id) as analysis_count
      FROM spaces s
      LEFT JOIN analyses a ON s.id = a.space_id
      WHERE s.user_id = ?
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `).all(req.user.userId)

    res.json(spaces)
  } catch (err) {
    console.error('Get spaces error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, personName } = req.body

    if (!name || !personName) {
      return res.status(400).json({ error: 'Space name and person name required' })
    }

    const result = db.prepare(
      'INSERT INTO spaces (user_id, name, person_name) VALUES (?, ?, ?)'
    ).run(req.user.userId, name, personName)

    res.json({
      id: result.lastInsertRowid,
      name,
      person_name: personName,
      user_id: req.user.userId
    })
  } catch (err) {
    console.error('Create space error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const space = db.prepare('SELECT * FROM spaces WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.userId)

    if (!space) {
      return res.status(404).json({ error: 'Space not found' })
    }

    db.prepare('DELETE FROM spaces WHERE id = ?').run(req.params.id)
    res.json({ message: 'Space deleted' })
  } catch (err) {
    console.error('Delete space error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
