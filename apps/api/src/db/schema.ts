import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ============================================================
// CUSTOMERS & AUTH
// ============================================================
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name"),
  company: text("company"),
  plan: text("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  apiKeyHash: text("api_key_hash").unique(),
  apiKeyPrefix: text("api_key_prefix"),
  apiCallsThisMonth: integer("api_calls_this_month").notNull().default(0),
  apiCallsLimit: integer("api_calls_limit").notNull().default(100),
  webhookUrl: text("webhook_url"),
  webhookSecret: text("webhook_secret"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// MODEL VERSIONS
// ============================================================
export const modelVersions = pgTable("model_versions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  version: text("version").notNull().unique(),
  modelArtifactUrl: text("model_artifact_url").notNull(),
  featureSchemaHash: text("feature_schema_hash").notNull(),
  trainingManifestHash: text("training_manifest_hash").notNull(),
  evalMetrics: jsonb("eval_metrics").notNull(),
  trainedAt: timestamp("trained_at", { withTimezone: true }).notNull(),
  deployedAt: timestamp("deployed_at", { withTimezone: true }),
  retiredAt: timestamp("retired_at", { withTimezone: true }),
});

// ============================================================
// ANALYSES
// ============================================================
export const analyses = pgTable(
  "analyses",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    name: text("name").notNull(),
    status: text("status").notNull().default("pending"),
    chains: text("chains").array().notNull(),
    addressCount: integer("address_count").notNull(),
    addressesFileUrl: text("addresses_file_url"),
    sensitivity: text("sensitivity").default("balanced"),
    includeEvidence: boolean("include_evidence").default(true),
    // preset = airdrop|dao|grant|balanced — drives computeDecision()
    // mode = full|cluster_only — when cluster_only, ML scoring is skipped
    preset: text("preset").default("balanced"),
    mode: text("mode").default("full"),
    totalScored: integer("total_scored"),
    sybilCount: integer("sybil_count"),
    suspiciousCount: integer("suspicious_count"),
    genuineCount: integer("genuine_count"),
    // Decision counts (preset-aware). dropCount + reviewCount + keepCount
    // should equal totalScored. Old sybil/suspicious/genuine kept for
    // backwards compatibility with callers that don't use presets.
    dropCount: integer("drop_count"),
    reviewCount: integer("review_count"),
    keepCount: integer("keep_count"),
    clusterCount: integer("cluster_count"),
    largestClusterSize: integer("largest_cluster_size"),
    cuConsumed: bigint("cu_consumed", { mode: "number" }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    processingTimeSeconds: integer("processing_time_seconds"),
    resultsFileUrl: text("results_file_url"),
    reportUrl: text("report_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    customerIdx: index("idx_analyses_customer").on(t.customerId),
    statusIdx: index("idx_analyses_status").on(t.status),
  }),
);

// ============================================================
// ANALYSIS RUNS
// ============================================================
export const analysisRuns = pgTable(
  "analysis_runs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    analysisId: uuid("analysis_id")
      .notNull()
      .references(() => analyses.id, { onDelete: "cascade" }),
    modelVersionId: uuid("model_version_id")
      .notNull()
      .references(() => modelVersions.id),
    isPrimary: boolean("is_primary").default(true),
    cuConsumed: bigint("cu_consumed", { mode: "number" }),
    costUsd: numeric("cost_usd", { precision: 10, scale: 2 }),
    pipelineConfig: jsonb("pipeline_config"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    analysisIdx: index("idx_runs_analysis").on(t.analysisId),
  }),
);

// ============================================================
// ADDRESS SCORES
// ============================================================
export const addressScores = pgTable(
  "address_scores",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    analysisId: uuid("analysis_id")
      .notNull()
      .references(() => analyses.id, { onDelete: "cascade" }),
    runId: uuid("run_id").references(() => analysisRuns.id),
    address: text("address").notNull(),
    chain: text("chain").notNull(),
    sybilScore: integer("sybil_score").notNull(),
    confidence: numeric("confidence", { precision: 4, scale: 3 }),
    label: text("label").notNull(),
    clusterId: text("cluster_id"),
    clusterSize: integer("cluster_size"),
    // Decision = DROP|REVIEW|KEEP — computed at worker time using the
    // analysis's preset. Null when the analysis ran in cluster_only mode
    // (no per-address verdict, just cluster membership).
    decision: text("decision"),
    decisionConfidence: text("decision_confidence"),
    rationaleCodes: text("rationale_codes").array(),
    features: jsonb("features").notNull(),
    evidence: jsonb("evidence"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    analysisIdx: index("idx_scores_analysis").on(t.analysisId),
    addressIdx: index("idx_scores_address").on(t.address, t.chain),
    clusterIdx: index("idx_scores_cluster").on(t.clusterId),
    labelIdx: index("idx_scores_label").on(t.analysisId, t.label),
    decisionIdx: index("idx_scores_decision").on(t.analysisId, t.decision),
  }),
);

