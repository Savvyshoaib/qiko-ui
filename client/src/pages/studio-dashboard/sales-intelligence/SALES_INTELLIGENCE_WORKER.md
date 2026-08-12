# Sales Intelligence Worker — Implementation Overview

This document describes the **Sales Intelligence Worker** implemented in the Qiko Studio dashboard. It covers the end-to-end user journey, screens, UI behaviour, mock data, state management, and feature flags.

---

## 1. What Was Built

The Sales Intelligence Worker is a **separate Studio worker** from the Pre Sales Writer Worker (IDG RFP workflow). It provides a mock end-to-end opportunity intelligence flow:

**Ingest → Qualify → Review → Validate → Push to Salesforce**

All data is **mock-only** (Redux + local seed data). No live portal or Salesforce APIs are connected yet.

### Key deliverables

| Area | Status |
|------|--------|
| Onboarding industry option | ✅ Complete |
| Studio landing section | ✅ Complete |
| Worker cockpit with sidebar navigation | ✅ Complete |
| Overview dashboard | ✅ Complete |
| Opportunity Pipeline (Kanban + List) | ✅ Complete |
| Drag-and-drop stage changes | ✅ Complete |
| Opportunity detail view | ✅ Complete |
| Document view / download | ✅ Complete |
| Ingestion (portal scan) | ✅ Complete |
| Review Queue screen | ✅ Built, hidden from sidebar |
| Salesforce Push Log | ✅ Complete |
| Right-side chat sidebar | ✅ Complete |
| Redux state layer | ✅ Complete |

---

## 2. How the Worker Is Accessed

### Onboarding

- Industry slug: `sales_intelligence`
- Display name: **Sales Intelligence Worker**
- Selected during worker creation in `Onboarding.tsx`

### Studio routing

- Workers are classified in `studioSections.ts` via `isSalesIntelligenceWorker()`
- Studio landing shows a dedicated **Sales Intelligence** section (separate from IDG Security / Pre Sales Writer)
- Opening a Sales Intelligence worker loads `WorkerCockpit` with `workerKey = "sales_intelligence"`

### Separation from Pre Sales Writer

| Worker | Slug | Purpose |
|--------|------|---------|
| Pre Sales Writer Worker | `pre_sales_writer_worker` | RFP upload, parsing, AI draft, knowledge base |
| Sales Intelligence Worker | `sales_intelligence` | Tender ingestion, qualification, pipeline, Salesforce push |

These workers do **not** share screens or navigation.

---

## 3. User Journey (End-to-End)

```
Deploy worker (Onboarding)
        ↓
Studio → Sales Intelligence section → Open worker cockpit
        ↓
Overview (KPIs)
        ↓
Ingestion → Run portal scan → New opportunity in "Ingested"
        ↓
Opportunity Pipeline → Drag card through stages OR open detail view
        ↓
Detail view → Run Qualification / Validate / Push to Salesforce
        ↓
View or download tender document
        ↓
Salesforce Push Log → Review success/failure history
```

### Typical mock workflow stages

1. **Ingested** — Opportunity discovered via portal scan or manual upload
2. **Qualifying** — AI qualification in progress
3. **Qualified** — AI score and reasons assigned
4. **Awaiting Review** — Human validation pending *(stage exists in data; kanban column hidden)*
5. **Validated** — Approved for Salesforce push
6. **Pushed** — Successfully synced to Salesforce (mock)
7. **Rejected / Push Failed** — Terminal failure states shown below the kanban

---

## 4. Cockpit Layout

The worker cockpit mirrors the Pre Sales Writer layout:

| Region | Description |
|--------|-------------|
| **Top bar** | Back to Studio, worker name, Active badge, Chat toggle |
| **Left sidebar** | Overview + Use Cases navigation |
| **Main content** | Active use case workspace + Outcomes strip |
| **Right sidebar** | Chat panel (toggleable, open by default) |

### Visible sidebar menu (current configuration)

