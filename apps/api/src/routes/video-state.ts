import { Router } from "express";
import { prisma } from "@lifeos/db";
import { USER_ID } from "../index";

export const videoStateRouter: Router = Router();

videoStateRouter.get("/watched", async (_req, res) => {
  try {
    const states = await prisma.userVideoState.findMany({
      where: { userId: USER_ID, watched: true },
      select: { videoId: true },
    });
    res.json(states.map((s) => s.videoId));
  } catch (err) {
    console.error("[video-state] GET /watched", err);
    res.status(500).json({ error: "Failed to fetch watched videos" });
  }
});

videoStateRouter.post("/watched", async (req, res) => {
  try {
    const { videoId, watched } = req.body as { videoId: string; watched: boolean };
    if (!videoId) {
      res.status(400).json({ error: "videoId is required" });
      return;
    }

    await prisma.userVideoState.upsert({
      where: { userId_videoId: { userId: USER_ID, videoId } },
      create: { userId: USER_ID, videoId, watched: watched ?? true },
      update: { watched: watched ?? true },
    });

    res.json({ videoId, watched: watched ?? true });
  } catch (err) {
    console.error("[video-state] POST /watched", err);
    res.status(500).json({ error: "Failed to update video state" });
  }
});

videoStateRouter.post("/watched/batch", async (req, res) => {
  try {
    const { videoIds } = req.body as { videoIds: string[] };
    if (!Array.isArray(videoIds)) {
      res.status(400).json({ error: "videoIds array is required" });
      return;
    }

    const data = videoIds.map((id) => ({
      userId: USER_ID,
      videoId: id,
      watched: true,
    }));

    await prisma.$transaction(
      data.map((d) =>
        prisma.userVideoState.upsert({
          where: { userId_videoId: { userId: USER_ID, videoId: d.videoId } },
          create: d,
          update: { watched: true },
        })
      )
    );

    res.json({ videoIds });
  } catch (err) {
    console.error("[video-state] POST /watched/batch", err);
    res.status(500).json({ error: "Failed to batch update" });
  }
});
