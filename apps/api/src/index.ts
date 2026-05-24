import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import rawBody from "fastify-raw-body";
import { requireApiKey } from "./middleware/auth.js";
import { analysesRoutes } from "./routes/analyses.js";
import { appealsRoutes } from "./routes/appeals.js";
import { authedAccountRoutes, publicAuthRoutes } from "./routes/auth.js";
import { billingRoutes } from "./routes/billing.js";
import { feedbackRoutes } from "./routes/feedback.js";
import { notificationsRoutes } from "./routes/notifications.js";
import { scoringRoutes } from "./routes/scoring.js";
import { publicTeamRoutes, teamRoutes } from "./routes/team.js";
import { watchlistRoutes } from "./routes/watchlist.js";
import { webhookDeliveriesRoutes } from "./routes/webhook-deliveries.js";

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
    trustProxy: true,
  });

  await app.register(rawBody, {
    field: "rawBody",
    global: false,
    encoding: false,
    runFirst: true,
  });
  await app.register(cors, { origin: true });
  await app.register(rateLimit, {
    global: false,
    max: 100,
    timeWindow: "1 minute",
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "sybilshield-api",
    time: new Date().toISOString(),
  }));

  // Public routes (no auth)
  await app.register(publicAuthRoutes);
  await app.register(appealsRoutes);
  await app.register(publicTeamRoutes);

  // Authenticated routes
  await app.register(async (instance) => {
    instance.addHook("preHandler", requireApiKey);
    await instance.register(authedAccountRoutes);
    await instance.register(analysesRoutes);
    await instance.register(scoringRoutes);
    await instance.register(feedbackRoutes);
    await instance.register(billingRoutes);
    await instance.register(notificationsRoutes);
    await instance.register(webhookDeliveriesRoutes);
    await instance.register(teamRoutes);
    await instance.register(watchlistRoutes);
  });

  return app;
}

async function main() {
  const app = await buildServer();
  const port = Number(process.env.API_PORT ?? 3001);
  const host = process.env.API_HOST ?? "0.0.0.0";
  try {
    await app.listen({ port, host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
