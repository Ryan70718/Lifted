Build a full-stack web application called "Lifted Extracts CRM" for a licensed New York cannabis brand. This is an internal sales operations tool for tracking sales reps, dispensary accounts, inventory, routes, and revenue.

Tech stack: React (Vite), Tailwind CSS, Supabase (Postgres + Auth + Realtime) for the backend, deployed to Vercel.

Design requirements:
- Dark theme, Linear.app-level cleanliness and simplicity
- Apple liquid glass aesthetic: frosted glass cards, subtle transparency, soft blur/backdrop-filter, gentle depth via shadows
- Smooth micro-animations on hover/transition (150-250ms ease)
- Typography: DM Sans (or similar geometric sans-serif)
- Background: deep dark (#080b12), with 2-3 subtle ambient gradient/light orbs that drift slowly
- Fully mobile responsive — usable one-handed on a phone in the field

Core features:

1. Sales Rep Management — Rep profiles (name, territory, phone, payment type, start date). Commission ledger per rep: base rate + $75 velocity bonus for any store that sells through its order in under 45 days. Activity log per rep (store visits, samples dropped, calls made, timestamped). Leaderboard ranked by units sold, new doors opened, bonuses earned.

2. Dispensary Map — Interactive map of New York with every dispensary account pinned. Toggle between two color-coding modes: (a) status — prospect / sampled / active account / needs damage control, and (b) credit rating — manual 1-5 scale using blue (good), yellow (fair), orange (weak), red (poor/high risk), gray (not rated). Clicking a pin opens a store detail panel: license number, address, contact info, last order date, units currently on hand, next reorder due date, region (Long Island / 5 boroughs / Rockland-Orange / Westchester / upstate), pricing tier (list $32.50 or negotiated floor $30), credit rating with editable notes field.

3. Routing — Build a route for a given day/area: select a region, see all stores in it, drag to order the visit sequence. Filter toggle for "needs damage control" (pre-tagged for Brooklyn, Rockland, Orange County). Route history log showing last-visited date per store, with a flag for stores untouched in 30+ days.

4. Store Assignment — Every store has one assigned sales rep. Reps log in and see only their assigned territory/accounts; admin (Ryan) sees everything.

5. Inventory & Sell-Through Tracking — Track units checked out to each rep by SKU. Per-store sell-through: units delivered, units sold, days in store, with a progress indicator against a 60-90 day sell-through benchmark. Batch tracking: current batch VP20260331, expires March 2027, with an expiration countdown/alert. Enforce 60-unit minimum on any new store order entry.

6. 90-Day Timeline — Kanban or Gantt-style board for: new-door targets, damage-control visit completions, rep onboarding milestones, next-batch (Cloudburst) launch prep. Weekly checkpoint rows showing target vs. actual.

7. Cost Calculator — Given units sold + price tier (list/floor) + rep commission rate + velocity bonus eligibility, calculate gross revenue, commission cost, and net margin ($ and %). Provide roll-up views by store, by rep, by region, by month. Include a "what-if" toggle to model margin impact of offering floor pricing.

8. Supporting modules:
- QR code incident log: flag stores that received compromised marketing materials, track revisit/remediation status
- Compliance document vault: store OCM license info, trademark registration, per-store compliance notes
- Brand ambassador / event log: separate activity feed for non-sales-rep activities (brand ambassador visits, pop-up events)
- Lead pipeline: cold lead to sampled to first order to repeat order, as a simple stage tracker

9. Dashboard (home screen) — Top-level view: total active accounts, units sold this month, net margin this month, top 5 reps by velocity bonus, stores needing reorder soon, stores overdue for a visit, current batch expiration countdown.

Data model notes: Use Supabase Postgres tables for reps, stores, orders, routes, inventory_batches, commissions, timeline_items, qr_incidents, leads. Use Supabase Auth for rep/admin login with role-based access (admin sees all, rep sees assigned only). Use Supabase Realtime so changes sync live across devices.
