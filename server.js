import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { getCookie, setCookie, sign, verify } from './api/_util.js';
import { sendWebhook } from './api/_send.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

logMissingEnv(['DISCORD_CLIENT_ID','DISCORD_CLIENT_SECRET','DISCORD_CALLBACK_URL','SESSION_SECRET','WEBHOOK_URL']);

app.get('/api/auth/discord', (req, res) => {
  if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CALLBACK_URL) {
    return res.status(500).send('Discord OAuth not configured');
  }
  const redirect = encodeURIComponent(process.env.DISCORD_CALLBACK_URL);
  const url = `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${redirect}&response_type=code&scope=identify`;
  res.redirect(url);
});

app.get('/api/auth/callback', async (req, res) => {
  try {
    if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET || !process.env.DISCORD_CALLBACK_URL) {
      return res.status(500).send('Discord OAuth not configured');
    }
    if (!process.env.SESSION_SECRET) {
      return res.status(500).send('SESSION_SECRET not configured');
    }
    const code = req.query.code;
    if (!code) return res.status(400).send('Missing code');
    const params = new URLSearchParams();
    params.append('client_id', process.env.DISCORD_CLIENT_ID);
    params.append('client_secret', process.env.DISCORD_CLIENT_SECRET);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', process.env.DISCORD_CALLBACK_URL);

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      return res.status(400).send('Token exchange failed: ' + text);
    }
    const token = await tokenRes.json();
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { 'Authorization': `${token.token_type} ${token.access_token}` }
    });
    if (!userRes.ok) return res.status(400).send('User fetch failed');
    const user = await userRes.json();
    const payload = { id: user.id, username: user.username, discriminator: user.discriminator, avatar: user.avatar };
    const value = sign(payload, process.env.SESSION_SECRET);
    setCookie(res, value);
    res.redirect('/?auth=success');
  } catch (err) {
    res.status(500).send('Callback error: ' + err.message);
  }
});

app.get('/api/user', (req, res) => {
  if (!process.env.SESSION_SECRET) {
    return res.status(500).json({ error: 'SESSION_SECRET not configured' });
  }
  const payload = verify(getCookie(req), process.env.SESSION_SECRET);
  if (!payload) return res.json({ loggedIn: false });
  res.json({ loggedIn: true, user: payload });
});

app.post('/api/submit/application', submissionHandler('ERG Application', 'application'));
app.post('/api/submit/checkin', submissionHandler('ERG Weekly Check-In', 'checkin'));
app.post('/api/submit/training', submissionHandler('ERG Training Update', 'training'));
app.post('/api/submit/promotion', submissionHandler('ERG Promotion Request', 'promotion'));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ERGTracking5 listening on http://localhost:${PORT}`);
});

function submissionHandler(title, type) {
  return async (req, res) => {
    if (!process.env.SESSION_SECRET) {
      return res.status(500).json({ ok: false, error: 'SESSION_SECRET not configured' });
    }
    const payload = verify(getCookie(req), process.env.SESSION_SECRET);
    if (!payload) return res.status(401).json({ error: 'unauthenticated' });
    try {
      const data = typeof req.body === 'object' && req.body !== null ? req.body : {};
      const result = await sendWebhook(title, type, payload, data);
      res.status(result.ok ? 200 : 500).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  };
}

function logMissingEnv(keys) {
  keys.forEach(key => {
    if (!process.env[key]) {
      console.warn(`[ergtracking5] Warning: missing ${key} environment variable`);
    }
  });
}
