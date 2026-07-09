# AluminumFishingBoats.us — Backend

This is the small backend that sits between the website (hosted on GoDaddy)
and two services: Claude (for the chat) and Supabase (for saved leads).
It exists so your Anthropic API key and Supabase service key never appear
in the website's own code, where anyone could view-source and steal them.

## What's here

- `api/chat.js` — the website sends the buyer's conversation here; this
  forwards it to Claude using your API key and sends the reply back.
- `api/lead.js` — the website sends captured lead data here (email, zip,
  chat transcript); this saves it into your Supabase `leads` table.

## Setup (after this repo is connected to Vercel)

In your Vercel project, go to **Settings → Environment Variables** and add:

| Name | Value | Where to find it |
|---|---|---|
| `ANTHROPIC_API_KEY` | your Claude API key | console.anthropic.com → API Keys |
| `SUPABASE_URL` | your project URL | Supabase → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | your service role key | Supabase → Settings → API → service_role key (secret) |

After adding these, redeploy the project (Vercel usually does this
automatically, or use the "Redeploy" button) so the functions can see them.

## Your two live endpoints, once deployed

- `https://your-project-name.vercel.app/api/chat`
- `https://your-project-name.vercel.app/api/lead`

These are the URLs the website's code will be pointed at.

## A note on security

Right now both functions allow requests from any website
(`Access-Control-Allow-Origin: *`), which is fine for testing. Once this is
live for real, it's worth restricting that to just
`https://aluminumfishingboats.us` so no other site can quietly use your
API key or write into your leads table through these endpoints.