| ID | Screen | Tag | Visible |
|----|--------|-----|---------|
| `si0` | Overview | DASHBOARD | ✅ |
| `si1` | Opportunity Pipeline | PIPELINE | ✅ |
| `si2` | Ingestion | SOURCES | ✅ |
| `si3` | Review Queue | REVIEW | ❌ Hidden (`hidden: true`) |
| `si4` | Salesforce Push Log | LOG | ✅ |

### Hidden UI elements (code retained, toggled off)

| Element | Flag / config | Location |
|---------|---------------|----------|
| Review Queue sidebar item | `hidden: true` on `si3` | `StudioDashboard.tsx` |
| Sidebar footer metrics | `showSidebarMetrics: false` | `StudioDashboard.tsx` |
| Awaiting Review kanban column | `PIPELINE_KANBAN_STAGES` | `salesIntelTypes.ts` |
| Manual Upload source card | `SHOW_MANUAL_INGESTION_UI = false` | `OpportunityIngestionView.tsx` |
| Manual Ingestion form | `SHOW_MANUAL_INGESTION_UI = false` | `OpportunityIngestionView.tsx` |

To re-enable any hidden element, flip the corresponding flag.

---

## 5. Screens & Functionality

### 5.1 Overview (`si0` — `SalesIntelDashboard.tsx`)

**Purpose:** High-level snapshot of opportunity intelligence activity.

**What the user sees:**
- Outcomes strip with KPIs (New Opportunities, Qualified, Awaiting Review, Pipeline Value)
- Introductory description panel

**Notes:**
- Detailed metric cards and Recent Activity list are commented out in code but can be re-enabled
- Data is computed live from Redux opportunities via `computeDashboardMetrics()`

---

### 5.2 Opportunity Pipeline (`si1` — `OpportunityListView.tsx` + sub-views)

**Purpose:** Primary workspace for managing opportunities through the sales funnel.

**Views:**
- **Pipeline** — Kanban board (`OpportunityPipelineView.tsx`)
- **List** — Sortable table of all opportunities (`OpportunityListView.tsx`)

**Kanban columns (visible):**
Ingested → Qualifying → Qualified → Validated → Pushed

**Kanban features:**
- ClickUp-style drag-and-drop between columns
- Column highlight on drag-over ("Drop here" on empty columns)
- Grip handle on cards; click opens detail view
- **Rejected / Failed** section below the board for terminal states
- Dragging from Rejected/Failed back into a column restores the opportunity

**Stage update on drop:**
Dispatches `moveOpportunityPipelineStage` which applies stage-specific side effects (qualification reset, review status, Salesforce fields, etc.)

**Detail view:**
Clicking any card opens `OpportunityDetailView.tsx` inline within the pipeline workspace.

---

### 5.3 Opportunity Detail (`OpportunityDetailView.tsx`)

**Purpose:** Full view of a single opportunity with actions and documents.

**Header actions:**
| Button | When shown | Action |
|--------|------------|--------|
| View Document | Always | Opens PDF preview modal |
| Download | Always | Downloads tender document |
| Run Qualification | `ingested` / `qualifying` | AI qualify → `qualified` |
| Validate / Reject | `awaiting_review` | Human review approve/reject |
| Push to Salesforce | `validated` / `push_failed` | Mock SF push |

**Information panels:**
- Summary cards: Est. Value, Country, Category, Deadline
- AI Qualification: score, summary, reasons, rejection reasons
- Human Validation & Salesforce: review status, SF ID, push errors
- Source Document panel with View / Download

**Document handling:**
- `getOpportunityDocument()` derives filename from `externalId` or title
- PDF preview in a dialog (iframe)
- Mock PDF URL used when no real document URL is set
- Optional fields: `sourceDocumentName`, `sourceDocumentUrl`

---

### 5.4 Ingestion (`si2` — `OpportunityIngestionView.tsx`)

**Purpose:** Configure tender sources and trigger portal scans.

