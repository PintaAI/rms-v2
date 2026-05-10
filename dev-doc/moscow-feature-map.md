# MoSCoW Feature Map

This map prioritizes the current RMS feature set using the `app/` graph and the supporting implementation in `actions/`, `lib/`, and `prisma/`.

## Basis

- Route structure: `app/` for visible feature surfaces.
- Feature gates: `lib/features.ts` for product packaging and access control.
- Plan logic: `lib/plans.ts` and `lib/onboarding-recommendation.ts` for commercial priority.
- Business actions: `actions/` for operational workflows.
- Data model: `prisma/schema.prisma` for persistence and dependency weight.

## Must Have

These are required for the product to function as a repair shop RMS.

| Feature | Why | Evidence |
| --- | --- | --- |
| Authentication and role routing | Every operational route depends on identifying admin, staff, technician, or superuser access. | `lib/features.ts`, `lib/redirect-by-role.ts`, `app/api/auth/[...all]/route.ts` |
| Toko setup and ownership | A toko is the tenant boundary for services, inventory, staff, activity logs, feature settings, and WhatsApp settings. | `actions/toko.ts`, `prisma/schema.prisma` `Toko`, `UserToko` |
| Subscription and plan enforcement | Limits drive toko count, staff count, technician count, monthly service volume, and invoice volume. | `lib/plans.ts`, `actions/billing.ts`, `lib/auth/enforcement.ts` |
| Service intake and lifecycle | Service records are the core work object: created, assigned, repaired, completed, failed, picked up, invoiced, and logged. | `actions/service-mutations.ts`, `actions/service-queries.ts`, `prisma/schema.prisma` `Service`, `ServiceItem`, `Invoice` |
| Invoice and payment status | Revenue capture is tied directly to service items and invoice status. | `actions/service-mutations.ts`, `prisma/schema.prisma` `Invoice`, `InvoiceItem`, `PaymentStatus` |
| Device catalog | Service intake requires a device model and brand catalog. | `actions/device.ts`, `app/api/devices/catalog/route.ts`, `prisma/schema.prisma` `Brand`, `HpCatalog` |
| Dashboard shell and role dashboards | Admin, staff, and technician users need their own operational entry points. | `app/(dashboard)/[tokoid]/layout.tsx`, `actions/overview.ts` |
| Activity log | Operational traceability depends on service, invoice, and inventory events. | `lib/activity-log.ts`, `prisma/schema.prisma` `ActivityLog`, `ActivityType` |
| Basic staff and technician access | The system models staff and technician workflows as first-class roles, even if plan-gated. | `lib/features.ts`, `actions/karyawan.ts`, `prisma/schema.prisma` `UserRole` |

## Should Have

These materially improve the operational product and are strongly aligned with paid-plan value.

| Feature | Why | Evidence |
| --- | --- | --- |
| Inventory management | Inventory is a premium feature but deeply connected to service item usage, stock, pricing, compatibility, and restocking. | `lib/features.ts`, `actions/inventory.ts`, `prisma/schema.prisma` `Sparepart`, `SparepartCategory`, `SparepartCompatibility` |
| Service price list | Reusable service pricing reduces manual entry and improves invoice consistency. | `actions/inventory.ts`, `prisma/schema.prisma` `ServicePricelist` |
| Karyawan management | Staff and technician accounts unlock multi-user operations and are required by onboarding when team count is greater than zero. | `actions/karyawan.ts`, `lib/onboarding-recommendation.ts`, `lib/features.ts` |
| Staff workflow | Staff can handle service and inventory operations under controlled feature gates. | `lib/features.ts`, `actions/overview.ts`, `app/(dashboard)/[tokoid]/staff` |
| Technician workflow | Technician task assignment, status movement, and performance tracking are central to repair execution. | `lib/features.ts`, `actions/service-queries.ts`, `actions/karyawan.ts`, `app/(dashboard)/[tokoid]/teknisi` |
| Realtime updates | Useful in busy shops because service status and dashboards need to stay synchronized across users. | `lib/features.ts`, `lib/realtime/*`, `lib/onboarding-recommendation.ts` |
| Mobile scanner | Supports inventory and sparepart barcode workflows without dedicated scanner hardware. | `lib/features.ts`, `app/api/mobile-scanner/signal/route.ts`, `lib/mobile-scanner-signaling-store.ts` |
| WhatsApp integration | Automates customer notifications for service outcomes and is a clear service-quality differentiator. | `lib/features.ts`, `actions/whatsapp.ts`, `lib/service-whatsapp-notifications.ts`, `prisma/schema.prisma` `TokoWhatsappSetting` |
| User manual | Reduces support burden and explains product workflows inside the app. | `app/user-manual/page.tsx`, `app/api/user-manual/route.ts`, `user-manual/` |

