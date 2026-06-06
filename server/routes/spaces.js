import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { getOne, getAll, run } from '../config/database.js'

const router = express.Router()

router.get('/', authenticateToken, async (req, res) => {
  try {
    const spaces = await getAll(`
      SELECT s.*, COUNT(a.id) as analysis_count
      FROM spaces s
      LEFT JOIN analyses a ON s.id = a.space_id
      WHERE s.user_id = ?
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `, [req.user.userId])

    res.json(spaces)
  } catch (err) {
    console.error('Get spaces error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, personName } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Space name is required' })
    }

    const result = await run(
      'INSERT INTO spaces (user_id, name, person_name) VALUES (?, ?, ?)',
      [req.user.userId, name, personName || '']
    )

    res.json({
      id: result.lastInsertRowid,
      name,
      person_name: personName || '',
      user_id: req.user.userId
    })
  } catch (err) {
    console.error('Create space error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const space = await getOne(
      'SELECT * FROM spaces WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    )

    if (!space) {
      return res.status(404).json({ error: 'Space not found' })
    }

    await run('DELETE FROM spaces WHERE id = ?', [req.params.id])
    res.json({ message: 'Space deleted' })
  } catch (err) {
    console.error('Delete space error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
