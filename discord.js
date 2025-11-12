export default function handler(req, res){
  const client = process.env.DISCORD_CLIENT_ID;
  const redirect = encodeURIComponent(process.env.DISCORD_CALLBACK_URL);
  const url = `https://discord.com/oauth2/authorize?client_id=${client}&redirect_uri=${redirect}&response_type=code&scope=identify`;
  res.status(302).setHeader('Location', url).end();
}