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

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await response.json();
  const text = data.content.map(i => i.text || '').join('');

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: text
  };
};
