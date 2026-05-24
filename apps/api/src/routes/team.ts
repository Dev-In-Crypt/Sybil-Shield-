import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, invites, teamMembers } from "../db/index.js";
import { writeAudit } from "../services/audit.js";

const InviteBody = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
});

const PatchBody = z.object({
  role: z.enum(["admin", "member", "viewer"]).optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

const TOKEN_TTL_DAYS = 14;

function hashToken(t: string): string {
  return createHash("sha256").update(t).digest("hex");
}

export async function teamRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/team", async (req, reply) => {
    const members = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.customerId, req.customer!.id));
    return reply.send({
      data: members.map((m) => ({
        id: m.id,
        email: m.userEmail,
        role: m.role,
        status: m.status,
        joined_at: m.joinedAt,
        invited_at: m.createdAt,
      })),
    });
  });

  app.post("/v1/team/invites", async (req, reply) => {
    const parsed = InviteBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_body", details: parsed.error.flatten() });
    const { email, role } = parsed.data;
    // upsert team member row
    const existing = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.customerId, req.customer!.id), eq(teamMembers.userEmail, email)));
    if (existing.length) {
      return reply.code(409).send({ error: "already_member", status: existing[0]!.status });
    }
    const [member] = await db
      .insert(teamMembers)
      .values({
        customerId: req.customer!.id,
        userEmail: email,
        role,
        status: "invited",
        invitedBy: req.customer!.id,
      })
      .returning();
    const rawToken = `inv_${randomBytes(24).toString("base64url")}`;
    const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 3600 * 1000);
    await db.insert(invites).values({
      teamMemberId: member!.id,
      tokenHash: hashToken(rawToken),
      expiresAt,
    });
    return reply.code(201).send({
      member: { id: member!.id, email, role, status: "invited" },
      invite: {
        token: rawToken,
        accept_url: `${process.env.WEB_PUBLIC_URL ?? "http://localhost:3000"}/team/accept?token=${rawToken}`,
        expires_at: expiresAt,
        warning: "Send this URL to the invitee. We don't email it automatically yet.",
      },
    });
  });

  app.patch<{ Params: { id: string }; Body: z.infer<typeof PatchBody> }>("/v1/team/members/:id", async (req, reply) => {
    const parsed = PatchBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_body" });
    const patch: Record<string, unknown> = {};
    if (parsed.data.role) patch.role = parsed.data.role;
    if (parsed.data.status) patch.status = parsed.data.status;
    const [row] = await db
      .update(teamMembers)
      .set(patch)
      .where(and(eq(teamMembers.id, req.params.id), eq(teamMembers.customerId, req.customer!.id)))
      .returning();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return reply.send({ id: row.id, role: row.role, status: row.status });
  });

  app.delete<{ Params: { id: string } }>("/v1/team/members/:id", async (req, reply) => {
    const [row] = await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.id, req.params.id), eq(teamMembers.customerId, req.customer!.id)))
      .returning();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return reply.code(204).send();
  });
}

/** Public route: accept an invite. Not part of authed scope. */
export async function publicTeamRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { token: string } }>("/v1/team/invites/:token/accept", async (req, reply) => {
    const tokenHash = hashToken(req.params.token);
    const [inv] = await db.select().from(invites).where(eq(invites.tokenHash, tokenHash));
    if (!inv) return reply.code(404).send({ error: "invite_not_found_or_expired" });
    if (inv.acceptedAt) return reply.code(409).send({ error: "already_accepted" });
    if (inv.expiresAt < new Date()) return reply.code(410).send({ error: "expired" });
    const now = new Date();
    await db.update(invites).set({ acceptedAt: now }).where(eq(invites.id, inv.id));
    const [member] = await db
      .update(teamMembers)
      .set({ status: "active", joinedAt: now })
      .where(eq(teamMembers.id, inv.teamMemberId))
      .returning();
    if (!member) return reply.code(404).send({ error: "member_missing" });
    await writeAudit({
      analysisId: "00000000-0000-0000-0000-000000000000",
      address: "",
      chain: "",
      eventType: "confirmed",
      actor: `team:accept:${member.userEmail}`,
      reason: `joined team for customer ${member.customerId}`,
    });
    return reply.send({
      ok: true,
      member: { email: member.userEmail, role: member.role, customer_id: member.customerId },
    });
  });
}
