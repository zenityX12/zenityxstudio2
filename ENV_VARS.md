# Environment Variables Reference

Copy these environment variables to your deployment platform (Vercel/Railway/Render):

## Required Variables

```bash
# Database
DATABASE_URL=<your_tidb_connection_string>

# Kie.ai API
KIE_API_KEY=<your_kie_api_key>

# Node Environment
NODE_ENV=production

# OAuth (from Manus)
OAUTH_SERVER_URL=<from_manus_secrets>
VITE_OAUTH_PORTAL_URL=<from_manus_secrets>
OWNER_OPEN_ID=<from_manus_secrets>
OWNER_NAME=<from_manus_secrets>
JWT_SECRET=<from_manus_secrets>

# S3 Storage (from Manus)
BUILT_IN_FORGE_API_KEY=<from_manus_secrets>
BUILT_IN_FORGE_API_URL=<from_manus_secrets>
VITE_FRONTEND_FORGE_API_KEY=<from_manus_secrets>
VITE_FRONTEND_FORGE_API_URL=<from_manus_secrets>

# App Config
VITE_APP_ID=<from_manus_secrets>
VITE_APP_TITLE=ZenityX AI Studio
VITE_APP_LOGO=/logo.png

# Webhook
WEBHOOK_BASE_URL=<your_deployed_domain>
```

## How to Get Values

1. **DATABASE_URL** - From your TiDB Cloud console
2. **KIE_API_KEY** - From Kie.ai dashboard
3. **OAuth & S3 variables** - From Manus project secrets (Settings → Secrets)
4. **WEBHOOK_BASE_URL** - Your deployed domain (e.g., https://your-app.vercel.app)

## Notes

- All variables are required for the app to work
- Keep secrets secure and never commit them to Git
- Update WEBHOOK_BASE_URL after deployment
