const https = require('https');

const SUPABASE_URL = 'https://brswfmqvremziuqxrxei.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

function supabaseInsert(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const url = new URL('/rest/v1/gebruikers', SUPABASE_URL);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { naam, rijder, fiets, merkOlie, typeOlie, merkReiniger, frequentie, omstandigheden } = JSON.parse(event.body);

  // Sla data op in Supabase
  try {
    await supabaseInsert({
      naam,
      rijder_type: rijder,
      fiets_type: fiets,
      merk_olie: merkOlie,
      product_olie: typeOlie,
      merk_reiniger: merkReiniger,
      frequentie,
      omstandigheden
    });
  } catch(e) {
    console.error('Supabase error:', e.message);
  }

  const prompt = `Je bent een expert fietsonderhoud adviseur bij het platform ChainGuide. Geef een concreet, stap-voor-stap onderhoudsplan voor:

- Naam: ${naam}
- Rijdersprofiel: ${rijder}
- Fietstype: ${fiets}
- Smeermiddel: ${merkOlie} — product: ${typeOlie}
- Reiniger: ${merkReiniger}
- Rijfrequentie: ${frequentie}
- Rijomstandigheden: ${omstandigheden}

Geef exact 4 stappen terug als JSON array. Elke stap heeft:
- "titel": korte staptitel (max 4 woorden)
- "tag": één woord categorie (bijv. REINIGING, SMERING, INSPECTIE, TIMING)
- "inhoud": gedetailleerde instructie van 3-5 zinnen, specifiek voor de bovenstaande producten en omstandigheden. Noem het merk bij naam. Wees praktisch en concreet.

Geef ALLEEN de JSON array terug, geen uitleg, geen markdown backticks.`;

  const postData = JSON.stringify({
    model: "claude-sonnet-4-5",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }]
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            resolve({ statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ debug: parsed.error }) });
            return;
          }
          const text = parsed.content.map(i => i.text || '').join('');
          resolve({ statusCode: 200, headers: { "Content-Type": "application/json" }, body: text });
        } catch(e) {
          resolve({ statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ debug: 'Parse error: ' + e.message }) });
        }
      });
    });
    req.on('error', (e) => {
      resolve({ statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ debug: 'Request error: ' + e.message }) });
    });
    req.write(postData);
    req.end();
  });
};
