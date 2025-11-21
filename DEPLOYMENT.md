# ZenityX AI Studio - Deployment Guide

## 🚀 Deploy to Vercel (Recommended)

### Prerequisites
- GitHub account connected to Vercel
- TiDB database (already have)
- Kie.ai API key (already have)

### Steps

1. **Go to Vercel**
   - Visit https://vercel.com
   - Click "Add New Project"
   - Import `zenityX12/zenityxstudio2` from GitHub

2. **Configure Build Settings**
   ```
   Framework Preset: Other
   Build Command: pnpm build
   Output Directory: dist/public
   Install Command: pnpm install
   ```

3. **Add Environment Variables**
   Go to Project Settings → Environment Variables and add:

   ```bash
   # Database
   DATABASE_URL=mysql://M6RiQS69meh6Ri6.root:0i9PkiyY7Uf3aCoD@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/test?ssl={"rejectUnauthorized":true}
   
   # Kie.ai API
   KIE_API_KEY=your_kie_api_key_here
   
   # Node Environment
   NODE_ENV=production
   
   # Manus OAuth (copy from Manus secrets)
   OAUTH_SERVER_URL=your_oauth_server_url
   VITE_OAUTH_PORTAL_URL=your_oauth_portal_url
   OWNER_OPEN_ID=your_owner_open_id
   OWNER_NAME=your_owner_name
   JWT_SECRET=your_jwt_secret
   
   # AWS S3 (copy from Manus secrets)
   BUILT_IN_FORGE_API_KEY=your_s3_api_key
   BUILT_IN_FORGE_API_URL=your_s3_api_url
   VITE_FRONTEND_FORGE_API_KEY=your_frontend_api_key
   VITE_FRONTEND_FORGE_API_URL=your_frontend_api_url
   
   # App Config
   VITE_APP_ID=your_app_id
   VITE_APP_TITLE=ZenityX AI Studio
   VITE_APP_LOGO=/logo.png
   
   # Webhook
   WEBHOOK_BASE_URL=https://your-vercel-domain.vercel.app
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `https://your-project.vercel.app`

5. **Test**
   - Visit `/api/health` to check database connection
   - Try login with OAuth
   - Test AI generation features

---

## 🚂 Alternative: Deploy to Railway

1. **Go to Railway**
   - Visit https://railway.app
   - Click "New Project" → "Deploy from GitHub repo"
   - Select `zenityX12/zenityxstudio2`

2. **Configure**
   - Railway will auto-detect Node.js
   - Add all environment variables (same as Vercel above)

3. **Deploy**
   - Railway will automatically deploy
   - Get your public URL from dashboard

---

## 🎨 Alternative: Deploy to Render

1. **Go to Render**
   - Visit https://render.com
   - Click "New +" → "Web Service"
   - Connect GitHub repo `zenityX12/zenityxstudio2`

2. **Configure**
   ```
   Name: zenityx-ai-studio
   Environment: Node
   Build Command: pnpm install && pnpm build
   Start Command: pnpm start
   ```

3. **Add Environment Variables**
   - Same as Vercel above

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment

---

## 📝 Important Notes

### Database Connection
- Using **TiDB Serverless** (gateway01.ap-southeast-1.prod.aws.tidbcloud.com)
- Make sure TiDB quota is not exhausted
- SSL is enabled for security

### OAuth Configuration
- Update `WEBHOOK_BASE_URL` to your deployed domain
- Make sure OAuth redirect URLs are configured in Manus OAuth settings

### File Storage
- Using Manus S3 storage
- Make sure API keys are valid

### Monitoring
- Check `/api/health` endpoint for system status
- Monitor database connection and quota usage

---

## 🐛 Troubleshooting

### Login Error 500
- Check DATABASE_URL is set correctly
- Verify TiDB quota is not exhausted
- Check OAuth environment variables

### Database Connection Failed
- Verify DATABASE_URL format
- Check TiDB firewall settings
- Ensure SSL is enabled

### AI Generation Not Working
- Verify KIE_API_KEY is set
- Check WEBHOOK_BASE_URL points to your domain
- Monitor Kie.ai API quota

---

## 📞 Support

If you encounter issues:
1. Check deployment logs
2. Visit `/api/health` to diagnose
3. Review environment variables
4. Contact platform support (Vercel/Railway/Render)
