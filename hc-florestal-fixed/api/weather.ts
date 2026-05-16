import type { VercelRequest, VercelResponse } from '@vercel/node';
import https from 'https';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Latitude e longitude são obrigatórios.' });
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m`;

  const request = https.get(url, (response) => {
    let data = '';
    response.on('data', (chunk) => { data += chunk; });
    response.on('end', () => {
      try {
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(data);
      } catch {
        res.status(500).json({ error: 'Falha ao processar dados do clima.' });
      }
    });
  });

  request.on('error', (err) => {
    console.error('Erro ao buscar clima:', err);
    res.status(500).json({ error: 'Falha ao buscar dados de clima.', details: err.message });
  });

  request.setTimeout(8000, () => {
    request.destroy();
    res.status(504).json({ error: 'Timeout ao buscar dados de clima.' });
  });
}
