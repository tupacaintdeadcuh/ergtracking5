import { sign, setCookie } from '../_util.js';
export default async function handler(req, res){
  try{
    const code = req.query.code;
    if(!code) return res.status(400).send('Missing code');
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
      const t = await tokenRes.text();
      return res.status(400).send('Token exchange failed: ' + t);
    }
    const token = await tokenRes.json();
    const userRes = await fetch('https://discord.com/api/users/@me', { headers: { 'Authorization': token.token_type + ' ' + token.access_token } });
    if (!userRes.ok) return res.status(400).send('User fetch failed');
    const user = await userRes.json();
    const value = sign({ id:user.id, username:user.username, discriminator:user.discriminator, avatar:user.avatar }, process.env.SESSION_SECRET);
    setCookie(res, value);
    res.status(302).setHeader('Location', '/?auth=success').end();
  }catch(e){
    res.status(500).send('Callback error: ' + e.message);
  }
}