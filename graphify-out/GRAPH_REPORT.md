# Graph Report - app  (2026-05-09)

## Corpus Check
- Corpus is ~15,059 words - fits in a single context window. You may not need a graph.

## Summary
- 188 nodes · 177 edges · 53 communities (35 shown, 18 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Experiment Cache|Experiment Cache]]
- [[_COMMUNITY_Landing Page|Landing Page]]
- [[_COMMUNITY_Mobile Scanner API|Mobile Scanner API]]
- [[_COMMUNITY_Root Layout|Root Layout]]
- [[_COMMUNITY_Upload API|Upload API]]
- [[_COMMUNITY_Experiment Cache|Experiment Cache]]
- [[_COMMUNITY_Scanner Pages|Scanner Pages]]
- [[_COMMUNITY_Dashboard Layout|Dashboard Layout]]
- [[_COMMUNITY_Warehouse Audit|Warehouse Audit]]
- [[_COMMUNITY_Affiliate Portal|Affiliate Portal]]
- [[_COMMUNITY_Affiliate Portal|Affiliate Portal]]
- [[_COMMUNITY_Affiliate Landing|Affiliate Landing]]
- [[_COMMUNITY_Scanner Pages|Scanner Pages]]
- [[_COMMUNITY_Superuser Pages|Superuser Pages]]
- [[_COMMUNITY_Admin Dashboard|Admin Dashboard]]
- [[_COMMUNITY_Admin Karyawan|Admin Karyawan]]
- [[_COMMUNITY_Admin Service|Admin Service]]
- [[_COMMUNITY_Admin Inventory|Admin Inventory]]
- [[_COMMUNITY_Admin Analytics|Admin Analytics]]
- [[_COMMUNITY_Staff Dashboard|Staff Dashboard]]
- [[_COMMUNITY_Teknisi Dashboard|Teknisi Dashboard]]
- [[_COMMUNITY_Teknisi Tasks|Teknisi Tasks]]
- [[_COMMUNITY_Cache Demo API|Cache Demo API]]
- [[_COMMUNITY_Auth Pages|Auth Pages]]

## God Nodes (most connected - your core abstractions)
1. `logTimestamp()` - 13 edges
2. `getDynamicData()` - 4 edges
3. `getTaggedData()` - 4 edges
4. `badRequest()` - 4 edges
5. `authErrorResponse()` - 4 edges
6. `POST()` - 4 edges
7. `GET()` - 4 edges
8. `DELETE()` - 4 edges
9. `getStaticData()` - 3 edges
10. `getCachedSeconds()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `DynamicSection()` --calls--> `getDynamicData()`  [EXTRACTED]
  experiment/page.tsx → experiment/actions.ts
- `StaticSection()` --calls--> `getStaticData()`  [EXTRACTED]
  experiment/page.tsx → experiment/actions.ts
- `TaggedSection()` --calls--> `getTaggedData()`  [EXTRACTED]
  experiment/page.tsx → experiment/actions.ts

## Communities (53 total, 18 thin omitted)

### Community 0 - "Experiment Cache"
Cohesion: 0.2
Nodes (18): getCachedCustom(), getCachedDays(), getCachedHours(), getCachedMax(), getCachedMinutes(), getCachedSeconds(), getDynamicData(), getStaticData() (+10 more)

### Community 1 - "Landing Page"
Cohesion: 0.14
Nodes (14): affiliateHighlights, differentiators, fallbackCatalog, faqs, features, getCatalogLabel(), getLandingPhoneCatalog(), hasBrandIcon() (+6 more)

### Community 2 - "Mobile Scanner API"
Cohesion: 0.5
Nodes (8): authErrorResponse(), badRequest(), DELETE(), forbidden(), GET(), notFound(), POST(), unauthorized()

### Community 3 - "Root Layout"
Cohesion: 0.29
Nodes (5): fontMono, fontSans, fontSerif, metadata, viewport

### Community 4 - "Upload API"
Cohesion: 0.47
Nodes (3): checkAuth(), GET(), POST()

### Community 6 - "Experiment Cache"
Cohesion: 0.5
Nodes (3): CacheLogPanel(), initialLogs, LogEntry

## Knowledge Gaps
- **36 isolated node(s):** `features`, `painPoints`, `differentiators`, `steps`, `faqs` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `features`, `painPoints`, `differentiators` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Landing Page` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._