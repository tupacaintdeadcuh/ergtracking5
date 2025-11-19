# ERGTracking5 Architecture and Technology Overview

This document describes the technology stack and high‑level architecture of the ERGTracking5 application as deployed on Vercel.

## High‑Level Overview

- **Frontend**: Static single‑page style app served from `public/` (plain HTML, CSS, and vanilla JavaScript).
- **Backend**: Vercel **Serverless Functions** implemented as Node.js API routes under `/api/*`.
- **Auth Provider**: Discord OAuth2 for user identity.
- **Data Storage**:
  - User session stored in an HTTP‑only signed cookie.
  - Client‑side profile and tracking data stored in `localStorage`.
  - Submissions (application, check‑ins, training, promotions) sent to a Discord channel via a webhook (Discord acts as the system of record).

The app is designed to run without a standalone Node server or database. Vercel hosts static assets and executes API routes on demand.

## Technology Stack

- **Platform**: Vercel
  - Uses Vercel’s built‑in routing for static files (`/public`) and serverless functions (`/api`).
- **Runtime**: Node.js (for API routes)
  - Native `fetch` API in serverless functions.
  - Node’s `crypto` module for HMAC signing of session cookies (`api/_util.js`).
- **Frontend**:
  - `public/index.html` – main UI layout and view containers.
  - `public/styles.css` – styling for the dashboard and forms.
  - `public/app.js` – all client‑side behavior:
    - View navigation (`goto(...)`).
    - Local storage helpers (`db.get`, `db.set`).
    - Rank calculations.
    - Saving and loading of profile, application, check‑ins, and training data.
    - Calls to backend endpoints for submission and auth status (`/api/user`, `/api/submit/*`).
  - `public/sw.js` – service worker registration via `app.js` for offline/PWA‑like behavior.
- **Auth & Sessions**:
  - Discord OAuth2 endpoints: `/api/auth/discord`, `/api/auth/callback`.
  - Signed session cookie via `api/_util.js`.
- **Integration**:
  - Discord webhook (`api/_send.js`) for all submissions.

## Request Flow & Auth

### Login Flow

1. User clicks **Sign in** in the UI (`public/index.html` → `loginDiscord()` in `public/app.js`).
2. Browser is redirected to `/api/auth/discord`.
3. `api/auth/discord.js` builds a Discord OAuth2 URL using:
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CALLBACK_URL`
   and responds with a `302` redirect to Discord.
4. After the user authorizes, Discord redirects back to `/api/auth/callback?code=...`.
5. `api/auth/callback.js`:
   - Exchanges the `code` for an access token at `https://discord.com/api/oauth2/token` using `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`.
   - Fetches the authenticated user from `https://discord.com/api/users/@me`.
   - Signs a compact session payload `{ id, username, discriminator, avatar }` using `SESSION_SECRET` and the helper `sign()` from `api/_util.js`.
   - Writes a secure, HTTP‑only cookie `erg_sess` via `setCookie()` and redirects the user back to `/?auth=success`.

### Session Handling

- `api/_util.js`:
  - `sign(obj, secret)`: JSON‑encodes the object, Base64URL‑encodes it, and appends an HMAC‑SHA256 signature.
  - `verify(cookie, secret)`: splits the cookie into body and signature, recomputes the HMAC, and returns the decoded payload if valid.
  - `getCookie(req)`: parses `req.headers.cookie` for the `erg_sess` value.
  - `setCookie(res, value)`: sets `erg_sess` with flags:
    - `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, `Max‑Age=604800` (7 days).

- `api/user.js`:
  - Reads the `erg_sess` cookie via `getCookie`.
  - Verifies it with `verify`.
  - Returns `{ loggedIn: false }` if missing/invalid.
  - Returns `{ loggedIn: true, user: payload }` if valid.

- On the frontend:
  - `fetchMe()` in `public/app.js` calls `/api/user` with `credentials: 'include'`.
  - `renderAuth()` toggles **Sign in / Log out** buttons and shows the current Discord tag.

## Submission Endpoints & Data Flow

All submissions are implemented as POST‑only routes that:

1. Verify that the request has a valid session cookie.
2. Read the request JSON body.
3. Call `sendWebhook(...)` in `api/_send.js` to send an embed into a Discord channel via `WEBHOOK_URL`.

### Webhook Sending (`api/_send.js`)

- Builds a Discord embed object with:
  - `title` – context‑specific (e.g. “ERG Application”).
  - `fields` – includes:
    - `Type` – submission type (application, checkin, training, promotion).
    - `User` – Discord `username#discriminator (id)` if available.
    - `Data` – stringified JSON of the submission (truncated to stay under Discord limits).
  - `timestamp` – ISO8601 timestamp.
