import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from '../config/database.js'

const router = express.Router()

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const result = db.prepare(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)'
    ).run(name, email, hashedPassword)

    const token = jwt.sign(
      { userId: result.lastInsertRowid, email },
      process.env.JWT_SECRET || 'default-secret-key',
      { expiresIn: '30d' }
    )

    res.json({
      token,
      user: {
        id: result.lastInsertRowid,
        name,
        email
      }
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

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'default-secret-key',
      { expiresIn: '30d' }
    )

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
