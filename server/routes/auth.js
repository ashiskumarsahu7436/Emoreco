import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getOne, run } from '../config/database.js'

const router = express.Router()

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    const existingUser = await getOne('SELECT * FROM users WHERE email = ?', [email])
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await run(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    )

    const token = jwt.sign(
      { userId: result.lastInsertRowid, email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    res.json({
      token,
      user: { id: result.lastInsertRowid, name, email }
    })
  } catch (err) {
    console.error('Signup error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    const user = await getOne('SELECT * FROM users WHERE email = ?', [email])
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/change-password', async (req, res) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Access token required' })

    let payload
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET)
    } catch {
      return res.status(403).json({ error: 'Invalid or expired token' })
    }

    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new password are required' })
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' })
    }

    const user = await getOne('SELECT * FROM users WHERE id = ?', [payload.userId])
    if (!user) return res.status(404).json({ error: 'User not found' })

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' })

    const hashed = await bcrypt.hash(newPassword, 10)
    await run('UPDATE users SET password = ? WHERE id = ?', [hashed, payload.userId])

    res.json({ message: 'Password updated successfully' })
  } catch (err) {
    console.error('Change password error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
