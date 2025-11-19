# ERGTracking5

Self-hosted build of the ERG activity tracker. The UI ships from `/public` and a lightweight Express server exposes the Discord OAuth and submission endpoints under `/api/*`.

## Prerequisites
- Node.js 18+
- npm (ships with Node)
- Discord application (client ID/secret) and webhook URL

## Setup
1. Clone the repo and `cd` into it.
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file in the project root:
   ```ini
   DISCORD_CLIENT_ID=your-client-id
   DISCORD_CLIENT_SECRET=your-client-secret
   DISCORD_CALLBACK_URL=http://localhost:3000/api/auth/callback
   SESSION_SECRET=any-long-random-string
   WEBHOOK_URL=https://discord.com/api/webhooks/...
   # Optional: disable HTTPS-only cookies for local HTTP
   COOKIE_SECURE=false
   ```

## Running Locally
- Development (auto-restart on change):
  ```sh
  npm run dev
  ```
- Production-style run:
  ```sh
  npm start
  ```

Browse to `http://localhost:3000`. All API calls go through the same Express server (`server.js`), so no additional proxying is required.

## Environment Variables
| Name | Description |
| ---- | ----------- |
| `DISCORD_CLIENT_ID` | Discord OAuth application client ID. |
| `DISCORD_CLIENT_SECRET` | OAuth client secret. |
| `DISCORD_CALLBACK_URL` | Full URL to `/api/auth/callback` for your deployment. |
| `SESSION_SECRET` | Random string used to sign the `erg_sess` cookie. |
| `WEBHOOK_URL` | Discord webhook endpoint for submissions. |
| `COOKIE_SECURE` (optional) | Defaults to `true`. Set to `false` when testing over plain `http://` so the browser accepts the cookie. |
| `PORT` (optional) | HTTP port for the Express server. Defaults to `3000`. |

## Deploying
Deploy `server.js` plus the `public/` folder anywhere you can run Node 18+: a VM with PM2/systemd, Render, Railway, Fly.io, Docker, etc. Set the environment variables above on the host and start the server with `npm start`. The static assets will be served automatically, so you do not need an external CDN unless desired.

## API Surface
The Express server exposes the same routes that previously lived in Vercel functions:
- `GET /api/auth/discord` and `GET /api/auth/callback`
- `GET /api/user`
- `POST /api/submit/application`
- `POST /api/submit/checkin`
- `POST /api/submit/training`
- `POST /api/submit/promotion`

Each submission endpoint validates the signed session cookie and forwards the payload to the configured Discord webhook.
