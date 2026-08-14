import { Router } from "express";
import { prisma } from "@lifeos/db";
import { USER_ID } from "../index";
import { reinitGroq } from "../lib/gemini";
import { reinitYouTube } from "../lib/youtube";
import { setWeatherLocation } from "../lib/weather";
import { setTimezoneCache } from "../lib/time";
import { invalidateAppMeta } from "../lib/screentime";
import { validate, z } from "../validate";

const updateSettingsSchema = z.object({
  groqApiKey: z.string().optional(),
  youtubeApiKey: z.string().optional(),
  timezone: z.string().optional(),
  weatherLocation: z.string().optional(),
  screenLimitTotal: z.number().int().min(0).max(1440).nullable().optional(),
  screenLimitApps: z
    .record(z.string(), z.number().int().min(0).max(1440))
    .optional(),
  screenLimitDevices: z
    .record(z.string(), z.number().int().min(0).max(1440))
    .optional(),
  appAliases: z.record(z.string(), z.string().min(1).max(200)).optional(),
  appColors: z.record(z.string(), z.string().regex(/^#[0-9a-fA-F]{6}$/)).optional(),
});

export function createSettingsRouter(): Router {
  const router: Router = Router();

  router.get("/", async (_req, res) => {
    try {
      const settings = await prisma.setting.findMany({
        where: { userId: USER_ID },
      });

      const map: Record<string, any> = {};
      for (const s of settings) {
        map[s.key] = s.value;
      }

      res.json(map);
    } catch (err) {
      console.error("[settings] GET /", err);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  router.put("/", validate(updateSettingsSchema), async (req, res) => {
    try {
      const { groqApiKey, youtubeApiKey, timezone, weatherLocation, screenLimitTotal, screenLimitApps, screenLimitDevices, appAliases, appColors } = req.body;

      const upserts: Promise<any>[] = [];

      if (groqApiKey !== undefined) {
        upserts.push(
          prisma.setting.upsert({
            where: { userId_key: { userId: USER_ID, key: "groqApiKey" } },
            create: { userId: USER_ID, key: "groqApiKey", value: groqApiKey },
            update: { value: groqApiKey },
          })
        );
        reinitGroq(groqApiKey);
      }

      if (youtubeApiKey !== undefined) {
        upserts.push(
          prisma.setting.upsert({
            where: { userId_key: { userId: USER_ID, key: "youtubeApiKey" } },
            create: { userId: USER_ID, key: "youtubeApiKey", value: youtubeApiKey },
            update: { value: youtubeApiKey },
          })
        );
        reinitYouTube(youtubeApiKey);
      }

      if (weatherLocation !== undefined) {
        upserts.push(
          prisma.setting.upsert({
            where: { userId_key: { userId: USER_ID, key: "weatherLocation" } },
            create: { userId: USER_ID, key: "weatherLocation", value: weatherLocation },
            update: { value: weatherLocation },
          })
        );
        setWeatherLocation(weatherLocation);
      }

      if (timezone !== undefined) {
        upserts.push(
          prisma.setting.upsert({
            where: { userId_key: { userId: USER_ID, key: "timezone" } },
            create: { userId: USER_ID, key: "timezone", value: timezone },
            update: { value: timezone },
          })
        );
        setTimezoneCache(timezone);
      }

      if (screenLimitTotal !== undefined) {
        upserts.push(
          prisma.setting.upsert({
            where: { userId_key: { userId: USER_ID, key: "screenLimitTotal" } },
            create: { userId: USER_ID, key: "screenLimitTotal", value: screenLimitTotal },
            update: { value: screenLimitTotal },
          })
        );
      }

      if (screenLimitApps !== undefined) {
        upserts.push(
          prisma.setting.upsert({
            where: { userId_key: { userId: USER_ID, key: "screenLimitApps" } },
            create: { userId: USER_ID, key: "screenLimitApps", value: screenLimitApps },
            update: { value: screenLimitApps },
          })
        );
      }

      if (screenLimitDevices !== undefined) {
        upserts.push(
          prisma.setting.upsert({
            where: { userId_key: { userId: USER_ID, key: "screenLimitDevices" } },
            create: { userId: USER_ID, key: "screenLimitDevices", value: screenLimitDevices },
            update: { value: screenLimitDevices },
          })
        );
      }

      if (appAliases !== undefined) {
        upserts.push(
          prisma.setting.upsert({
            where: { userId_key: { userId: USER_ID, key: "appAliases" } },
            create: { userId: USER_ID, key: "appAliases", value: appAliases },
            update: { value: appAliases },
          })
        );
      }

      if (appColors !== undefined) {
        upserts.push(
          prisma.setting.upsert({
            where: { userId_key: { userId: USER_ID, key: "appColors" } },
            create: { userId: USER_ID, key: "appColors", value: appColors },
            update: { value: appColors },
          })
        );
      }

      await Promise.all(upserts);

      invalidateAppMeta();

      const settings = await prisma.setting.findMany({
        where: { userId: USER_ID },
      });
      const map: Record<string, any> = {};
      for (const s of settings) map[s.key] = s.value;

      res.json(map);
    } catch (err) {
      console.error("[settings] PUT /", err);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  return router;
}