// ============================================================
// CLUSTERS
// ============================================================
export const clusters = pgTable("clusters", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  clusterId: text("cluster_id").notNull(),
  size: integer("size").notNull(),
  detectionMethod: text("detection_method").notNull(),
  avgSybilScore: numeric("avg_sybil_score", { precision: 5, scale: 2 }),
  commonFundingSource: text("common_funding_source"),
  commonPattern: text("common_pattern"),
  temporalWindow: text("temporal_window"),
  evidenceSummary: text("evidence_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// KNOWN ENTITIES (cross-analysis intelligence)
// ============================================================
export const knownEntities = pgTable(
  "known_entities",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    address: text("address").notNull(),
    chain: text("chain").notNull(),
    entityLabel: text("entity_label"),
    firstSeenAnalysis: uuid("first_seen_analysis").references(() => analyses.id),
    timesFlagged: integer("times_flagged").default(1),
    avgScore: numeric("avg_score", { precision: 5, scale: 2 }),
    source: text("source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    addressChainIdx: uniqueIndex("idx_known_entity").on(t.address, t.chain),
  }),
);

// ============================================================
// FEATURE STORE
// ============================================================
export const featureStore = pgTable(
  "feature_store",
  {
    address: text("address").notNull(),
    chain: text("chain").notNull(),
    features: jsonb("features").notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.address, t.chain] }),
  }),
);

// ============================================================
// EVIDENCE AUDIT LOG
// ============================================================
export const evidenceAuditLog = pgTable(
  "evidence_audit_log",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    analysisId: uuid("analysis_id")
      .notNull()
      .references(() => analyses.id),
    address: text("address").notNull(),
    chain: text("chain").notNull(),
    eventType: text("event_type").notNull(),
    actor: text("actor").notNull(),
    priorScore: integer("prior_score"),
    newScore: integer("new_score"),
    reason: text("reason"),
    evidenceSnapshot: jsonb("evidence_snapshot"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    addressIdx: index("idx_audit_address").on(t.address, t.chain),
    analysisIdx: index("idx_audit_analysis").on(t.analysisId),
  }),
);

// ============================================================
// CUSTOMER FEEDBACK (FP/FN reports)
// ============================================================
export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  // Nullable: public appeals (no auth) have no customer_id. Customer-submitted
  // feedback always sets this.
  customerId: uuid("customer_id").references(() => customers.id),
  analysisId: uuid("analysis_id").references(() => analyses.id),
  address: text("address").notNull(),
  chain: text("chain").notNull(),
  verdict: text("verdict").notNull(),
  evidence: text("evidence"),
  source: text("source").notNull().default("customer"), // 'customer' | 'public_appeal'
  reviewed: boolean("reviewed").default(false),
  promotedToLabelTier: text("promoted_to_label_tier"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// NOTIFICATIONS (in-app inbox)
// ============================================================
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    custIdx: index("idx_notif_cust").on(t.customerId, t.readAt),
  }),
);

// ============================================================
// WEBHOOK DELIVERIES (log + retry)
// ============================================================
export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    analysisId: uuid("analysis_id").references(() => analyses.id, { onDelete: "set null" }),
    url: text("url").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    statusCode: integer("status_code"),
    responseBody: text("response_body"),
    error: text("error"),
    attempts: integer("attempts").notNull().default(1),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    custIdx: index("idx_wh_cust").on(t.customerId, t.sentAt),
  }),
);

// ============================================================
// TEAM MEMBERS + INVITES
// ============================================================
export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    role: text("role").notNull().default("member"),
    status: text("status").notNull().default("invited"),
    invitedBy: uuid("invited_by"),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    custEmail: uniqueIndex("idx_team_cust_email").on(t.customerId, t.userEmail),
  }),
);

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    teamMemberId: uuid("team_member_id")
      .notNull()
      .references(() => teamMembers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

// ============================================================
// WATCHLIST (per-customer saved addresses)
// ============================================================
export const watchlist = pgTable(
  "watchlist",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    address: text("address").notNull(),
    chain: text("chain").notNull(),
    label: text("label"),
    alertOnChange: boolean("alert_on_change").notNull().default(false),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("idx_watch_uniq").on(t.customerId, t.address, t.chain),
  }),
);

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Analysis = typeof analyses.$inferSelect;
export type AddressScore = typeof addressScores.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type Invite = typeof invites.$inferSelect;
export type Watchlist = typeof watchlist.$inferSelect;
