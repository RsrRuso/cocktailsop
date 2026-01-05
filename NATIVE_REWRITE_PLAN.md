### SpecVerse Native Rewrite Plan (Web → React Native/Expo)

Goal: **full feature parity** with the web app by migrating routes one-by-one into `apps/native/`.

Key principle: **nothing is “missing” during migration**.
- **Phase 1** adds a “WebView fallback” so every web route can still be used in the native app immediately.
- **Phase 2+** progressively replaces fallbacks with true native screens until all routes are native.

---

### Definitions
- **Native**: implemented as React Native screens/components.
- **WebView**: implemented by opening the existing web route in an in-app browser/WebView.
- **Hybrid complete**: every route works (some native, some WebView).
- **Parity complete**: every route is native (no WebView required).

---

### Phase 0 — Repo structure (already started)
- **Native app location**: `apps/native/`
- **Supabase auth**: implemented (native sign-in/sign-up + session persistence)
- **Root scripts**: `npm run native:start`, etc.

---

### Phase 1 — Foundation + “nothing missing” (Hybrid complete)
- **Navigation**: stack + tabs + deep links
- **Auth parity**: password reset + email link handling
- **Data layer**: react-query, shared API wrappers, caching strategy
- **WebView fallback router**: map each web route → native screen OR WebView target

Deliverable: **100% of web routes accessible in the native app** (native or WebView).

---

### Phase 2 — Social core (native parity for social)
Routes:
- [ ] `/home` — Native
- [ ] `/explore` — Native
- [ ] `/post/:id` — Native
- [ ] `/profile` — Native
- [ ] `/user/:userId` — Native
- [ ] `/notifications` — Native
- [ ] `/reels` — Native
- [ ] `/messages` — Native
- [ ] `/messages/:conversationId` — Native

---

### Phase 3 — Create & media (native parity for creation)
Routes:
- [ ] `/create` — Native
- [ ] `/create/post` — Native
- [ ] `/create/story` — Native
- [ ] `/create/reel` — Native
- [ ] `/edit-post/:id` — Native
- [ ] `/edit-reel/:id` — Native
- [ ] `/reel-editor` — Native
- [ ] `/reel-editor-pro` — Native
- [ ] `/studio` — Native (or staged)
- [ ] `/studio/:draftId` — Native (or staged)
- [ ] `/drafts` — Native (or staged)
- [ ] `/publish/:draftId` — Native (or staged)
- [ ] `/uploads` — Native (or staged)

---

### Phase 4 — Ops tools (native parity for highest-value ops)
Routes (grouped):

- **Inventory**
  - [ ] `/inventory-manager`
  - [ ] `/all-inventory`
  - [ ] `/inventory-transactions`
  - [ ] `/low-stock-inventory/:workspaceId`
  - [ ] `/master-items`
  - [ ] `/stores-admin`
  - [ ] `/store-management`
  - [ ] `/store/:id`

- **Batch**
  - [ ] `/batch-calculator`
  - [ ] `/batch-recipes`
  - [ ] `/batch-qr/:qrId`
  - [ ] `/batch-view/:productionId`
  - [ ] `/batch-activity`
  - [ ] `/abv-calculator`
  - [ ] `/scaling-tool`
  - [ ] `/cost-calculator`
  - [ ] `/yield-calculator`

- **FIFO / QR / Transfers**
  - [ ] `/fifo-workspace-management`
  - [ ] `/fifo-qr-access-code`
  - [ ] `/fifo-scan-access/:qrCodeId`
  - [ ] `/fifo-access-approval`
  - [ ] `/fifo-request-access`
  - [ ] `/fifo-access-approval-page`
  - [ ] `/transfer-qr`
  - [ ] `/scan-transfer/:qrCodeId`
  - [ ] `/scan-receive/:qrCodeId`

- **Procurement / Purchase Orders**
  - [ ] `/purchase-orders`
  - [ ] `/po-master-items`
  - [ ] `/po-received-items`

- **Staff / POS / KDS**
  - [ ] `/staff-scheduling`
  - [ ] `/staff-pos`
  - [ ] `/staff-pos/print`
  - [ ] `/bar-kds`
  - [ ] `/kitchen-kds`

---

