import { findMockAuthUser, getMockData } from "./mockRepository";
import {
  getRuntimeAgents,
  patchRuntimeAgent,
  removeRuntimeAgent,
  upsertRuntimeAgent,
  type MockRuntimeAgent,
} from "./mockRuntimeStore";

function ok<T>(data: T, extra: Record<string, unknown> = {}) {
  return { success: true, data, ...extra };
}

function fail(message: string, status = 400) {
  return { success: false as const, message, status };
}

function stripBase(url: string): { pathname: string; search: string } {
  try {
    const parsed = new URL(url, "http://localhost");
    let pathname = parsed.pathname;
    const avatarIdx = pathname.indexOf("/api/avatar");
    if (avatarIdx >= 0) {
      pathname = pathname.slice(avatarIdx + "/api/avatar".length) || "/";
    }
    return { pathname, search: parsed.search };
  } catch {
    const [path, qs] = url.split("?");
    return { pathname: path.startsWith("/") ? path : `/${path}`, search: qs ? `?${qs}` : "" };
  }
}

function parseBody(init?: RequestInit): Record<string, unknown> {
  if (!init?.body || typeof init.body !== "string") return {};
  try {
    return JSON.parse(init.body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function getBearerToken(init?: RequestInit): string {
  const headers = init?.headers;
  if (!headers) return "";
  if (headers instanceof Headers) {
    return String(headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  }
  if (Array.isArray(headers)) {
    const hit = headers.find(([k]) => k.toLowerCase() === "authorization");
    return String(hit?.[1] || "").replace(/^Bearer\s+/i, "").trim();
  }
  const record = headers as Record<string, string>;
  const value =
    record.Authorization ||
    record.authorization ||
    Object.entries(record).find(([k]) => k.toLowerCase() === "authorization")?.[1] ||
    "";
  return String(value).replace(/^Bearer\s+/i, "").trim();
}

function buildSubscriptionPayload(userEmail?: string) {
  const mock = getMockData();
  const authUser =
    (userEmail
      ? mock.auth.users.find((u) => u.email.toLowerCase() === userEmail.toLowerCase())
      : null) ??
    mock.auth.users[0];

  const plan = (authUser?.subscription ?? {
    id: 1,
    plan_name: "Studio Pro",
    status: "active",
    billing_cycle: "monthly",
  }) as Record<string, unknown>;

  return {
    subscribed: true,
    subscription: {
      ...plan,
      worker_limit: Number(plan.worker_limit ?? 25),
      status: plan.status ?? "active",
      plan_name: plan.plan_name ?? "Studio Pro",
      stripe_price: plan.stripe_price ?? "price_mock_pro",
    },
  };
}

function listAllAgents(): MockRuntimeAgent[] {
  const seed = getMockData().agents as MockRuntimeAgent[];
  const runtime = getRuntimeAgents();
  const map = new Map<string, MockRuntimeAgent>();
  for (const agent of seed) {
    const key = String(agent.agent_unique_id || agent.id);
    map.set(key, { ...agent });
  }
  for (const agent of runtime) {
    const key = String(agent.agent_unique_id || agent.id);
    map.set(key, { ...(map.get(key) ?? {}), ...agent });
  }
  return Array.from(map.values()).filter((agent) => agent.status !== "deleted" && !agent.deleted);
}

function findAgent(agentId: string): MockRuntimeAgent | undefined {
  return listAllAgents().find(
    (agent) =>
      String(agent.agent_unique_id) === agentId ||
      String(agent.id) === agentId
  );
}

function studioEnvelope() {
  const mock = getMockData();
  return {
    studio: { can_access: true, enabled: true },
    team: { enabled: true, can_access: true },
    feature: {
      studio: { can_access: true, enabled: true },
      team: {
        enabled: true,
        role: "owner",
        permissions: {
          can_manage_team: true,
          can_edit_workers: true,
          can_view_billing: true,
        },
      },
    },
    ...mock.studioUser,
  };
}

/**
 * Route mock HTTP requests against mock-data.json (+ localStorage runtime agents).
 */
export async function handleMockHttpRequest(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url =
    typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method ?? "GET").toUpperCase();
  const { pathname, search } = stripBase(url);
  const body = parseBody(init);
  const mock = getMockData();
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  // --- Auth ---
  if (method === "POST" && (pathname === "/login" || pathname.endsWith("/login"))) {
    const email = String(body.email ?? "");
    const password = String(body.password ?? "");
    const user = findMockAuthUser(email, password);
    if (!user) {
      return json(fail("Invalid email or password", 401), 401);
    }
    return json(
      ok({
        token: user.token,
        user: {
          ...user.user,
          ...(user.subscription ? { subscription: user.subscription } : {}),
        },
      })
    );
  }

  if (method === "POST" && (pathname === "/signup" || pathname.includes("/signup"))) {
    const email = String(body.email ?? `user-${Date.now()}@qiko.local`);
    const token = `mock-signup-token-${Date.now()}`;
    return json(
      ok({
        token,
        user: {
          id: String(Date.now()),
          email,
          user_name: String(body.user_name ?? "New User"),
          name: String(body.user_name ?? "New User"),
          team_member_role: "owner",
        },
      })
    );
  }

  if (method === "POST" && (pathname === "/logout" || pathname.endsWith("/logout"))) {
    return json(ok({ success: true }));
  }

  if (method === "POST" && pathname.includes("forgot-password")) {
    return json(ok({ message: "If the email exists, a reset link was sent (mock)." }));
  }

  if (method === "POST" && pathname.includes("reset-password")) {
    return json(
      ok({
        token: "mock-reset-session-token",
        user: mock.auth.users[0]?.user ?? { email: body.email },
      })
    );
  }

  // --- Subscription (critical for Upgrade Now gates) ---
  if (pathname.includes("/subscription/plans") || pathname.endsWith("/subscription/plans")) {
    return json({
      success: true,
      data: {
        plans: [
          {
            id: "plan_studio_starter",
            name: "Starter",
            price_id: "price_mock_starter",
            amount: 0,
            display_price: 0,
            interval: "month",
            currency: "usd",
            feature: '["1 worker","Studio access"]',
          },
          {
            id: "plan_studio_pro",
            name: "Pro",
            price_id: "price_mock_pro",
            amount: 9900,
            display_price: 99,
            interval: "month",
            currency: "usd",
            feature: '["25 workers","Studio access","Team"]',
          },
          {
            id: "plan_studio_premium",
            name: "Premium",
            price_id: "price_mock_premium",
            amount: 19900,
            display_price: 199,
            interval: "month",
            currency: "usd",
            feature: '["Unlimited workers","Priority support"]',
          },
        ],
      },
    });
  }

  if (pathname.includes("/subscription/checkout")) {
    return json(ok({ checkout_url: "/app?mock_checkout=1" }));
  }

  if (pathname.includes("/subscription/portal")) {
    return json(ok({ portal_url: "/app/pricing?mock_portal=1" }));
  }

  if (
    method === "GET" &&
    (pathname === "/subscription" ||
      pathname.endsWith("/subscription") ||
      pathname.includes("/subscription/current"))
  ) {
    const token = getBearerToken(init);
    const authUser =
      mock.auth.users.find((u) => u.token === token) ?? mock.auth.users[0];
    return json(ok(buildSubscriptionPayload(authUser?.email)));
  }

  // --- User context / studio ---
  if (pathname.includes("/user/context")) {
    const token = getBearerToken(init);
    const authUser =
      mock.auth.users.find((u) => u.token === token) ?? mock.auth.users[0];
    return json(
      ok({
        user: authUser?.user ?? mock.studioUser,
        ...studioEnvelope(),
      })
    );
  }

  if (pathname === "/user/studio" || pathname.endsWith("/user/studio")) {
    // Consumers read studioUser.data.data.studio.can_access
    return json({
      success: true,
      data: studioEnvelope(),
    });
  }

  // --- Create worker / handle check ---
  if (method === "POST" && (pathname === "/create" || pathname.endsWith("/create"))) {
    const agentUniqueId =
      String(body.oliv_id || body.agent_unique_id || "").trim() ||
      `mock-agent-${Date.now()}`;
    const agentName =
      String(body.agent_name || body.user_name || "New Worker").trim() || "New Worker";
    const industry = String(body.industry || "sales_intelligence");
    const specialization = String(body.specialization || "Sales Intelligence");
    const created: MockRuntimeAgent = {
      id: agentUniqueId,
      agent_unique_id: agentUniqueId,
      agent_name: agentName,
      user_name: String(body.user_name || agentName),
      email: String(body.email || "admin@qiko.local"),
      status: "training",
      studio_linked: Boolean(body.studio_linked),
      industry,
      specialization,
      template: String(body.template || industry),
      created_at: new Date().toISOString(),
      professionalTitle: specialization,
    };
    upsertRuntimeAgent(created);
    return json(
      ok({
        agent_unique_id: agentUniqueId,
        id: agentUniqueId,
        user_name: created.user_name,
        oliv_id: agentUniqueId,
        email: created.email,
        agent_name: agentName,
        status: "training",
        industry,
        specialization,
        studio_linked: created.studio_linked,
      })
    );
  }

  // --- Agents list ---
  if (
    method === "GET" &&
    (pathname === "/agents" ||
      pathname.endsWith("/agents") ||
      pathname.includes("get-agents"))
  ) {
    return json(ok(listAllAgents()));
  }

  // --- Agent details ---
  if (method === "GET" && pathname.includes("/details")) {
    const agentId = params.get("agent_unique_id") || pathname.split("/").pop() || "";
    const agent = findAgent(agentId) ?? listAllAgents()[0];
    return json(ok(agent ?? {}));
  }

  if (method === "GET" && pathname.includes("/details-multiple")) {
    return json(ok({ agents: listAllAgents() }));
  }

  // --- Studio linked toggle ---
  if (pathname.includes("/studio-linked") && (method === "PUT" || method === "PATCH")) {
    const parts = pathname.split("/");
    const agentId = decodeURIComponent(parts[parts.indexOf("agent") + 1] || "");
    const studioLinked = Boolean(body.studio_linked);
    const existing = findAgent(agentId);
    const patched =
      patchRuntimeAgent(agentId, { studio_linked: studioLinked }) ||
      (existing
        ? upsertRuntimeAgent({ ...existing, studio_linked: studioLinked })
        : null);
    return json({
      success: true,
      message: "Studio link updated",
      studio_linked: patched?.studio_linked ?? studioLinked,
      data: patched,
    });
  }

  // --- Agent status ---
  if (pathname.includes("/status") && pathname.includes("/agent/") && method === "PUT") {
    const parts = pathname.split("/");
    const agentId = decodeURIComponent(parts[parts.indexOf("agent") + 1] || "");
    const status = params.get("status") || String(body.status || "ready");
    const existing = findAgent(agentId);
    if (existing) {
      upsertRuntimeAgent({ ...existing, status });
    }
    return json(ok({ status, agent_unique_id: agentId }));
  }

  // --- Delete agent ---
  if (method === "DELETE" && pathname.includes("/agent/")) {
    const parts = pathname.split("/").filter(Boolean);
    const agentId = decodeURIComponent(parts[parts.length - 1] || "");
    removeRuntimeAgent(agentId);
    // Also hide seed agents by marking deleted in runtime
    const seed = findAgent(agentId);
    if (seed) {
      upsertRuntimeAgent({ ...seed, status: "deleted", deleted: true });
    }
    return json(ok({ deleted: true }));
  }

  // Filter deleted from list is better:
  // (re-handled above in listAllAgents - add filter)

  // --- Behaviors / faqs / websites / policies / documents ---
  if (
    pathname.includes("/behaviors") ||
    pathname.includes("/faqs") ||
    pathname.includes("/websites") ||
    pathname.includes("/policies") ||
    pathname.includes("/documents") ||
    pathname.includes("/chat-history") ||
    pathname.includes("/add-knowledge") ||
    pathname.includes("/upload-document")
  ) {
    if (method === "GET") {
      return json(ok({ items: [], data: [], documents: [], messages: [], conversations: [] }));
    }
    return json(ok({ id: Date.now(), success: true }));
  }

  // --- Team ---
  if (pathname.includes("/team")) {
    if (method === "GET") {
      return json(
        ok({
          team: { id: 1, name: "Qiko Studio", owner_user_id: 1 },
          members: mock.team.members,
        })
      );
    }
    return json(ok({ id: Date.now(), success: true }));
  }

  // --- IDG worker (external) soft mocks ---
  if (pathname.includes("/worker/knowledge/rfp") || pathname.includes("/worker/knowledge/base")) {
    if (pathname.includes("pack-by-id") || pathname.includes("/files")) {
      return json({
        success: true,
        data: {
          sections: mock.rfp?.sections ?? [],
          files: [],
        },
        sections: mock.rfp?.sections ?? [],
        files: [],
      });
    }
    return json({ success: true, data: {}, message: "Mock IDG success" });
  }

  // --- Essential Living soft mocks ---
  if (
    pathname.includes("/api/files") ||
    pathname.includes("/api/chat") ||
    pathname.includes("/api/user") ||
    pathname.includes("/api/index-batch")
  ) {
    return json({
      success: true,
      files: [],
      message: "Mock EL response",
      reply: "Mock finance insight based on portfolio sample data.",
      properties: mock.financial.properties,
      stats: mock.financial.stats,
      done: true,
      indexed: true,
    });
  }

  // --- FCM token (no-op in mock) ---
  if (pathname.includes("/user/fcm-token") || pathname.includes("/fcm-token")) {
    return json(ok({ deviceToken: { registered: true } }));
  }

  // --- IDG Sales ---
  if (pathname.includes("/idg-sales/")) {
    return json(routeIdgSales(pathname, method, body, mock));
  }

  // --- CRM / chat / voice soft success ---
  if (
    pathname.includes("/crm") ||
    pathname.includes("contacts") ||
    pathname.includes("/voice/") ||
    pathname.includes("/gmail") ||
    pathname.includes("/calendly") ||
    pathname.includes("/slack") ||
    pathname.includes("/clickup") ||
    pathname.includes("/vapi")
  ) {
    return json(ok({ contacts: mock.crm.contacts, success: true }));
  }

  // Default: empty success so UI does not hard-fail in mock mode
  if (import.meta.env.DEV) {
    console.warn(`[mockHttp] Unhandled ${method} ${pathname} — returning empty success`);
  }
  return json(ok({}));
}

function routeIdgSales(
  pathname: string,
  method: string,
  body: Record<string, unknown>,
  mock: ReturnType<typeof getMockData>
): unknown {
  const si = mock.salesIntel;

  if (pathname.endsWith("/sources") && method === "GET") {
    return ok({
      sources: si.sources.map(toApiSource),
    });
  }

  if (pathname.includes("/sources/") && method === "PATCH") {
    const key = pathname.split("/sources/")[1]?.split("/")[0]?.toLowerCase();
    const source = si.sources.find((s) => String(s.sourceKey).toLowerCase() === key);
    return ok({ source: source ? toApiSource({ ...source, ...body }) : source });
  }

  if (pathname.includes("/ingest-filters")) {
    if (method === "GET") return ok({ ingestFilters: si.ingestFilters });
    return ok({ ingestFilters: { ...si.ingestFilters, ...body } });
  }

  if (pathname.includes("/opportunities") && method === "GET" && !/\/opportunities\/\d+/.test(pathname)) {
    const archived = pathname.includes("archived");
    const opps = si.opportunities.filter((o) =>
      archived ? o.stage === "archived" : o.stage !== "archived"
    );
    return ok({ opportunities: opps.map(toApiOpportunity) });
  }

  if (/\/opportunities\/[^/]+$/.test(pathname) && method === "GET") {
    const id = pathname.split("/").pop();
    const opp = si.opportunities.find((o) => String(o.id) === id) ?? si.opportunities[0];
    return ok({ opportunity: toApiOpportunity(opp) });
  }

  if (pathname.includes("/activity-logs") && method === "GET") {
    return ok({ activityLogs: si.activityLogs });
  }

  if (pathname.includes("/scan-history") && method === "GET") {
    return ok({
      scanHistory: si.scanHistory,
      summary: {
        recentScans: si.scanHistory.length,
        successful: si.scanHistory.filter((s) => s.status === "success").length,
        failed: si.scanHistory.filter((s) => s.status === "failed").length,
        successRate: 0.75,
      },
    });
  }

  if (pathname.includes("/decision-history") && method === "GET") {
    return ok({
      decisionHistory: si.decisionHistory,
      reviewers: mock.team.members
        .map((m) => m.user as { id?: number; user_name?: string; email?: string })
        .filter((u) => u?.id)
        .map((u) => ({ id: u.id, userName: u.user_name, email: u.email })),
    });
  }

  if (pathname.includes("/notifications") && method === "GET") {
    return ok({ notifications: si.notifications });
  }

  if (pathname.includes("/notifications") && (method === "PATCH" || method === "POST")) {
    return ok({});
  }

  if (pathname.includes("/salesforce/status")) {
    return ok({ salesforce: si.salesforce });
  }

  if (pathname.includes("/scan") && method === "POST") {
    return ok({
      summary: { created: 1, updated: 0, totalReturned: 1 },
      opportunities: si.opportunities.slice(0, 1).map(toApiOpportunity),
      pushNotifications: [],
    });
  }

  if (method === "PATCH" || method === "POST") {
    const idMatch = pathname.match(/\/opportunities\/([^/]+)/);
    const id = idMatch?.[1];
    const opp = si.opportunities.find((o) => String(o.id) === id) ?? si.opportunities[0];
    return ok({ opportunity: toApiOpportunity({ ...opp, ...body }), pushNotifications: [] });
  }

  return ok({});
}

function toApiSource(source: Record<string, unknown>) {
  return {
    id: source.id,
    source_key: source.sourceKey,
    name: source.name,
    type: source.type,
    status: source.isActive ? "active" : "inactive",
    can_scan: source.canScan,
    scan_cadence: source.scanCadence,
    last_scan_at: source.lastScanAt,
    next_scan_at: source.nextScanAt,
    last_scan_status: source.lastScanStatus,
    opportunities_found: source.opportunitiesFound,
  };
}

function toApiOpportunity(opp: Record<string, unknown>) {
  return {
    id: Number(opp.id) || opp.id,
    agent_id: opp.agentId,
    external_id: opp.externalId,
    title: opp.title,
    buyer: opp.buyer,
    source: opp.source,
    source_key: opp.sourceKey,
    country: opp.country,
    category: opp.category,
    estimated_value: opp.estimatedValue,
    currency: opp.currency,
    published_at: opp.publishedAt,
    deadline_at: opp.deadlineAt,
    stage: opp.stage,
    qualification_score: opp.qualificationScore,
    human_review_status: opp.humanReviewStatus,
    salesforce_push_status: opp.salesforcePushStatus,
    salesforce_opportunity_id: opp.salesforceOpportunityId,
    created_at: opp.createdAt,
    updated_at: opp.updatedAt,
  };
}
