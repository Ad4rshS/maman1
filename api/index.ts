import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// API Proxy for Cricket Data
app.get("/api/cricket/score/:externalId", async (req, res) => {
  try {
    const { externalId } = req.params;
    const RAPID_API_KEY = process.env.VITE_RAPIDAPI_KEY;
    const RAPID_API_HOST = process.env.VITE_RAPIDAPI_HOST;

    if (!RAPID_API_KEY || !RAPID_API_HOST) {
      return res.status(500).json({ error: "Cricket API configuration missing on server" });
    }

    const url = `https://${RAPID_API_HOST}/mcenter/v1/${externalId}/hscard`;
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': RAPID_API_KEY,
        'x-rapidapi-host': RAPID_API_HOST
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: "Failed to fetch from RapidAPI", 
        status: response.status,
        details: errorText.substring(0, 500) 
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
});

app.get("/api/cricket/matches/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const RAPID_API_KEY = process.env.VITE_RAPIDAPI_KEY;
    const RAPID_API_HOST = process.env.VITE_RAPIDAPI_HOST;

    if (!RAPID_API_KEY || !RAPID_API_HOST) {
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
       return res.status(response.status).json({ error: "Failed to fetch matches", details: errorText.substring(0, 500) });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
});

export default app;
