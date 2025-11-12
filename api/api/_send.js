export async function sendWebhook(title, type, user, data){
  const url = process.env.WEBHOOK_URL;
  if (!url) return { ok:false, reason:'No webhook configured' };
  const embed = {
    title, color: 0x38bdf8,
    fields: [
      { name:'Type', value:type||'-', inline:true },
      { name:'User', value: user ? `${user.username}#${user.discriminator} (${user.id})` : '-', inline:true },
      { name:'Data', value: '```json\n' + JSON.stringify(data, null, 2).slice(0, 1800) + '\n```' }
    ],
    timestamp: new Date().toISOString()
  };
  const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ content:`ERG ${type} submission`, embeds:[embed] }) });
  if (!r.ok) return { ok:false, status:r.status };
  return { ok:true };
}