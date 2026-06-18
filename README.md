# EMORECO — Voice-Based AI Emotion Recognition Platform

EMORECO is a full-stack web application that records or accepts uploaded audio, transcribes it, detects emotions from vocal acoustics using AI, and returns a detailed psychological analysis. Every analysis is stored in a PostgreSQL database and can be revisited, chatted with, or exported as a PDF.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [How It Works — End-to-End Flow](#how-it-works--end-to-end-flow)
3. [Project Architecture](#project-architecture)
4. [Complete File Structure](#complete-file-structure)
5. [Backend Files — What Each File Does](#backend-files--what-each-file-does)
6. [Frontend Files — What Each File Does](#frontend-files--what-each-file-does)
7. [Database Schema](#database-schema)
8. [Environment Variables](#environment-variables)
9. [Running Locally](#running-locally)
10. [Deployment](#deployment)

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js + Express | Express ^4.18 | REST API server, port 3000 |
| PostgreSQL (`pg`) | ^8.11 | Primary database (Supabase in prod, Replit PG in dev) |
| Deepgram SDK | ^3.4 | Speech-to-text transcription (`nova-2` model, multi-language auto-detect) |
| Behavioral Signals API | v5 | Vocal emotion detection — dominant emotion, positivity, arousal, engagement, speaking rate, hesitation, speaker gender, estimated age, language |
| Groq SDK (`llama-3.3-70b-versatile`) | ^0.3 | LLM for AI-generated primary emotion summary and detailed psychological analysis; also powers per-analysis AI chat |
| PDFKit | ^0.14 | Server-side PDF report generation streamed directly to the browser |
| Multer | ^1.4 | Multipart audio file upload handling |
| bcryptjs | ^2.4 | Password hashing (salt rounds = 10) |
| jsonwebtoken | ^9.0 | JWT-based auth (30-day tokens) |
| dotenv | ^16.3 | Environment variable loading |
| axios | ^1.6 | HTTP client used inside the analysis controller |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | ^18.2 | UI framework |
| Vite | ^5.0 | Dev server (port 5000) + production bundler |
| React Router DOM | ^6.21 | Client-side routing (9 routes) |
| Axios | ^1.6 | API calls to the backend |
| lucide-react | ^1.17 | Icon library used throughout the Analysis page |
| Web Audio API (browser-native) | — | Real-time waveform visualizer and volume/clarity meters on the recording page |
| MediaRecorder API (browser-native) | — | In-browser audio capture |
| Canvas API (browser-native) | — | Animated frequency bar chart drawn on `<canvas>` during recording |

---

## How It Works — End-to-End Flow

```
User speaks / uploads audio
        │
        ▼
Browser (MediaRecorder API) or file picker
        │
        ▼
POST /api/analyses  (multipart/form-data with sourceType field)
        │
        ▼
Multer saves temp file → server/uploads/
        │
        ├──────────────────────────────────────────┐
        │                                          │
        ▼                                          ▼
Deepgram nova-2 (Step 1)          Behavioral Signals v5 (Step 2)
Speech → text transcript          Audio → emotion JSON
Detects language automatically    3-step: submit → poll → fetch results
        │                                          │
        └───────────────────┬──────────────────────┘
                            │
              Both run in parallel via Promise.allSettled()
              (Behavioral Signals failure = soft degradation)
                            │
                            ▼
              Groq llama-3.3-70b-versatile (Steps 3 & 4)
              → Primary Emotion (2-3 sentence summary)
              → Detailed Analysis (full psychological paragraph)
              (Space history injected into prompts for context)
                            │
                            ▼
              INSERT into PostgreSQL analyses table
              Temp audio file deleted from disk
                            │
                            ▼
              Return { analysisId } → browser navigates
              to /analysis/:id
                            │
                            ▼
              Analysis page fetches full record and renders:
              Transcription → Voice Profile → Speaker Profile
              → Primary Emotion → Detailed Analysis
                            │
                  ┌─────────┴──────────┐
                  ▼                    ▼
        Chat with AI (Groq)     Export PDF (PDFKit)
        Messages persisted to   Streamed directly to
        chat_history column     browser as file download
```

---

## Project Architecture

```
EMORECO
├── server/          Node.js + Express backend (port 3000)
│   ├── index.js     Entry point — middleware, routes, DB init
│   ├── config/      Database connection + schema setup
│   ├── routes/      Express routers (auth, spaces, analyses)
│   ├── controllers/ Business logic (analyze, chat, PDF)
│   ├── middleware/  JWT auth guard
│   └── uploads/     Temp audio files (auto-deleted after analysis)
│
└── client/          React + Vite frontend (port 5000)
    ├── index.html   Vite HTML shell
    ├── vite.config.js  Dev server config + /api proxy
    └── src/
        ├── main.jsx     React mount point
        ├── App.jsx      Router + page mapping
        ├── components/  Header, Footer (shared across all pages)
        └── pages/       One JSX + CSS file per route
```

**How frontend talks to backend:** Vite's dev server proxies every `/api/*` request to `http://localhost:3000` during development. In production on Render, Express serves the built `client/dist` folder directly and handles API routes on the same origin — no CORS issues in prod.

---

## Complete File Structure

```
/
├── README.md
├── RENDER_DEPLOYMENT_GUIDE.md
├── package.json                   Root (shared node_modules)
│
├── server/
│   ├── package.json               Server dependencies
│   ├── index.js                   Express app entry point
│   ├── .env.example               Template for required env vars
│   ├── uploads/                   Multer temp dir — audio lives here briefly
│   │
│   ├── config/
│   │   └── database.js            PostgreSQL pool, schema init, query helpers
│   │
│   ├── middleware/
│   │   └── auth.js                JWT verification middleware
│   │
│   ├── routes/
│   │   ├── auth.js                POST /api/auth/signup, POST /api/auth/login
│   │   ├── spaces.js              GET/POST/DELETE /api/spaces
│   │   └── analyses.js            GET/POST/DELETE /api/analyses + chat + PDF
│   │
│   └── controllers/
│       └── analysisController.js  Core analysis pipeline + chat + PDF export
│
└── client/
    ├── package.json               Frontend dependencies
    ├── vite.config.js             Vite config — port, proxy, aliases
    ├── index.html                 HTML shell loaded by Vite
    │
    └── src/
        ├── main.jsx               React DOM mount point
        ├── App.jsx                Router definition (all 9 routes)
        ├── App.css                Global base styles
        ├── index.css              CSS resets
        │
        ├── components/
        │   ├── Header.jsx         Top nav bar (on every page)
        │   ├── Header.css
        │   ├── Footer.jsx         Bottom footer
        │   └── Footer.css
        │
        └── pages/
            ├── Home.jsx           Landing / marketing page
            ├── Home.css
            ├── Login.jsx          Login form
            ├── Login.css
            ├── Signup.jsx         Signup form
            ├── Signup.css
            ├── Dashboard.jsx      Main hub — record, upload, recent activity
            ├── Dashboard.css
            ├── NewRecording.jsx   Dedicated recording page with waveform canvas
            ├── NewRecording.css
            ├── Spaces.jsx         Organize analyses into named spaces/projects
            ├── Spaces.css
            ├── History.jsx        Analysis history table with filters & pagination
            ├── History.css
            ├── Analysis.jsx       Single analysis detail + chat + PDF export
            ├── Analysis.css
            ├── Settings.jsx       User profile / preferences
            └── Settings.css
```

---

## Backend Files — What Each File Does

---

### `server/index.js` — Express Entry Point

| Lines | Responsibility |
|---|---|
| 1–9 | Imports: express, cors, dotenv, path, and all three route modules |
| 11–16 | Loads `.env`; crashes immediately if `JWT_SECRET` is missing (fail-fast guard) |
| 21–26 | Creates Express app; sets 50 MB body limits for JSON + urlencoded (needed for audio metadata) |
| 28–30 | Mounts three routers: `/api/auth`, `/api/spaces`, `/api/analyses` |
| 32–34 | `GET /api/health` — simple health check endpoint |
| 36–42 | Production mode only: serves `client/dist` as static files + SPA catch-all (`*` → `index.html`) |
| 44–47 | Global error handler — catches any unhandled error thrown in a route |
| 49–63 | `start()` async function: runs `initDb()` first, then starts listening on port 3000 |

---

### `server/config/database.js` — Database Layer

| Lines | Responsibility |
|---|---|
| 1–8 | Creates a PostgreSQL connection pool using `DATABASE_URL`; auto-disables SSL for localhost connections |
| 10–47 | `initDb()` — CREATE TABLE IF NOT EXISTS for `users`, `spaces`, `analyses`; creates three indexes |
| 49–52 | `query(text, params)` — raw pool query; converts `?` placeholder syntax to `$1, $2, …` (PostgreSQL positional params) |
| 54–57 | `getOne(text, params)` — query wrapper that returns the first row or `null` |
| 59–62 | `getAll(text, params)` — query wrapper that returns all rows as an array |
| 64–71 | `run(text, params)` — for INSERT/UPDATE/DELETE; auto-appends `RETURNING id` to INSERTs so callers get the new row's ID back |
| 73–76 | `toPositional(sql)` — private function: replaces each `?` with `$1`, `$2`, etc. using a closure counter |

> **Why `?` → `$N` conversion?** The codebase originally used SQLite (which uses `?`). This adapter lets all SQL strings remain unchanged while `pg` receives the positional syntax it requires.

---

### `server/middleware/auth.js` — JWT Guard

| Lines | Responsibility |
|---|---|
| 3–18 | `authenticateToken` middleware: extracts Bearer token from `Authorization` header → verifies against `JWT_SECRET` → attaches decoded payload as `req.user` (contains `userId` and `email`) → returns 401 if missing or 403 if invalid/expired |

Applied to every protected route as the second argument: `router.get('/', authenticateToken, handler)`.

---

### `server/routes/auth.js` — Authentication Routes

| Lines | Responsibility |
|---|---|
| 8–41 | `POST /api/auth/signup` — validates fields, checks for duplicate email, hashes password with bcrypt (10 salt rounds), inserts new user row, returns JWT + user object |
| 43–75 | `POST /api/auth/login` — looks up user by email, compares bcrypt hash, returns JWT + user object on success |

JWT tokens expire in 30 days. The client stores the token in `localStorage`.

---

### `server/routes/analyses.js` — Analysis Routes

| Lines | Responsibility |
|---|---|
| 9–12 | Multer configuration: `dest: 'uploads/'`, max file size 50 MB |
| 14 | `POST /api/analyses` — auth-protected, accepts one audio file via Multer, delegates to `analyzeAudio` controller |
| 16–52 | `GET /api/analyses` — auth-protected; returns all analyses for the user, optionally filtered by `?spaceId=`; parses `hume_emotions` and `chat_history` JSON columns before sending |
| 54–76 | `GET /api/analyses/:id` — auth-protected; returns single analysis by ID (ownership-checked) |
| 78 | `POST /api/analyses/:id/chat` — delegates to `chatWithAI` controller |
| 80 | `GET /api/analyses/:id/pdf` — delegates to `generatePDF` controller |
| 82–99 | `DELETE /api/analyses/:id` — deletes a single user-owned analysis |
| 101–128 | `DELETE /api/analyses` — bulk delete: if `?spaceId=` is provided, deletes only that space's analyses; otherwise clears all user analyses |

---

### `server/controllers/analysisController.js` — Core Business Logic

The largest and most important file in the project. Contains three exported functions and several private helpers.

---

#### `analyzeAudio` (exported) — Lines 27–123

The main analysis pipeline, called on `POST /api/analyses`.

| Lines | What happens |
|---|---|
| 31–33 | Validates that a file was uploaded by Multer |
| 35–37 | Reads `sourceType` from FormData (`'mic'` or `'upload'`); constructs `storedAudioPath` as `mic:filename` or `upload:filename` — this prefix is what powers the Recordings/Uploads filter in History |
| 39–43 | Runs Deepgram transcription **and** Behavioral Signals analysis **in parallel** using `Promise.allSettled()` — neither API call blocks the other |
| 45–60 | Unpacks results: transcription failure = hard error (500); Behavioral Signals failure = soft degradation (empty summary, analysis continues) |
| 62–72 | If a `spaceId` was submitted, fetches the last 5 analyses from that space to inject historical context into the AI prompts |
| 74–87 | Calls Groq twice in sequence: first `generatePrimaryEmotion()` (short summary), then `generateDetailedAnalysis()` (full paragraph), passing behavioral data + space history to both |
| 89–103 | INSERTs all results into the `analyses` table |
| 105–107 | Deletes the temp audio file from disk after successful INSERT |
| 109–114 | Returns `{ analysisId, transcription, primaryEmotion, detailedAnalysis }` — client navigates to `/analysis/:id` |
| 116–122 | Catch block: also deletes temp file on failure to prevent disk accumulation |

---

#### `transcribeAudio` (private) — Lines 125–148

Sends the audio buffer to Deepgram using the `nova-2` model with `smart_format: true`, `language: 'multi'`, and `detect_language: true`. Returns `{ text, language }`.

---

#### `analyzeBehavioralSignals` (private) — Lines 150–246

3-step async process with the Behavioral Signals v5 API:

| Lines | Step |
|---|---|
| 159–177 | **Submit**: POSTs the audio file as a `FormData` blob to the `/processes/audio` endpoint, receives a process ID (`pid`) |
| 191–223 | **Poll**: checks `/processes/{pid}` every 4 seconds, up to 40 attempts (160 seconds max), waits for `status === 2` (complete). Handles error codes `-1`, `-2`, `-3` |
| 229–240 | **Fetch**: retrieves results from `/processes/{pid}/results`, passes the array to `parseBehavioralResults()` |

---

#### `parseBehavioralResults` (private) — Lines 248–329

Aggregates per-utterance emotion labels from the Behavioral Signals response array:

| Lines | What it does |
|---|---|
| 264–288 | Loops over every utterance; extracts `emotion`, `positivity`, `strength` (arousal), `engagement`, `speaking_rate`, `hesitation`, `asr` (their own transcription), `gender`, `language`, `age`; tallies frequency counts for each |
| 290–301 | Finds the most frequent (dominant) label for each dimension |
| 303–328 | Returns structured object: `{ dominantEmotion, dominantPositivity, dominantArousal, dominantEngagement, dominantSpeakingRate, hesitationDetected, asrTranscription, detectedGender, detectedLanguage, estimatedAge, summary }` |

---

#### `generatePrimaryEmotion` (private) — Lines 331–370

Builds a prompt for Groq asking for a 2–3 sentence summary of the speaker's primary emotion. Injects Deepgram transcript, Behavioral Signals summary, and up to 5 previous analyses from the same space. Uses `llama-3.3-70b-versatile` at temperature 0.7, max 200 tokens.

---

#### `generateDetailedAnalysis` (private) — Lines 372–420

Builds a richer prompt for Groq asking for a single-paragraph psychological analysis covering: what was said verbatim, emotions felt, deeper meaning of each statement, vocal patterns (hesitation, energy, engagement). Uses `llama-3.3-70b-versatile` at temperature 0.8, max 800 tokens.

---

#### `chatWithAI` (exported) — Lines 422–475

Called on `POST /api/analyses/:id/chat`:

| Lines | What it does |
|---|---|
| 427–435 | Loads the existing analysis + `chat_history` from DB (ownership-checked) |
| 436–449 | Builds a context prompt with transcription, primary emotion, detailed analysis, and all prior messages |
| 451–457 | Calls Groq for a response |
| 461–467 | Appends both the user message and AI reply to `chat_history`, saves via UPDATE |
| 469 | Returns `{ response }` to the client |

---

#### `generatePDF` (exported) — Lines 477–529

Called on `GET /api/analyses/:id/pdf`:

| Lines | What it does |
|---|---|
| 481–487 | Loads analysis from DB (with space name via LEFT JOIN), ownership-checked |
| 492–496 | Creates PDFDocument, sets response headers (`Content-Type: application/pdf`, `Content-Disposition: attachment`) |
| 497 | Pipes the PDF stream directly into the HTTP response |
| 499–521 | Writes: EMORECO title, subtitle, date, space name, transcription, primary emotion, detailed analysis, footer |
| 523 | Ends the stream — browser triggers a file download |

---

### `server/routes/spaces.js` — Spaces Routes

| Lines | Responsibility |
|---|---|
| 7–23 | `GET /api/spaces` — returns all spaces for the user with a `analysis_count` via LEFT JOIN + GROUP BY |
| 25–48 | `POST /api/spaces` — creates a new space with `name` and optional `personName` |
| 50–67 | `DELETE /api/spaces/:id` — deletes a space (FK cascade: analyses keep their rows but get `space_id = NULL`) |

---

## Frontend Files — What Each File Does

---

### `client/vite.config.js` — Vite Configuration

| Lines | Responsibility |
|---|---|
| 6–15 | Dev server: host `0.0.0.0` (required for Replit iframe preview), port 5000, `allowedHosts: true`, proxies all `/api/*` to `http://localhost:3000` |
| 17–20 | Path aliases: `@` → `/src`, `@assets` → `/src/assets` |

---

### `client/src/App.jsx` — Router

| Lines | Responsibility |
|---|---|
| 1–13 | Imports React Router + all 9 page components |
| 15–39 | Wraps everything in `<Router>`, renders `<Header>` and `<Footer>` on every page, maps URL paths to page components |

```
/              → Home.jsx
/login         → Login.jsx
/signup        → Signup.jsx
/dashboard     → Dashboard.jsx
/spaces        → Spaces.jsx
/history       → History.jsx
/analysis/:id  → Analysis.jsx
/settings      → Settings.jsx
/record        → NewRecording.jsx
```

---

### `client/src/components/Header.jsx` — Navigation Bar

| Lines | Responsibility |
|---|---|
| 12–22 | `useEffect` keyed on `location` — re-runs on every route change; checks `localStorage` for token to set logged-in state; builds avatar initials from `user.name` |
| 24–53 | Logo (lucide `AudioWaveform` icon) + three nav links with active-class highlight based on `location.pathname` |
| 55–78 | Auth area: logged-in shows bell icon + avatar initials linking to `/settings`; logged-out shows Sign In + Get Started buttons |

---

### `client/src/pages/Dashboard.jsx` — Main Hub

| Lines | Responsibility |
|---|---|
| 24–33 | Auth guard; reads first name from localStorage; calls `fetchData()` |
| 35–55 | `fetchData()`: parallel GET for spaces + analyses; computes stats; stores last 5 as `recentActivity` |
| 57–80 | `startRecording()` / `stopRecording()`: `navigator.mediaDevices.getUserMedia` + `MediaRecorder` API — captures audio blob |
| 93–111 | `analyzeRecording()`: builds FormData with `sourceType: 'mic'`, POSTs to `/api/analyses`, navigates to `/analysis/:id` |
| 113–146 | Drag-and-drop upload: `handleDrop`, `handleFileSelect`, `analyzeUpload()` — sends `sourceType: 'upload'` in FormData |
| 148–175 | `formatTimeAgo()`, `getEmotionColor()`, `getEmotionLabel()` — display helpers for the recent activity list |
| 177–388 | JSX: welcome row, two action cards (Record / Upload with dropzone), 3 stat cards, recent activity list |
| 391–484 | Inline SVG icon components: `MicIcon`, `UploadIcon`, `WaveformIcon`, `FolderIcon`, `ClockIcon`, `ArrowIcon`, `StopIcon`, `CloseIcon`, etc. |

---

### `client/src/pages/NewRecording.jsx` — Dedicated Recording Page

A full-featured recording studio with a real-time waveform visualizer.

| Lines | Responsibility |
|---|---|
| 6–12 | `LANGUAGES` list constant; `formatTime(secs)` helper → `MM:SS` string |
| 25–35 | State: `phase` (idle/recording/paused/stopped), `elapsed` timer, `volume`, `volumeDb`, `clarity`, `autoAnalyze` toggle |
| 37–47 | On mount: auth guard + fetch analysis count to auto-number the recording title |
| 50–121 | `drawWaveform()` — the Canvas animation loop: when recording, reads frequency data from `AnalyserNode`, calculates volume (RMS average) and clarity (high-frequency content ratio at lines 73–75), draws 38 animated gradient bars; when idle/paused, draws ambient sine-wave bars |
| 123–140 | Canvas `ResizeObserver` — keeps canvas pixel dimensions synced to its CSS layout size |
| 142–174 | `startRecording()`: requests microphone → creates `AudioContext` + `AnalyserNode` for real-time visualization → starts `MediaRecorder` → starts elapsed-time interval |
| 176–205 | `pauseRecording()`, `resumeRecording()`, `stopAndAnalyze()` — phase machine transitions; auto-submits after stop if the toggle is on |
| 207–240 | `submitAnalysis()`: builds WAV blob from audio chunks, sends FormData with `sourceType: 'mic'`, navigates on success |
| 242–249 | Cleanup `useEffect`: stops mic stream, cancels animation frame, closes AudioContext on unmount |
| 259–499 | JSX: breadcrumb, left visualizer panel (canvas + playback controls), right details panel (title field, language select, auto-analyze toggle, live volume/clarity meters, action button) |

---

### `client/src/pages/History.jsx` — Analysis History Table

| Lines | Responsibility |
|---|---|
| 6–14 | `EMOTION_COLORS` map — emotion keyword → hex color for the dot in each row |
| 16–26 | `POSITIVE_TEXT_KEYWORDS` (19 terms) and `NEGATIVE_TEXT_KEYWORDS` (24 terms) — used as fallback for sentiment filter |
| 28–41 | `classifySentiment(analysis)`: checks `hume_emotions.dominantPositivity` first (direct from Behavioral Signals); if absent, scans the `primary_emotion` paragraph text for keyword matches |
| 43–49 | `isUpload(audioPath)`: returns `true` if path starts with `upload:`, `false` for `mic:`, falls back to file extension matching for older records |
| 51–58 | `getEmotionColor(emotion)`: loops over `EMOTION_COLORS` keys checking if the paragraph text includes the keyword |
| 60–73 | `getTimeAgo(dateStr)`: human-readable relative timestamps |
| 75–87 | `getDisplayName(analysis, index)`: strips `mic:` or `upload:` prefix, returns the filename portion as the row display name |
| 89–98 | Constants: `PAGE_SIZE = 7`, `FILTERS = ['All', 'Recordings', 'Uploads', 'Positive', 'Negative']` |
| 106–118 | `fetchHistory()`: fetches analyses, respects `?space=ID` query param (set when navigating from Spaces page) |
| 130–145 | `filtered` memo: applies text search across emotion/language/audio_path fields, then applies the active filter tab |
| 147–148 | Pagination math: `totalPages` and `paginated` slice |
| 155–295 | JSX: top bar (title + search + filter button), filter tab row, data table (loading/empty/rows states with mic/upload icons), pagination footer |

---

### `client/src/pages/Analysis.jsx` — Single Analysis Detail View

The richest page in the app. Renders every piece of data from one analysis.

| Lines | Responsibility |
|---|---|
| 4–24 | Imports 19 icons from `lucide-react` |
| 39–65 | `fetchAnalysis()`: loads single analysis by ID; pre-fills chat messages from saved `chat_history` |
| 67–86 | `sendChatMessage()`: optimistically adds user message to UI, POSTs to `/api/analyses/:id/chat`, appends AI response |
| 88–105 | `downloadPDF()`: GET `/api/analyses/:id/pdf` as blob → object URL → hidden `<a>` click → file download |
| 107–142 | Display mapping dictionaries: `EMOTION_MAP` (angry/heavy/sad/neutral → emoji+color+bg), `POSITIVITY_MAP`, `AROUSAL_MAP` (includes energy bar percentage), `ENGAGEMENT_MAP`, `RATE_MAP`, `LANG_MAP` (language codes → full names) |
| 155–165 | Derives all display values from `analysis.hume_emotions`; computes `hasBeh` and `hasDemo` booleans to conditionally show sections |
| 169–200 | **Transcription card**: Deepgram text + detected language label |
| 202–280 | **Voice Profile card** (shown if `hasBeh`): 6 metric cards — Emotion (emoji + colored chip), Tone/Positivity, Energy Level (animated progress bar), Engagement, Speaking Rate, Hesitation indicator |
| 282–321 | **Speaker Profile card** (shown if `hasDemo`): Gender chip, Estimated Age chip, Language chip |
| 323–337 | **Primary Emotion card**: the Groq-generated 2-3 sentence summary |
| 339–364 | **Detailed Analysis card**: collapsible (ChevronDown/Up); the Groq-generated full psychological paragraph |
| 366–424 | **AI Chat section**: collapsible; message list with user/assistant bubble styling + Brain icon avatar; text input form; auto-scrolls to bottom on new messages |

---

### `client/src/pages/Spaces.jsx` — Spaces Management

| Lines | Responsibility |
|---|---|
| 6–34 | Constants: `EMOTION_COLORS`, `CARD_GRADIENTS` (6 dark CSS gradients cycled by index), `CARD_ICONS` (5 SVG icons cycled by index) |
| 36–55 | `getTimeAgo()` and `getInitials()` helpers |
| 57–117 | `SpaceCard` component: gradient thumbnail, 3-dot dropdown menu (View history / Delete space), analysis count, emotion badges, avatar initials |
| 119–131 | `CreateCard` component: the "+" card at the end of the grid that opens the create modal |
| 145–161 | On mount: auth guard + fetch spaces + read user from localStorage |
| 163–191 | `createSpace()` and `deleteSpace()` — CRUD via `/api/spaces` |
| 193 | `viewSpace(id)`: navigates to `/history?space={id}` — History page reads this query param to filter its list |
| 239–285 | JSX: spaces grid (SpaceCard for each + CreateCard), create-space modal |

---

### `client/src/pages/Settings.jsx` — User Settings

| Lines | Responsibility |
|---|---|
| 5–26 | `NAV_ITEMS`: sidebar menu definitions (Profile, Analysis Defaults, Notifications, Privacy & Security, Billing) |
| 28–39 | `Toggle` reusable component — accessible `role="switch"` button |
| 54–62 | On mount: auth guard, reads user from localStorage, splits name into first + last |
| 64–84 | `handleLogout()`: clears localStorage → home. `handleSave()`: writes updated name to localStorage. `handleDeleteAccount()`: clears localStorage → home |
| 86 | Generates 2-letter avatar initials from `user.name` |
| 88–271 | JSX: topbar with Save button, two-column layout — sidebar nav + main content. Profile tab shows: profile banner card, personal info form, analysis preferences toggles, danger zone. All other tabs show "Coming soon" placeholder |

---

### `client/src/pages/Login.jsx` & `Signup.jsx`

Standard form pages. POST to `/api/auth/login` or `/api/auth/signup`. On success, store `token` and `user` object in `localStorage`, then navigate to `/dashboard`. Show inline validation errors.

---

### `client/src/pages/Home.jsx` — Landing Page

Marketing page for logged-out visitors. Contains a hero section, feature descriptions, and CTA buttons linking to `/signup` and `/login`. No API calls.

---

## Database Schema

### Table: `users`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | Auto-increment |
| `name` | TEXT | Display name |
| `email` | TEXT UNIQUE | Login identifier |
| `password` | TEXT | bcrypt hash |
| `created_at` | TIMESTAMPTZ | Default now() |

### Table: `spaces`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `user_id` | INTEGER FK → users | CASCADE DELETE |
| `name` | TEXT | Space display name |
| `person_name` | TEXT | Optional subject label |
| `created_at` | TIMESTAMPTZ | |

### Table: `analyses`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `user_id` | INTEGER FK → users | CASCADE DELETE |
| `space_id` | INTEGER FK → spaces | SET NULL on space delete |
| `audio_path` | TEXT | `mic:filename` or `upload:filename` — powers the Recordings/Uploads filter |
| `transcription` | TEXT | Deepgram output |
| `language` | TEXT | Auto-detected language code (`en`, `hi`, `fr`, etc.) |
| `hume_emotions` | TEXT | JSON string of the full Behavioral Signals parsed object |
| `primary_emotion` | TEXT | Groq 2-3 sentence emotional summary |
| `detailed_analysis` | TEXT | Groq full psychological paragraph |
| `chat_history` | TEXT | JSON array of `{ role, content }` chat message objects |
| `created_at` | TIMESTAMPTZ | |

**Indexes:** `idx_analyses_user_id`, `idx_analyses_space_id`, `idx_spaces_user_id`

---

## Environment Variables

Create `server/.env` (copy from `server/.env.example`):

```env
# PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host:5432/dbname

# JWT signing secret (use a long random string)
JWT_SECRET=your-long-random-secret-key

# Deepgram — speech-to-text
DEEPGRAM_API_KEY=your-deepgram-api-key

# Groq — LLM analysis + AI chat
GROQ_API_KEY=your-groq-api-key

# Behavioral Signals — vocal emotion detection
BEHAVIORAL_SIGNALS_CID=your-client-id
BEHAVIORAL_SIGNALS_TOKEN=your-auth-token
```

> **Note:** `BEHAVIORAL_SIGNALS_CID` and `BEHAVIORAL_SIGNALS_TOKEN` are optional. If missing, the app skips vocal emotion detection and still completes analysis using only Deepgram + Groq.

---

## Running Locally

**Prerequisites:** Node.js 18+, a PostgreSQL database (local or Supabase free tier)

```bash
# 1. Clone the repo
git clone <repo-url>
cd emoreco

# 2. Install server dependencies
cd server && npm install

# 3. Install client dependencies
cd ../client && npm install

# 4. Configure environment variables
cp server/.env.example server/.env
# Edit server/.env with your keys

# 5. Start the backend (port 3000)
cd server && node index.js

# 6. In a second terminal, start the frontend (port 5000)
cd client && npm run dev
```

Open `http://localhost:5000`. The Vite dev server proxies all `/api` calls to the backend automatically.

---

## Deployment

The app is deployed on **Render** as a single web service running the Node.js backend. The frontend is pre-built with `vite build` and served as static files by Express when `NODE_ENV=production` (see `server/index.js` lines 36–42).

The database uses **Supabase PostgreSQL** in production — set `DATABASE_URL` to the Supabase connection string. SSL is automatically enabled for any non-localhost URL (see `server/config/database.js` line 7).

See `RENDER_DEPLOYMENT_GUIDE.md` for step-by-step build commands, environment variable setup, and Render service configuration.
