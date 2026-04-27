import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Proxy for Cricket Data to avoid CORS and hide keys
  app.get("/api/cricket/score/:externalId", async (req, res) => {
    try {
      const { externalId } = req.params;
      const RAPID_API_KEY = process.env.VITE_RAPIDAPI_KEY;
      const RAPID_API_HOST = process.env.VITE_RAPIDAPI_HOST;

      console.log(`[API PROXY] Request for match ${externalId}`);

      if (!RAPID_API_KEY || !RAPID_API_HOST) {
        console.error("[API PROXY] Configuration missing: KEY=" + (RAPID_API_KEY ? "EXISTS" : "MISSING") + " HOST=" + (RAPID_API_HOST ? "EXISTS" : "MISSING"));
        return res.status(500).json({ error: "Cricket API configuration missing on server" });
      }

      const url = `https://${RAPID_API_HOST}/mcenter/v1/${externalId}/hscard`;
      console.log(`[API PROXY] Fetching from: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'x-rapidapi-key': RAPID_API_KEY,
          'x-rapidapi-host': RAPID_API_HOST
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[API PROXY] RapidAPI Error ${response.status}:`, errorText);
        return res.status(response.status).json({ 
          error: "Failed to fetch from RapidAPI", 
          status: response.status,
          details: errorText.substring(0, 500) 
        });
      }

      const data = await response.json();
      console.log(`[API PROXY] Successfully fetched data for ${externalId}`);
      res.json(data);
    } catch (error: any) {
      console.error("[API PROXY] Critical Error:", error.message);
      res.status(500).json({ error: "Internal Server Error", message: error.message });
    }
  });

  app.get("/api/cricket/matches/:type", async (req, res) => {
    try {
      const { type } = req.params; // live, upcoming
      const RAPID_API_KEY = process.env.VITE_RAPIDAPI_KEY;
      const RAPID_API_HOST = process.env.VITE_RAPIDAPI_HOST;

      console.log(`[API PROXY] Requesting matches of type ${type}`);

      if (!RAPID_API_KEY || !RAPID_API_HOST) {
        console.error("[API PROXY] Configuration missing for matches");
        return res.status(500).json({ error: "Cricket API configuration missing on server" });
      }

      const url = `https://${RAPID_API_HOST}/matches/v1/${type}`;
      const response = await fetch(url, {
        headers: {
          'x-rapidapi-key': RAPID_API_KEY,
          'x-rapidapi-host': RAPID_API_HOST
        }
      });

      if (!response.ok) {
         const errorText = await response.text();
         console.error(`[API PROXY] RapidAPI Matches Error ${response.status}:`, errorText);
         return res.status(response.status).json({ error: "Failed to fetch matches", details: errorText.substring(0, 500) });
      }

      const data = await response.json();
      console.log(`[API PROXY] Successfully fetched matches list for ${type}`);
      res.json(data);
    } catch (error: any) {
      console.error("[API PROXY] Critical Matches Error:", error.message);
      res.status(500).json({ error: "Internal Server Error", message: error.message });
    }
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
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
