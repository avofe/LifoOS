import https from "https";
import { prisma } from "@lifeos/db";
import { USER_ID } from "../index";

const CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";

function formatUptime(startedAt: Date): string {
  const diff = Date.now() - startedAt.getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}ч ${minutes}м`;
  return `${minutes}м`;
}

export async function fetchStreams(): Promise<any[]> {
  const integ = await prisma.integration.findUnique({
    where: { userId_service: { userId: USER_ID, service: "twitch" } },
  });

  const streamers = (integ?.config as any)?.streamers ?? [];

  if (streamers.length === 0) return [];

  const logins = streamers.map((s: any) => `"${s.login}"`).join(",");
  const query = `query{users(logins:[${logins}]){id login displayName stream{title game{name}viewersCount createdAt type}}}`;
  const body = JSON.stringify({ query });

  const raw = await new Promise<string>((resolve, reject) => {
    const r = https.request(
      {
        hostname: "gql.twitch.tv",
        path: "/gql",
        method: "POST",
        headers: {
          "Client-ID": CLIENT_ID,
          "Content-Type": "application/json",
          Origin: "https://www.twitch.tv",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: 10000,
      },
      (resp) => {
        let d = "";
        resp.on("data", (c) => (d += c));
        resp.on("end", () => resolve(d));
      }
    );
    r.on("error", reject);
    r.on("timeout", () => {
      r.destroy();
      reject(new Error("timeout"));
    });
    r.write(body);
    r.end();
  });

  const json = JSON.parse(raw);

  if (json.errors) {
    throw new Error(`Twitch error: ${JSON.stringify(json.errors)}`);
  }

  const users = json.data?.users ?? [];
  return users
    .filter((u: any) => u?.login)
    .map((u: any) => ({
      id: u.id,
      login: u.login,
      displayName: u.displayName,
      online: u.stream !== null && u.stream.type === "live",
      title: u.stream?.title ?? null,
      game: u.stream?.game?.name ?? null,
      viewers: u.stream?.viewersCount ?? 0,
      startedAt: u.stream?.createdAt ?? null,
      uptime: u.stream ? formatUptime(new Date(u.stream.createdAt)) : null,
    }));
}