**Visible:**
- Info panel explaining ingestion flow
- **Contracts Finder** portal card with **Run Scan**
- **Find a Tender** portal card with **Run Scan**

**Run Scan behaviour:**
1. Sets scanning state → portal sources show "running"
2. After 2 seconds → completes scan
3. Adds one new mock opportunity to **Ingested** stage
4. Toast confirmation

**Hidden (flagged off):**
- Manual Upload source card
- Manual Ingestion form (title, buyer, URL, Add Opportunity)

The manual ingestion code lives in `ManualIngestionPanel` and dispatches `addManualOpportunity` when re-enabled.

---

### 5.5 Review Queue (`si3` — `OpportunityReviewQueue.tsx`)

**Purpose:** Human validation queue for opportunities in `awaiting_review`.

**Functionality:**
- Lists opportunities awaiting review with approve/reject inline actions
- Click row → opens detail view
- Approve → moves to `validated`
- Reject → moves to `rejected`

**Current status:** Screen is fully implemented but **hidden from sidebar navigation**. Opportunities in `awaiting_review` still exist in mock data and appear in the List view with stage badge.

---

### 5.6 Salesforce Push Log (`si4` — `SalesforcePushLogView.tsx`)

**Purpose:** Audit trail of Salesforce push attempts.

**Table columns:** Status, Opportunity, Salesforce ID, Attempted, Error

**Data source:** Redux `pushLog` array, updated when `pushOpportunityToSalesforce` runs.

---

### 5.7 Chat Sidebar

**Purpose:** Conversational assistant panel (UI mock, same pattern as Pre Sales Writer).

**Behaviour:**
- Opens by default on the right (320px)
- Toggle via **Chat** button in top bar
- Sales Intelligence-specific welcome messages (pipeline, ingestion, SF push context)
- Input field + send button (not wired to a live API)

---

## 6. Opportunity Lifecycle & Stages

| Stage | Label | Description |
|-------|-------|-------------|
| `ingested` | Ingested | Newly discovered tender |
| `qualifying` | Qualifying | AI qualification running |
| `qualified` | Qualified | AI scored and passed initial filter |
| `awaiting_review` | Awaiting Review | Pending human validation |
| `validated` | Validated | Human approved, ready for SF push |
| `push_pending` | Push Pending | Mapped into Qualified column on kanban |
| `pushed` | Pushed | Successfully pushed to Salesforce |
| `rejected` | Rejected | Human or AI rejected |
| `push_failed` | Push Failed | Salesforce push error |

---

## 7. Mock Data

**File:** `salesIntelMockData.ts`

### Opportunities (10 seed records)

| ID | Title | Stage | Notes |
|----|-------|-------|-------|
| opp-001 | NHS Trust – Manned Guarding | awaiting_review | High score, pending review |
| opp-002 | EEAAS Afghanistan 2024 | qualified | Overseas security |
| opp-003 | University Campus Security | ingested | New, unscored |
| opp-004 | Retail Chain – CCTV | rejected | Low fit |
| opp-005 | MoD Barracks – K9 Unit | validated | Ready for push |
| opp-006 | Embassy Compound – West Africa | pushed | SF success |
| opp-007 | Local Authority – Event Security | qualifying | In progress |
| opp-008 | Hospital Trust – Soft FM | push_failed | Duplicate SF error |
| opp-009 | Manual Upload – Airport RFP | ingested | Manual source |
| opp-010 | Critical Infrastructure – Oil & Gas | awaiting_review | Moderate fit |

### Ingestion sources (3)

- Contracts Finder (portal)
- Find a Tender (portal)
- Manual Upload (manual) — hidden from UI

### Push log (3 seed entries)

- Success: Embassy Compound (opp-006)
- Failed: Hospital Trust duplicate (opp-008)
- Failed: MoD Barracks timeout (opp-005)

Data is loaded once per agent via `initializeSalesIntelMock({ agentId })` and persisted in Redux for the session.

---

## 8. State Management

