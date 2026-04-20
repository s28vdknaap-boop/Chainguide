const https = require('https');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { naam, rijder, fiets, merkOlie, typeOlie, merkReiniger, frequentie, omstandigheden } = JSON.parse(event.body);

  const prompt = `Je bent een expert fietsonderhoud adviseur bij het platform ChainGuide. Geef een concreet, stap-voor-stap onderhoudsplan voor:

- Naam: ${naam}
- Rijdersprofiel: ${rijder}
- Fietstype: ${fiets}
- Smeermiddel: ${merkOlie} — type: ${typeOlie}
- Reiniger: ${merkReiniger}
- Rijfrequentie: ${frequentie}
- Rijomstandigheden: ${omstandigheden}

Geef exact 4 stappen terug als JSON array. Elke stap heeft:
- "titel": korte staptitel (max 4 woorden)
- "tag": één woord categorie (bijv. REINIGING, SMERING, INSPECTIE, TIMING)
- "inhoud": gedetailleerde instructie van 3-5 zinnen, specifiek voor de bovenstaande producten en omstandigheden. Noem het merk bij naam. Wees praktisch en concreet.

Geef ALLEEN de JSON array terug, geen uitleg, geen markdown backticks.`;

  const postData = JSON.stringify({
    model: "claude-sonnet-4-20250514",
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
            resolve({
              statusCode: 500,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ debug: parsed.error })
            });
            return;
          }
          const text = parsed.content.map(i => i.text || '').join('');
          resolve({
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: text
          });
        } catch(e) {
          resolve({ 
            statusCode: 500, 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ debug: 'Parse error: ' + e.message, raw: data.substring(0, 200) })
          });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ 
        statusCode: 500, 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ debug: 'Request error: ' + e.message })
      });
    });

    req.write(postData);
    req.end();
  });
};
