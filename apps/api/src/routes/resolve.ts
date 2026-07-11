import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { isConfigured, resolveEnsName } from "../services/ens.js";

// Basic shape check before we spend an RPC call: label(.label)*.eth, lowercase
// or mixed case (ENS normalization is case-insensitive; viem's normalize()
// does the real UTS-46 validation once this passes).
const NameParam = z.object({
  name: z.string().regex(/^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/i),
});

/**
 * Public ENS name resolution — no API key required, matches the free
 * public-good posture of GET /v1/score/:address. Server-side only: the
 * Alchemy key never reaches the browser. Rate-limited separately from the
 * baseline unauthed limit because each call costs an outbound Alchemy RPC
 * call (abuse vector the plain DB-backed public routes don't have).
 */
export async function publicResolveRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { name: string } }>(
    "/v1/resolve/:name",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const parsed = NameParam.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_name", message: "expected a *.eth name" });
      }
      if (!isConfigured()) {
        return reply.code(503).send({ error: "ens_not_configured" });
      }

      try {
        const address = await resolveEnsName(parsed.data.name);
        if (!address) {
          return reply.code(404).send({ error: "not_registered", message: "no address record for this name" });
        }
        return reply.send({ name: parsed.data.name.toLowerCase(), address });
      } catch (err) {
        if (err instanceof Error && err.message === "ens_resolve_timeout") {
          return reply.code(504).send({ error: "ens_resolve_timeout" });
        }
        request.log.warn({ err, name: parsed.data.name }, "ens resolve failed");
        return reply.code(502).send({ error: "ens_resolve_failed" });
      }
    },
  );
}
