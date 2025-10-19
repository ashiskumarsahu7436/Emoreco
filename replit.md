# EMORECO - Voice-Based AI Emotion Recognition

## Overview
EMORECO is a full-stack AI-powered emotion recognition platform that analyzes voice recordings to detect emotions, provide detailed psychological insights, and enable conversations about the analysis. The platform uses a multi-AI pipeline combining Deepgram (transcription), Hume AI (emotion detection), and Groq (analysis).

## Project Structure
```
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/    # Reusable components (Header, Footer)
│   │   ├── pages/         # Page components (Home, Dashboard, etc.)
│   │   └── main.jsx       # App entry point
│   └── package.json
├── server/                # Node.js backend (Express)
│   ├── config/           # Database configuration
│   ├── controllers/      # Business logic
│   ├── routes/           # API routes
│   ├── middleware/       # Auth middleware
│   └── index.js          # Server entry point
├── uploads/              # Audio file storage
└── package.json          # Root workspace config
```

## Features
### Core Features
- **User Authentication**: Secure signup/login with JWT
- **Live Microphone Recording**: Record voice in real-time
- **Audio File Upload**: Upload pre-recorded audio files
- **Multi-language Support**: Detects and transcribes Hindi, English, Tamil, Telugu, and more
- **Spaces System**: Organize analyses by person to track personality over time
- **History Management**: Last 50 general analyses, unlimited in spaces
- **AI Chat**: Ask questions about analysis results
- **PDF Export**: Download detailed analysis reports

### AI Pipeline
1. **Deepgram**: Transcribes audio with language detection
2. **Hume AI**: Analyzes voice for 17+ emotions (pitch, tone, prosody, speaking rate)
3. **Groq (Llama 3.1)**: Generates primary emotion summary and detailed analysis

## Technology Stack
### Frontend
- React 18 with Vite
- React Router for navigation
- Axios for API calls
- Modern CSS with gradients and animations

### Backend
- Node.js + Express
- SQLite database (better-sqlite3)
- JWT authentication
- Multer for file uploads
- PDFKit for report generation

### AI Services
- Deepgram SDK for speech-to-text
- Hume AI API for voice emotion detection
- Groq SDK for LLM-based analysis

## API Keys Required
To run this project, you need these API keys:
- `DEEPGRAM_API_KEY` - Speech-to-text transcription
- `HUME_API_KEY` - Voice emotion detection
- `GROQ_API_KEY` - AI analysis generation

Add these to `server/.env` file.

## Database Schema
- **users**: User accounts
- **spaces**: Personalized analysis spaces
- **analyses**: Voice analysis records with transcription, emotions, and AI insights

## Deployment
- **Frontend**: Vite build on port 5000
- **Backend**: Express server on port 3000
- **Compatible with**: Replit, Render, Railway, Vercel

## Current State
- Full-stack application with React frontend and Node.js backend
- Database initialized with SQLite
- Ready for AI API key integration
- Workflow configured for concurrent frontend/backend development

## Recent Changes
- **2025-10-19**: Imported to Replit and successfully configured
  - Fixed Vite build dependencies (moved to dependencies from devDependencies)
  - Generated secure JWT_SECRET for authentication
  - Set up development environment with .env file
  - Configured workflow to run both frontend (port 5000) and backend (port 3000)
  - Application is running successfully on Replit
  - Ready for API key integration (DEEPGRAM_API_KEY, HUME_API_KEY, GROQ_API_KEY)

## Known Issues & Notes
- Render deployment requires vite in dependencies (not devDependencies) - Already fixed
- API keys need to be added to server/.env for full functionality
- Frontend is accessible on port 5000, backend API on port 3000
