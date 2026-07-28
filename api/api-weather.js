// /api/weather.js
// Proxies requests to the NOAA/National Weather Service API so the browser
// never calls api.weather.gov directly (NOAA's API does not reliably send
// CORS headers, so direct browser-side fetches are unreliable — this proxy
// avoids that problem entirely, same reasoning as why /api/chat.js proxies
// the Claude API instead of calling it from the browser).
//
// Usage from the front end:
//   fetch('/api/weather?lat=44.9349&lon=-93.4653&label=Lake%20Minnetonka')
//
// NOAA requires a descriptive User-Agent identifying the application —
// update the CONTACT_EMAIL below to a real monitored address before going live.

const CONTACT_EMAIL = 'join@aiboatleads.com';
const USER_AGENT = `AluminumFishingBoats.us Weather Widget (${CONTACT_EMAIL})`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET requests are allowed' });
  }

  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Missing required "lat" and "lon" query parameters' });
  }

  try {
    // Step 1: resolve lat/lon to the correct NOAA forecast grid endpoint
    const pointsRes = await fetch(`https://api.weather.gov/points/${lat},${lon}`, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/geo+json' },
    });

    if (!pointsRes.ok) {
      const errText = await pointsRes.text();
      console.error('NOAA /points error:', pointsRes.status, errText);
      return res.status(502).json({ error: 'Could not resolve location with NOAA' });
    }

    const pointsData = await pointsRes.json();
    const forecastUrl = pointsData.properties?.forecast;

    if (!forecastUrl) {
      return res.status(502).json({ error: 'NOAA response missing forecast URL' });
    }

    // Step 2: fetch the actual forecast from the grid endpoint
    const forecastRes = await fetch(forecastUrl, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/geo+json' },
    });

    if (!forecastRes.ok) {
      const errText = await forecastRes.text();
      console.error('NOAA forecast error:', forecastRes.status, errText);
      return res.status(502).json({ error: 'Could not retrieve forecast from NOAA' });
    }

    const forecastData = await forecastRes.json();
    const periods = forecastData.properties?.periods || [];

    // Return a small, clean shape — just what the widget actually needs,
    // not NOAA's full verbose response.
    const today = periods[0];
    const tonight = periods[1];

    return res.status(200).json({
      updated: new Date().toISOString(),
      current: today
        ? {
            name: today.name,
            temperature: today.temperature,
            temperatureUnit: today.temperatureUnit,
            windSpeed: today.windSpeed,
            windDirection: today.windDirection,
            shortForecast: today.shortForecast,
            icon: today.icon,
          }
        : null,
      next: tonight
        ? {
            name: tonight.name,
            temperature: tonight.temperature,
            temperatureUnit: tonight.temperatureUnit,
            windSpeed: tonight.windSpeed,
            windDirection: tonight.windDirection,
            shortForecast: tonight.shortForecast,
          }
        : null,
      source: 'National Weather Service (NOAA)',
      sourceUrl: `https://forecast.weather.gov/MapClick.php?lat=${lat}&lon=${lon}`,
    });
  } catch (err) {
    console.error('Unexpected error in /api/weather:', err);
    return res.status(500).json({ error: 'Something went wrong fetching weather data' });
  }
}
