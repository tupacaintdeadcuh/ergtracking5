import crypto from 'crypto';
const COOKIE='erg_sess';
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
  res.setHeader('Set-Cookie', `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`);
}
export function getCookie(req){
  const h=req.headers.cookie||''; const m=h.match(/erg_sess=([^;]+)/); return m?m[1]:null;
}
