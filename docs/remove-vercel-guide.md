# Removing Vercel from ERGTracking5

Use this guide if you want to run or deploy ERGTracking5 without Vercel. The repo already ships with `server.js`, an Express server that mirrors the former serverless API routes.

## 1. Install & Configure
1. **Install dependencies**
   ```sh
   npm install
   ```
2. **Create `.env`** with the variables shown below. `COOKIE_SECURE=false` is recommended for local HTTP testing so the session cookie is accepted.
   ```ini
   DISCORD_CLIENT_ID=your-client-id
   DISCORD_CLIENT_SECRET=your-client-secret
   DISCORD_CALLBACK_URL=http://localhost:3000/api/auth/callback
   SESSION_SECRET=any-long-random-string
   WEBHOOK_URL=https://discord.com/api/webhooks/...
   COOKIE_SECURE=false
   ```

## 2. Local Development
- Watch mode (Node 18+):
  ```sh
  npm run dev
  ```
- Standard run:
  ```sh
  npm start
  ```

Browse to `http://localhost:3000`. The Express server serves everything:
- Static assets from `public/`
- OAuth endpoints `/api/auth/discord` and `/api/auth/callback`
- `/api/user`
- Submission routes under `/api/submit/*`

## 3. Deployment (Non-Vercel)
1. Provision any Node 18+ host (VM, Docker, Render, Railway, Fly.io, etc.).
2. Copy the repo contents (or build artifact) to the host.
3. Set the same environment variables on the host (often via the provider dashboard or secrets manager).
4. Start the process with `npm start` (wrap with PM2/systemd if you need restarts).
5. Point your domain or load balancer at the running instance.

## 4. Vercel Clean-Up (Optional)
- Delete `vercel.json` or other deployment files if you no longer target Vercel.
- Remove Vercel CLI scripts from any docs or CI (already done in `README.md`).
- Once you are confident in the Express server, you can delete the old `/api` function files; they remain for reference.

That’s it—ERGTracking5 now runs as a traditional Node/Express app, and you can host it anywhere without depending on Vercel.