### Phase 5 — Reports (native parity)
Routes:
- [ ] `/financial-reports`
- [ ] `/reports/profit-loss`
- [ ] `/reports/daily-sales`
- [ ] `/reports/cash-flow`
- [ ] `/reports/cogs`
- [ ] `/reports/labor-cost`
- [ ] `/reports/budget-actual`
- [ ] `/reports/stock-movement`
- [ ] `/reports/revenue-category`
- [ ] `/reports/breakeven`
- [ ] `/reports/daily-ops`
- [ ] `/sales-report`
- [ ] `/inventory-valuation-report`
- [ ] `/variance-report`
- [ ] `/pour-cost-analysis`
- [ ] `/wastage-tracker`
- [ ] `/menu-engineering`
- [ ] `/menu-engineering-pro`
- [ ] `/stock-audit`

---

### Phase 6 — Maps / venues (native parity)
Routes:
- [ ] `/map-planner`
- [ ] `/map`
- [ ] `/bar-intelligence`
- [ ] `/venue/:venueId`
- [ ] `/venue-register`
- [ ] `/venue-dashboard/:venueId`

---

### Phase 7 — Business/HR/Admin/Knowledge
Routes:
- [ ] `/business-hub`
- [ ] `/ops-tools`
- [ ] `/team-management`
- [ ] `/team-dashboard`
- [ ] `/team-invitation`
- [ ] `/hr-dashboard/*`
- [ ] `/company`
- [ ] `/documents`
- [ ] `/calendar`
- [ ] `/time-off`
- [ ] `/knowledge-base`
- [ ] `/analytics`
- [ ] `/task-manager`
- [ ] `/automations`
- [ ] `/ai-credits`
- [ ] `/matrix-ai`

---

### Phase 8 — Shop/Payments (native parity or keep WebView)
Routes:
- [ ] `/shop`
- [ ] `/cart`
- [ ] `/product/:id`
- [ ] `/payment-options`
- [ ] `/payment-success`
- [ ] `/order-confirmation`
- [ ] `/shop-auth`
- [ ] `/orders`
- [ ] `/seller-dashboard`

---

### Phase 9 — Remaining routes (complete sweep)
These are lower-frequency or promo/support pages; we still track them so parity is complete:
- [ ] `/`
- [ ] `/landing`
- [ ] `/auth`
- [ ] `/password-reset`
- [ ] `/email`
- [ ] `/tools`
- [ ] `/community`
- [ ] `/thunder`
- [ ] `/event/:id`
- [ ] `/reposted`
- [ ] `/story/:userId`
- [ ] `/story-options`
- [ ] `/update-music-library`
- [ ] `/music`
- [ ] `/music-box`
- [ ] `/music-box-admin`
- [ ] `/introduction`
- [ ] `/chat`
- [ ] `/install`
- [ ] `/lab-ops`
- [ ] `/lab-ops-promo`
- [ ] `/lab-ops-staff-pin-access`
- [ ] `/staff-install`
- [ ] `/staff-qr-access`
- [ ] `/purchase-order-promo`
- [ ] `/live`
- [ ] `/live/:id`
- [ ] `/exam-center`
- [ ] `/exam/:categoryId`
- [ ] `/certificate/:certificateId`
- [ ] `/gm-command-guide`
- [ ] `/gm-command`
- [ ] `/industry-digest`
- [ ] `/terms`
- [ ] `/campaign-payment`
- [ ] `/promo-reels`
- [ ] `/promo-ads`
- [ ] `/specverse-promo`
- [ ] `/presentation`
- [ ] `/pre-opening`
- [ ] `/pre-opening-checklist`
- [ ] `/vendor-database`
- [ ] `/org-chart`
- [ ] `/sop-library`
- [ ] `/menu-builder`
- [ ] `/licenses-compliance`
- [ ] `/asset-registry`
- [ ] `/budget-planner`
- [ ] `/recruitment-tracker`
- [ ] `/training-program`
- [ ] `/floor-plan-designer`
- [ ] `/opening-inventory`
- [ ] `/tech-stack-setup`
- [ ] `/marketing-launch`
- [ ] `/soft-opening-planner`
- [ ] `/utilities-tracker`
- [ ] `/insurance-manager`
- [ ] `/uniform-manager`
- [ ] `/health-safety-audit`

---

### Completion criteria (what “complete” means)
- **Hybrid complete**: every route above is reachable from the native app (Native or WebView).
- **Parity complete**: every route above is Native, with equivalent functionality and UX for mobile.

