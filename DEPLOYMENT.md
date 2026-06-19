# 🚀 Admin Server Deployment Guide

## Host Admin Server on Railway

Railway is a free platform that can host your Flask admin server. Your app will be accessible from anywhere!

### Quick Setup (2 minutes)

1. **Go to Railway.app**
   - Visit: https://railway.app
   - Click **"Start a New Project"**

2. **Connect GitHub**
   - Click **"Deploy from GitHub"**
   - Authenticate with your GitHub account
   - Select **`parts-stock`** repository

3. **Configure Railway**
   - Railway auto-detects Flask app
   - Sets up deployment automatically
   - Wait for green checkmark (✓)

4. **Get Your URL**
   - Open **"Settings"** tab in Railway
   - Copy the **Public Domain** (looks like: `parts-stock-production.up.railway.app`)

### Update Your App

Once your server is deployed:

**In your inventory app (`index.html`):**

1. Go to **Setup** tab
2. Replace **admin server URL** with Railway URL:
   ```
   https://parts-stock-production.up.railway.app
   ```

3. Click **"Fetch from Admin Server"** to load parts

### Full Architecture

```
┌─────────────────────────────────────────┐
│  GitHub (Source Code)                   │
│  shabdroop/parts-stock                  │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
   GitHub Pages         Railway.app
   (Frontend)          (Backend API)
   HTTPS               HTTPS
   
   ▼                    ▼
Inventory App ───── Admin Server
(Static)             (Flask)
```

### What Gets Deployed

- ✅ **Frontend** → GitHub Pages
  - `index.html`, `app.js`, `manifest.json`, etc.
  - Lives at: `https://shabdroop.github.io/parts-stock`

- ✅ **Backend** → Railway
  - `server.py`, `admin.html`, API endpoints
  - Lives at: `https://your-railroad-url.up.railway.app`

### Full Workflow

1. **First time setup:**
   - Deploy frontend to GitHub Pages ✓ (Already done)
   - Deploy backend to Railway (instructions above)
   - Configure frontend to use Railway URL

2. **Regular updates:**
   - Edit files locally
   - Push to GitHub (`git push`)
   - Everything auto-updates:
     - Frontend updates instantly on GitHub Pages
     - Backend redeploys automatically from Railway

### Environment Variables (Optional)

If you need environment variables:

1. In Railway dashboard
2. Click **"Variables"**
3. Add any `.env` variables
4. Auto-redeploys

### Troubleshooting

**"Railway requires a card"**
- Free tier needs valid card (won't charge)
- Usage is free up to limits

**"App won't start"**
- Check Railway logs for errors
- Verify `Procfile` exists
- Check `requirements.txt` has all packages

**"CSV upload not working"**
- Railway has temporary storage only
- To persist data, upgrade to paid plan OR
- Use GitHub as backup (download CSV weekly)

### Auto-Updates After Push

Every time you push to GitHub:
```bash
git add .
git commit -m "Update inventory app"
git push origin master
```

Both will update:
1. **GitHub Pages** (frontend) - instant
2. **Railway** (backend) - within 1 minute

No manual deployment needed!

### Cost

- ✅ **Free tier:** First 5GB/month of usage
- ✅ **Generous limits:** More than enough for a small team
- 💰 Paid tier if you need more

### Next Steps

1. Go to https://railway.app
2. Deploy your repository
3. Copy the generated URL
4. Update `setup` form in your app with that URL
5. Done! 🎉

### Questions?

- Railway docs: https://docs.railway.app
- Flask deployment: https://flask.palletsprojects.com/deployment/
