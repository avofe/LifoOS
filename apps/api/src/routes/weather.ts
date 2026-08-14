import { Router } from "express";
import { fetchWeather } from "../lib/weather";

export function weatherRouter(): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    try {
      const weather = await fetchWeather();
      if (!weather) {
        res.status(503).json({ error: "Weather data unavailable" });
        return;
      }
      res.json(weather);
    } catch (err) {
      console.error("[weather] GET /", err);
      res.status(500).json({ error: "Failed to fetch weather" });
    }
  });

  return router;
}