## Could Have

These are useful, monetizable, or strategic, but the product can operate without them.

| Feature | Why | Evidence |
| --- | --- | --- |
| Revenue analytics | Enterprise-gated reporting is valuable, but not required to create and complete service work. | `lib/features.ts`, `actions/analytics.ts`, `app/(dashboard)/[tokoid]/admin/analytics` |
| Inventory audit | Enterprise inventory governance feature; important for mature shops, not required for day-one operations. | `lib/features.ts`, `actions/inventory-audit.ts`, `prisma/schema.prisma` `InventoryAuditSession`, `InventoryAuditItem` |
| Affiliate system | Growth and referral operations are separate from core repair shop workflows. | `actions/affiliate.ts`, `app/affiliate/*`, `prisma/schema.prisma` `Affiliator`, `Referral`, `AffiliateCommission` |
| Product knowledge pages | Helpful for marketing or affiliate education, but not needed for RMS operations. | `app/affiliate/product-knowledge/page.tsx`, `app/affiliate/portal/[code]/knowledge/page.tsx` |
| Superuser billing review/admin tools | Needed for internal operations, but not part of the shop-facing core workflow. | `app/superuser/page.tsx`, `actions/superuser.ts`, `actions/billing.ts` |
| Onboarding recommendation | Improves activation and plan selection, but can be simplified while core workflows mature. | `lib/onboarding-recommendation.ts`, `app/onboard/page.tsx` |
| Global search | Convenience layer across service, karyawan, sparepart, and jasa data. | `actions/global-search.ts` |

## Won't Have For Now

These should not drive near-term scope unless a release goal explicitly requires them.

| Feature | Why | Evidence |
| --- | --- | --- |
| Cache experiment pages | These are technical experiments, not product workflows. | `app/experiment/*`, `app/api/cache-demo/route.ts` |
| Public landing copy refinement | Marketing blocks are weakly connected to core operational workflows, so they should not compete with operational work. | `app/page.tsx` `features`, `painPoints`, `differentiators` |
| Expanded affiliate payout operations | The data model supports commissions, but this can wait until referral volume exists. | `actions/affiliate.ts`, `prisma/schema.prisma` `AffiliateCommission` |
| Advanced audit/accounting exports | No current first-class export model was identified in the inspected surfaces. | Current `actions/` and `prisma/schema.prisma` |

## Prioritization Notes

- If a feature is both route-visible and data-model-backed, it gets a higher priority than UI-only surfaces.
- If a feature is in `FEATURE_REGISTRY`, its `minimumPlan` helps distinguish core workflow from monetized add-on.
- `free` features and tenant/auth/payment foundations are treated as baseline product requirements.
- `premium` features are generally `Should Have` when they improve daily shop operations.
- `enterprise` features are generally `Could Have` unless the target customer is an enterprise shop.

## Recommended Delivery Order

1. Stabilize auth, toko setup, subscription limits, service lifecycle, invoices, device catalog, and activity log.
2. Stabilize inventory, price lists, staff/technician workflows, realtime updates, mobile scanner, and WhatsApp.
3. Add analytics, inventory audit, affiliate, onboarding recommendation polish, user manual depth, and global search.
4. Keep cache experiments and marketing-copy refinements out of critical-path release scope.