- Sends a POST request to `WEBHOOK_URL` with `{ content, embeds: [embed] }`.
- Returns a small `{ ok: boolean, ... }` object used to set HTTP status codes on the API response.

### Application Submission (`/api/submit/application`)

- `api/submit/application.js`:
  - Enforces `req.method === 'POST'`.
  - Verifies session (`verify(getCookie(req), SESSION_SECRET)`).
  - Reads JSON body via a small `read(req)` helper using the Node request stream.
  - Calls `sendWebhook('ERG Application', 'application', payload, body)`.

- Frontend:
  - `saveApplication()` stores application data into `localStorage`.
  - `sendAppServer()` POSTs the saved application object to `/api/submit/application` with `credentials: 'include'`.

### Weekly Check‑In Submission (`/api/submit/checkin`)

- `api/submit/checkin.js`:
  - Same structure as `application.js`.
  - Title: `ERG Weekly Check-In`, type: `checkin`.

- Frontend:
  - `saveCheckIn()` persists weekly entries in an array in `localStorage` and updates the history table.
  - `sendLastCheckInServer()` sends only the most recent check‑in to the backend.

### Training Submission (`/api/submit/training`)

- `api/submit/training.js`:
  - Same structure as other submit handlers.
  - Title: `ERG Training Update`, type: `training`.

- Frontend:
  - `saveTraining()` stores checkbox state and notes in `localStorage`.
  - `sendTrainingServer()` POSTs the stored training object.

### Promotion Request Submission (`/api/submit/promotion`)

- `api/submit/promotion.js`:
  - Same session and method checks.
  - Title: `ERG Promotion Request`, type: `promotion`.

- Frontend:
  - `exportPromotion()` builds a rich object with profile and training details and lets the user download a JSON file.
  - `sendPromotionServer()` POSTs a minimal payload `{ desiredRank, statement }` to the backend, which is then forwarded to Discord via webhook.

## Frontend Architecture

### Views & Navigation

- All views live in a single page (`public/index.html`) inside `<section>` tags with IDs like `view-home`, `view-apply`, etc.
- `public/app.js`:
  - Defines a `views` array and a `goto(viewId)` function that toggles a `hidden` CSS class on sections.
  - Navigation buttons in `<nav>` call `goto(...)` directly with `onclick`.
  - `fetchMe().then(() => { goto('home'); ... })` initializes the app and renders default views.

### Local Data Model

- A simple `db` helper wraps `localStorage`:
  - `db.get(key, default)` – parses JSON and falls back to a default.
  - `db.set(key, value)` – serializes to JSON.
- Stored keys include:
  - `profile` – basic member info and enlist date.
  - `application` – application form contents.
  - `checkins` – array of weekly check‑ins.
  - `training` – training flags and notes.
  - `daysOverride` – override for computed active days.

### Rank Calculation

- `RANKS` constant in `public/app.js`:
  - Defines rank names, required cumulative days, and textual requirements.
- `daysActive()`:
  - Computes difference between `Date.now()` and `profile.enlistDate` (in days) unless overridden by `daysOverride`.
- `renderHome()`:
  - Shows the current days active and derived rank in the KPI cards.
- `renderRanks()`:
  - Builds a table of all ranks and highlights rows where `daysActive()` meets or exceeds the rank requirement.

### PWA / Service Worker

- At the top of `public/app.js`:
  - Registers `public/sw.js` if `serviceWorker` is available in the browser.
- This allows caching of assets for offline or improved reload behavior, depending on the implementation of `sw.js`.

## Environment Configuration

The application expects the following environment variables at deploy time (as noted in `README.md`):

- `DISCORD_CLIENT_ID` – Discord application client ID.
- `DISCORD_CLIENT_SECRET` – Discord application client secret.
- `DISCORD_CALLBACK_URL` – full URL to `/api/auth/callback` on the deployed domain.
- `SESSION_SECRET` – long random string used to sign session cookies.
- `WEBHOOK_URL` – Discord webhook endpoint where submissions are posted.

These variables are used only within the serverless functions; the frontend never receives them directly.

## Security Considerations (High Level)

- **Sessions**:
  - Stored in a signed, HTTP‑only cookie to prevent client‑side tampering and direct JavaScript access.
  - `Secure` and `SameSite=Lax` reduce some cross‑site risks.
- **No DB Credentials**:
  - There is no database; all persistent records live in Discord via webhooks and the user’s browser `localStorage`.
- **CORS / Origin**:
  - API routes are assumed to be called only from the same origin (no explicit CORS configuration).
- **Rate Limiting**:
  - No rate limiting is implemented in code; Discord webhook usage is still subject to Discord’s own limits.

This architecture favors simplicity and low operational overhead by leveraging Vercel’s platform, Discord OAuth, and Discord webhooks instead of managing stateful infrastructure.

