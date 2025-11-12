import { getCookie, verify } from './_util.js';
export default async function handler(req, res){
  const token = getCookie(req);
  const payload = verify(token, process.env.SESSION_SECRET);
  if (!payload) return res.status(200).json({ loggedIn:false });
  res.status(200).json({ loggedIn:true, user: payload });
}