**Slice:** `client/src/store/slices/salesIntelSlice.ts`  
**Registered in:** `client/src/store/index.ts`  
**Hook:** `useSalesIntelData(agentId)` — auto-initializes mock data on mount

### Redux actions

| Action | Purpose |
|--------|---------|
| `initializeSalesIntelMock` | Seed opportunities, sources, push log |
| `moveOpportunityPipelineStage` | Kanban drag-and-drop with smart stage patches |
| `setOpportunityStage` | Simple stage update |
| `qualifyOpportunity` | Run AI qualification |
| `approveOpportunityReview` | Human approve → validated |
| `rejectOpportunityReview` | Human reject → rejected |
| `pushOpportunityToSalesforce` | Mock SF push (opp-008 always fails) |
| `addManualOpportunity` | Add manual upload opportunity |
| `setScanning` / `completePortalScan` | Portal scan simulation |

State is keyed by `agentId` so multiple workers can coexist independently.

---

## 9. File Structure

```
client/src/pages/studio-dashboard/
├── studioSections.ts              # Worker classification & Studio sections
├── StudioDashboard.tsx            # Landing, cockpit, routing, chat, use case config
└── sales-intelligence/
    ├── SALES_INTELLIGENCE_WORKER.md   # This document
    ├── salesIntelTypes.ts         # Types, stage labels, pipeline config
    ├── salesIntelMockData.ts      # Seed opportunities, sources, push log
    ├── salesIntelUtils.tsx        # Formatting, badges, metrics, document helper
    ├── useSalesIntelData.ts       # Redux data hook
    ├── SalesIntelDashboard.tsx    # Overview screen
    ├── OpportunityListView.tsx    # List view + pipeline workspace wrapper
    ├── OpportunityPipelineView.tsx # Kanban board with drag-and-drop
    ├── OpportunityDetailView.tsx  # Single opportunity detail + documents
    ├── OpportunityIngestionView.tsx # Portal scan & manual ingestion
    ├── OpportunityReviewQueue.tsx # Human review queue
    └── SalesforcePushLogView.tsx  # Push audit log

client/src/store/slices/
└── salesIntelSlice.ts             # Redux state & actions
```

---

## 10. UI Changes Summary

| Change | Purpose |
|--------|---------|
| Separate Studio section for Sales Intelligence | Isolate from Pre Sales Writer |
| Worker cockpit with 5 use cases | Structured navigation |
| Outcomes strip per use case | KPI context at top of each screen |
| Pipeline / List toggle | Flexible pipeline viewing |
| Kanban drag-and-drop | ClickUp-style stage management |
| Hidden Awaiting Review column | Simplified board; stage still in data |
| Document view/download on detail | Access tender packs |
| Chat sidebar | Consistent with Pre Sales Writer UX |
| Feature flags for hidden sections | Easy to re-enable without code deletion |

---

## 11. What Is Not Yet Implemented

- Live Contracts Finder / Find a Tender API integration
- Real Salesforce API push
- Live AI qualification backend
- Functional chat (messages are static mock copy)
- Persistent storage beyond Redux session
- Real document storage / upload for manual ingestion (UI hidden)
- Review Queue sidebar entry (screen exists, navigation hidden)

---

## 12. Quick Reference — Re-enabling Hidden Features

| Feature | How to enable |
|---------|---------------|
| Review Queue menu | Remove `hidden: true` from `si3` in `StudioDashboard.tsx` |
| Sidebar footer metrics | Set `showSidebarMetrics: true` for `sales_intelligence` |
| Awaiting Review kanban column | Remove the filter in `PIPELINE_KANBAN_STAGES` (`salesIntelTypes.ts`) |
| Manual ingestion UI | Set `SHOW_MANUAL_INGESTION_UI = true` in `OpportunityIngestionView.tsx` |
| Overview metric cards | Uncomment grid in `SalesIntelDashboard.tsx` |

---

*Last updated: June 2026 — reflects mock implementation in `qiko-frontend` Sales Intelligence Worker module.*
