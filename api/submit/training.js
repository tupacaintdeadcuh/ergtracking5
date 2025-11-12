import { getCookie, verify } from '../_util.js'; import { sendWebhook } from '../_send.js';
export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).end();
  const payload = verify(getCookie(req), process.env.SESSION_SECRET);
  if (!payload) return res.status(401).json({ error:'unauthenticated' });
  const out = await sendWebhook('ERG Training Update', 'training', payload, await read(req));
  res.status(out.ok?200:500).json(out);
}
async function read(req){ return await new Promise((resolve)=>{ let b=''; req.on('data',c=>b+=c); req.on('end',()=>{ try{resolve(JSON.parse(b||'{}'))}catch{resolve({})} }); }); }
