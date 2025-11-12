
# ERGTracking5 — Vercel API Routes

This version is **Vercel-native**: the backend runs in **Serverless Functions** under `/api/*` and the frontend is static in `/public`.
No custom Node server needed, so you won't get "Not Found" on `/auth/discord` anymore.

## Deploy on Vercel
- Import this repo
- **Build & Output:**
  - Root Directory: (blank)
  - Install Command: (blank) — no deps required
  - Build Command: (blank)
  - Output Directory: public
- Environment Variables:
  - DISCORD_CLIENT_ID=...
  - DISCORD_CLIENT_SECRET=...
  - DISCORD_CALLBACK_URL=https://ergtracking5.vercel.app/api/auth/callback
  - SESSION_SECRET=any-long-random-string
  - WEBHOOK_URL=your discord webhook URL

## Endpoints
- GET /api/auth/discord        → redirects to Discord OAuth
- GET /api/auth/callback       → handles code exchange, sets signed cookie, redirects to /?auth=success
- GET /api/user                → returns session user
- POST /api/submit/application → requires login, posts embed to Discord webhook
- POST /api/submit/checkin     → requires login, posts embed to Discord webhook
- POST /api/submit/training    → requires login, posts embed to Discord webhook
- POST /api/submit/promotion   → requires login, posts embed to Discord webhook

Admin listing uses the webhook channel as the source of truth (no DB). You can later add persistence with a DB.
