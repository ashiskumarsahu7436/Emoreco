import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import spacesRoutes from './routes/spaces.js'
import analysesRoutes from './routes/analyses.js'
import './config/database.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/spaces', spacesRoutes)
app.use('/api/analyses', analysesRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'EMORECO API is running' })
})

app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://localhost:${PORT}`)
  console.log(`📊 Database initialized`)
  console.log(`🚀 API ready at http://localhost:${PORT}/api`)
})
