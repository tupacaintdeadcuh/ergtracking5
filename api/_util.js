import crypto from 'crypto';
const COOKIE='erg_sess';
const MAX_AGE=60*60*24*7;
export function sign(obj, secret){
  const body = Buffer.from(JSON.stringify(obj)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}
export function verify(cookie, secret){
  if(!cookie) return null;
  const [body,sig]=cookie.split('.'); if(!body||!sig) return null;
  const exp = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  if (exp !== sig) return null;
  try{ return JSON.parse(Buffer.from(body,'base64url').toString()) }catch{ return null }
}
export function setCookie(res, value){
  res.setHeader('Set-Cookie', buildCookie(value));
}
export function getCookie(req){
  const h=req.headers.cookie||''; const m=h.match(/erg_sess=([^;]+)/); return m?m[1]:null;
}
function buildCookie(value){
  const parts=[`${COOKIE}=${value}`,'Path=/','HttpOnly','SameSite=Lax',`Max-Age=${MAX_AGE}`];
  if(shouldUseSecureCookies()) parts.push('Secure');
  return parts.join('; ');
}
function shouldUseSecureCookies(){
  const pref=(process.env.COOKIE_SECURE||'').toLowerCase();
  if(!pref) return true;
  return pref !== 'false';
}
