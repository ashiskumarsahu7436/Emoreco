import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { getOne, getAll, run } from '../config/database.js'

const router = express.Router()

router.get('/', authenticateToken, async (req, res) => {
  try {
    const profiles = await getAll(`
      SELECT sp.*, s.name as space_name
      FROM speaker_profiles sp
      LEFT JOIN spaces s ON sp.space_id = s.id
      WHERE sp.user_id = ?
      ORDER BY sp.created_at DESC
    `, [req.user.userId])

    res.json(profiles.map(p => ({ ...p, embedding: undefined })))
  } catch (err) {
    console.error('Get speaker profiles error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { displayName, spaceId, analysisId } = req.body

    if (!displayName) {
      return res.status(400).json({ error: 'Display name is required' })
    }

    let embedding = null
    if (analysisId) {
      const analysis = await getOne(
        'SELECT hume_emotions FROM analyses WHERE id = ? AND user_id = ?',
        [analysisId, req.user.userId]
      )
      if (analysis?.hume_emotions) {
        const beh = typeof analysis.hume_emotions === 'string'
          ? JSON.parse(analysis.hume_emotions)
          : analysis.hume_emotions
        if (beh.speakerEmbedding) {
          embedding = JSON.stringify(beh.speakerEmbedding)
        }
      }
    }

    const result = await run(
      'INSERT INTO speaker_profiles (user_id, display_name, space_id, embedding) VALUES (?, ?, ?, ?)',
      [req.user.userId, displayName, spaceId || null, embedding]
    )

    res.json({
      id: result.lastInsertRowid,
      display_name: displayName,
      space_id: spaceId || null,
      has_embedding: !!embedding
    })
  } catch (err) {
    console.error('Create speaker profile error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { displayName, spaceId } = req.body
    const profile = await getOne(
      'SELECT * FROM speaker_profiles WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    )
    if (!profile) return res.status(404).json({ error: 'Profile not found' })

    await run(
      'UPDATE speaker_profiles SET display_name = ?, space_id = ? WHERE id = ?',
      [displayName ?? profile.display_name, spaceId !== undefined ? spaceId : profile.space_id, req.params.id]
    )

    res.json({ success: true })
  } catch (err) {
    console.error('Update speaker profile error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const profile = await getOne(
      'SELECT * FROM speaker_profiles WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    )
    if (!profile) return res.status(404).json({ error: 'Profile not found' })

    await run('DELETE FROM speaker_profiles WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    console.error('Delete speaker profile error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
