# EMORECO - Render Deployment Guide

## Prerequisites
- A Render.com account (free tier works)
- All API keys ready:
  - DEEPGRAM_API_KEY
  - HUME_API_KEY
  - GROQ_API_KEY

---

## Step 1: Prepare Your Repository

1. **Push your code to GitHub/GitLab**
   ```bash
   git add .
   git commit -m "Ready for Render deployment"
   git push origin main
   ```

2. **Make sure these files exist in your repo:**
   - `package.json` (root)
   - `server/package.json`
   - `client/package.json`
   - `server/.env.example` (for reference)

---

## Step 2: Create Web Service on Render

### 2.1 Go to Render Dashboard
- Visit https://render.com
- Click **"New +"** → **"Web Service"**

### 2.2 Connect Repository
- Select your GitHub/GitLab repository
- Choose the **EMORECO** repository

### 2.3 Configure Web Service

**Basic Settings:**
```
Name: emoreco-app (or your choice)
Region: Choose closest to your users
Branch: main
Root Directory: (leave empty)
```

**Build & Deploy:**
```
Runtime: Node
Build Command: npm install && npm run build
Start Command: npm start
```

**Instance Type:**
- Free tier (for testing)
- Starter ($7/month for production)

---

## Step 3: Environment Variables

Click **"Advanced"** → **"Environment Variables"** and add these:

### Required Environment Variables:

```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=<generate-a-secure-random-string>
DEEPGRAM_API_KEY=<your-deepgram-api-key>
HUME_API_KEY=<your-hume-api-key>
GROQ_API_KEY=<your-groq-api-key>
```

### How to Generate JWT_SECRET:
Run this command locally:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copy the output and use it as JWT_SECRET value.

---

## Step 4: Update package.json Scripts

Make sure your **root package.json** has these scripts:

```json
{
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "client": "cd client && npm run dev",
    "server": "cd server && npm run dev",
    "build": "cd client && npm run build",
    "start": "cd server && npm start"
  }
}
```

And **server/package.json** should have:

```json
{
  "scripts": {
    "dev": "nodemon index.js",
    "start": "node index.js"
  }
}
```

---

## Step 5: Update Server for Production

Your `server/index.js` already has production serving code:

```javascript
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '..', 'client', 'dist')
  app.use(express.static(clientBuildPath))
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'))
  })
}
```

This serves the built React app from `/client/dist`.

---

## Step 6: Update Vite Config (Already Done)

Your `client/vite.config.js` already has the correct settings:

```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,  // ✅ Important for deployment
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
```

---

## Step 7: Deploy!

1. Click **"Create Web Service"**
2. Render will:
   - Clone your repository
   - Run `npm install`
   - Run `npm run build` (builds React frontend)
   - Run `npm start` (starts Node backend)
3. Wait 5-10 minutes for first deployment

---

## Step 8: Access Your App

Once deployed, Render gives you a URL like:
```
https://emoreco-app.onrender.com
```

Visit this URL to access your live EMORECO platform!

---

## Common Issues & Solutions

### Issue 1: Build fails
**Solution:** Check that all dependencies are in package.json, not just devDependencies.

### Issue 2: API calls fail
**Solution:** Make sure all environment variables are set correctly in Render dashboard.

### Issue 3: Static files not loading
**Solution:** Ensure `npm run build` creates `client/dist` directory.

### Issue 4: Database resets on restart
**Solution:** Render free tier has ephemeral storage. Use a persistent database like:
- Render PostgreSQL (free tier available)
- Supabase
- PlanetScale

---

## Production Database (Optional)

### To use PostgreSQL instead of SQLite:

1. **Create PostgreSQL Database on Render**
   - Click "New +" → "PostgreSQL"
   - Copy the "Internal Database URL"

2. **Add to Environment Variables:**
   ```
   DATABASE_URL=<your-postgres-url>
   ```

3. **Update server/config/database.js** to use PostgreSQL instead of SQLite (migration needed)

---

## Auto-Deploy on Push

Render automatically redeploys when you push to your main branch!

```bash
git add .
git commit -m "Update feature"
git push origin main
```

Render will detect the push and redeploy automatically.

---

## Monitoring & Logs

- **View Logs:** Render Dashboard → Your Service → "Logs"
- **Monitor:** Check CPU, Memory usage in dashboard
- **Alerts:** Set up email alerts for service failures

---

## Cost Estimate

**Free Tier (Testing):**
- ✅ 750 hours/month free
- ⚠️ Spins down after 15 minutes of inactivity
- ⚠️ Cold start: 30-60 seconds

**Starter Plan ($7/month):**
- ✅ Always running (no spin down)
- ✅ Faster performance
- ✅ Custom domains

---

## Next Steps After Deployment

1. ✅ Test all features (signup, login, analysis)
2. ✅ Set up custom domain (optional)
3. ✅ Enable HTTPS (automatic on Render)
4. ✅ Monitor API usage and costs
5. ✅ Set up error tracking (Sentry, LogRocket)

---

## Support

If deployment fails:
1. Check Render logs for errors
2. Verify all environment variables
3. Test locally with `NODE_ENV=production npm start`
4. Contact Render support (excellent free support!)

---

**Happy Deploying! 🚀**

Your EMORECO platform will be live and accessible worldwide!
