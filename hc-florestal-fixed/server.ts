import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API routes (Placeholder for any future backend needs)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/weather", (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    const url = `http://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m`;

    const request = http.get(url, (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
      response.on('end', () => {
        try {
          res.json(JSON.parse(data));
        } catch (e) {
          res.status(500).json({ error: "Failed to parse weather data" });
        }
      });
    }).on('error', (err) => {
      console.error("Error proxying weather:", err);
      res.status(500).json({ error: "Failed to fetch weather", details: err.message });
    });

    request.setTimeout(5000, () => {
      request.destroy();
      res.status(504).json({ error: "Weather fetch timed out" });
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`Erro ao enviar index.html: ${err.message}`);
          res.status(500).send("Erro interno ao carregar a aplicação. Verifique se o build foi concluído.");
        }
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log("========================================");
    console.log(`🚀 SISTEMA HC GESTÃO FLORESTAL ATIVO`);
    console.log(`📡 Porta: ${PORT}`);
    console.log(`🌐 Modo: ${process.env.NODE_ENV || 'development'}`);
    console.log("========================================");
  });
}

startServer();
