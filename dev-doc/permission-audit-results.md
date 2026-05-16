# Phase 0: Permission Audit Results

Audit of the current access-control system as a baseline for the permission refactor.

## Role Types

Defined in `lib/features.ts` and `lib/auth/request-user.ts`:

```ts
type UserRole = "admin" | "staff" | "technician" | "superuser";
```

## Current Access Model

```
access = role allowed + plan allows + toko feature not disabled
```

Feature gates mix role authority + plan availability + toko toggle in a single check.

## Feature Registry (FEATURE_REGISTRY)

13 features in `lib/features.ts`. Each has `allowedRoles`, `minimumPlan`, `configurable`.

| Feature Key | Allowed Roles | Min Plan | Configurable |
|---|---|---|---|
| `service.manualItems` | admin, staff, technician | free | yes |
| `service.technicianAssignment` | admin, staff | premium | yes |
| `inventory.management` | admin, staff, technician | premium | yes |
| `inventory.staffCreateSparepart` | admin, staff | premium | yes |
| `retail.sales` | admin, staff | premium | yes |
| `karyawan.management` | admin | premium | yes |
| `staff.workflow` | admin, staff | premium | yes |
| `technician.workflow` | admin, staff, technician | premium | yes |
| `realtime.updates` | admin, staff, technician | premium | yes |
| `realtime.mobileScanner` | admin, staff, technician | premium | yes |
| `whatsapp.integration` | admin | premium | yes |
| `analytics.revenue` | admin | enterprise | yes |
| `inventory.audit` | admin | enterprise | yes |

## Capability Registry (CAPABILITY_REGISTRY)

| Capability | Allowed Roles |
|---|---|
| `dashboard.overview` | admin, staff, technician |
| `toko.manage` | admin |
| `service.management` | admin, staff |

## Access Patterns Found

### 1. `withScope(tokoId, { role, feature }, handler)` — 48 call sites

The most common pattern. Used in actions. Combines role check + optional feature check + scope resolution.

| Module | Files | Common Role Combos |
|---|---|---|
| Service queries | `actions/service-queries.ts` | admin/staff, admin/technician |
| Service mutations | `actions/service-mutations.ts` | admin/staff, admin/staff/technician, admin/technician |
| Karyawan | `actions/karyawan.ts` | admin only |
| WhatsApp | `actions/whatsapp.ts` | admin only |
| Feature settings | `actions/feature-settings.ts` | admin only |
| Toko settings | `actions/toko.ts` | admin only (write), any (read) |
| Retail | `actions/retail.ts` | admin/staff |
| Supplier debts | `actions/supplier-debts.ts` | admin only |
| Warranty claims | `actions/warranty-claims.ts` | admin/staff |
| Analytics | `actions/analytics.ts` | admin only |
| Overview | `actions/overview.ts` | admin only, admin/staff |
| Global search | `actions/global-search.ts` | any |

### 2. `assertRole(scope, [...])` — 18 call sites

Used inline within action handlers for additional role gates beyond what `withScope` provides.

| File | Usage |
|---|---|
| `actions/inventory.ts` | write ops → admin, certain mutations → admin |
| `actions/retail.ts` | → admin/staff |
| `actions/supplier-debts.ts` | → admin |
| `actions/inventory-audit.ts` | → admin |
| `lib/data/dashboard.ts` | → admin (dashboard), → staff (dashboard) |
| `lib/auth/request-scope.ts` | definition |

### 3. `assertFeature(scope, "feature.key")` — 51 call sites

Core feature gating, used inside action handlers.

| File | Features Checked |
|---|---|
| `actions/inventory.ts` | inventory.management, inventory.staffCreateSparepart, staff.workflow, technician.workflow, retail.sales |
| `actions/retail.ts` | inventory.management, retail.sales |
| `actions/service-mutations.ts` | staff.workflow, technician.workflow, inventory.management, service.manualItems |
| `actions/warranty-claims.ts` | inventory.management |
| `actions/supplier-debts.ts` | inventory.management |
| `actions/inventory-audit.ts` | inventory.audit |
| `lib/auth/wrapper.ts` | via config.feature in defineScopedAction/withScope |
| `app/api/mobile-scanner/signal/route.ts` | realtime.updates, realtime.mobileScanner |

### 4. `featureAccess[...]` — 95 access points

Used in components and actions to check feature availability.

| Location | Features Checked |
|---|---|
| `nav-config.ts` | karyawan.management, analytics.revenue, inventory.management, retail.sales, inventory.audit, staff.workflow, technician.workflow |
| `dashboard-scope-context.tsx` | inventory.management, service.manualItems, inventory.staffCreateSparepart, realtime.updates, realtime.mobileScanner |
| `global-search.tsx` | staff.workflow, technician.workflow, inventory.management, analytics.revenue, karyawan.management, inventory.audit |
| Various components | service.technicianAssignment, technician.workflow, etc. |

### 5. `allowedRoles` — 34 references

Used in FEATURE_REGISTRY and CAPABILITY_REGISTRY definitions.

### 6. `role ===` / `role !==` — 100+ checks

Inline role checks throughout components, actions, layouts.

Key locations:
- Layouts: each role-specific layout (`admin/layout.tsx`, `staff/layout.tsx`, `teknisi/layout.tsx`) redirects mismatched roles
- `app-sidebar.tsx` — renders role-specific nav
- `global-search.tsx` — role-conditional search scopes
- `manage-karyawan.tsx` — role-specific UI

## Module-by-Module Access Matrix

### Inventory

Route segments: `admin/inventory`, `staff/inventory`, `teknisi/inventory`

| Action | Admin | Staff | Technician |
|---|---|---|---|
| View inventory | yes (via feature) | yes (via staff.workflow) | yes (via technician.workflow) |
| Create items | yes | conditional (inventory.staffCreateSparepart) | no |
| Update items | yes | conditional | no |
| Delete items | yes | no | no |
| Restock | yes | no | no |
| Audit | yes (inventory.audit) | no | no |

Feature gate: `inventory.management` (premium, all roles)
Admin-only sub-features: `inventory.audit` (enterprise)

### Service

Route segments: `admin/service`, `staff/service`, `teknisi/task`

| Action | Admin | Staff | Technician |
|---|---|---|---|
| View service list | yes | yes (staff.workflow) | assigned only (technician.workflow) |
| Create service | yes | yes | no |
| Update service | yes | yes | assigned + status updates |
| Assign technician | yes | yes (service.technicianAssignment) | no |
| Take over task | yes | no | assigned |
| Create invoice | yes | yes | no |
| Manage manual items | yes | yes | yes (service.manualItems) |

Feature gates: `service.technicianAssignment` (premium), `service.manualItems` (free), `technician.workflow` (premium), `staff.workflow` (premium)

### Retail

Route segments: `admin/retail`, `staff/retail`

| Action | Admin | Staff | Technician |
|---|---|---|---|
| View retail | yes | yes (staff.workflow) | no |
| Sell items | yes | yes | no |
| View history | yes | yes | no |

Feature gate: `retail.sales` (premium) + `inventory.management` (premium)

### Karyawan

Route segment: `admin/karyawan`

| Action | Admin | Staff | Technician |
|---|---|---|---|
| View employees | yes | no | no |
| Create/invite | yes | no | no |
| Update role/profile | yes | no | no |
| Deactivate | yes | no | no |
| Manage permissions | no (future) | no | no |

Feature gate: `karyawan.management` (premium)

### Analytics

Route segment: `admin/analytics`

| Action | Admin | Staff | Technician |
|---|---|---|---|
| View analytics | yes | no | no |

Feature gate: `analytics.revenue` (enterprise)

### WhatsApp

Route segment: `admin/whatsapp`

| Action | Admin | Staff | Technician |
|---|---|---|---|
| View settings | yes | no | no |
| Send messages | yes | no | no |
| Manage templates | yes | no | no |
| Connect provider | yes | no | no |

Feature gate: `whatsapp.integration` (premium)

### Toko Settings

Route segment: `admin/toko`

| Action | Admin | Staff | Technician |
|---|---|---|---|
| View profile | yes | no | no |
| Update profile | yes | no | no |
| Manage operational | yes | no | no |

Capability gate: `toko.manage`

### Feature Settings

Route segment: `admin/feature-settings`

| Action | Admin | Staff | Technician |
|---|---|---|---|
| View settings | yes | no | no |
| Toggle features | yes | no | no |

## Recommended First Migration Module

**Inventory** — recommended because:
- Crosses all 3 roles (admin, staff, technician)
- Has clear CRUD action boundaries
- Already has feature gate (`inventory.management`)
- Good proving ground for shared components
- Sub-feature (`inventory.audit`) tests enterprise-level gating

## Admin-Only Guardrails (V1)

These areas must remain admin-only in V1 of the permission system:

| Area | Reason |
|---|---|
| Permission management | Self-escalation risk |
| Feature settings toggle | Can bypass plan/toko restrictions |
| Billing/subscription | Financial ownership |
| Karyawan management | Can add/edit/remove users |
| WhatsApp configuration | Provider credentials, cost risk |
| Toko profile/ownership | Business ownership |
| Inventory audit | Data integrity risk |
| Supplier debts | Financial records |

## Draft Permission Taxonomy (Recommended V1)

### Inventory

| Permission | Admin | Staff | Technician | Required Feature | V1 Grantable |
|---|---|---|---|---|---|
| `inventory.view` | yes | yes | yes | `inventory.management` | yes |
| `inventory.create` | yes | conditional | no | `inventory.management` | yes |
| `inventory.update` | yes | conditional | no | `inventory.management` | yes |
| `inventory.delete` | yes | no | no | `inventory.management` | yes |
| `inventory.restock` | yes | no | no | `inventory.management` | yes |
| `inventory.audit` | yes | no | no | `inventory.audit` | yes |

### Service

| Permission | Admin | Staff | Technician | Required Feature | V1 Grantable |
|---|---|---|---|---|---|
| `service.view` | yes | yes | assigned | `technician.workflow` | yes |
| `service.create` | yes | yes | no | none | yes |
| `service.update` | yes | yes | assigned | none | yes |
| `service.updateStatus` | yes | yes | assigned | none | yes |
| `service.assignTechnician` | yes | yes | no | `service.technicianAssignment` | yes |
| `service.takeOverTask` | yes | no | no | none | yes |
| `service.createInvoice` | yes | yes | no | none | yes |
| `service.manageInvoice` | yes | yes | no | none | yes |

### Retail

| Permission | Admin | Staff | Technician | Required Feature | V1 Grantable |
|---|---|---|---|---|---|
| `retail.view` | yes | yes | no | `retail.sales` | yes |
| `retail.sell` | yes | yes | no | `retail.sales` | yes |
| `retail.viewHistory` | yes | yes | no | `retail.sales` | yes |

### Karyawan

| Permission | Admin | Staff | Technician | Required Feature | V1 Grantable |
|---|---|---|---|---|---|
| `karyawan.view` | yes | no | no | `karyawan.management` | no |
| `karyawan.create` | yes | no | no | `karyawan.management` | no |
| `karyawan.update` | yes | no | no | `karyawan.management` | no |
| `karyawan.deactivate` | yes | no | no | `karyawan.management` | no |
| `karyawan.managePermissions` | yes | no | no | none | no |

### Analytics

| Permission | Admin | Staff | Technician | Required Feature | V1 Grantable |
|---|---|---|---|---|---|
| `analytics.view` | yes | no | no | `analytics.revenue` | yes* |
| `analytics.export` | yes | no | no | `analytics.revenue` | no |

*Grantable but locked by enterprise plan in practice.

### WhatsApp

| Permission | Admin | Staff | Technician | Required Feature | V1 Grantable |
|---|---|---|---|---|---|
| `whatsapp.view` | yes | no | no | `whatsapp.integration` | no |
| `whatsapp.send` | yes | no | no | `whatsapp.integration` | no |
| `whatsapp.manageTemplates` | yes | no | no | `whatsapp.integration` | no |
| `whatsapp.manageSettings` | yes | no | no | `whatsapp.integration` | no |

### Toko

| Permission | Admin | Staff | Technician | Required Feature | V1 Grantable |
|---|---|---|---|---|---|
| `toko.viewSettings` | yes | no | no | none | no |
| `toko.updateProfile` | yes | no | no | none | no |
| `toko.manageOperational` | yes | no | no | none | no |

### Ownership-level (never grantable in V1)

| Permission | Reason |
|---|---|
| `features.manage` | Can bypass plan restrictions |
| `toko.transferOwnership` | Business ownership |
| `toko.delete` | Destructive |

## Permission Naming Convention

```
{module}.{verb}
```

Preferred verbs: `view`, `create`, `update`, `delete`, `manage`, `assign`, `export`, `restock`, `deactivate`

Rules:
- Lowercase dot-separated
- No role names in keys
- No plan names in keys
- No UI-specific names

## Key Files for Implementation

| File | Purpose |
|---|---|
| `lib/permissions.ts` | Permission registry, types, pure helpers |
| `lib/auth/request-scope.ts` | Extend with permission access in Phase 2 |
| `prisma/schema.prisma` | Add TokoUserPermission model in Phase 2 |
| `actions/*.ts` | Migrate to permission checks per module |
| `components/dashboard/nav/nav-config.ts` | Replace role-specific nav with permission-gated nav |
| `proxy.ts` | Update route protection strategy |
| `lib/redirect-by-role.ts` | Phase out in later stages |

## Migration Strategy

1. Phase 1: Pure permission primitives (no behavior change)
2. Phase 2: Persistence + request scope (no behavior change)
3. Phase 3: Route foundation (shared module routes)
4. Phase 4: Inventory migration (first module)
5. Phase 5: Permission management UI
6. Phase 6-7: Remaining modules
7. Phase 8: Cleanup old role-first paths

**First migration module**: Inventory

## Server Action Coverage Addendum

The Phase 1 registry was expanded after scanning all files in `actions/`.

The registry now has explicit permission coverage for these action families:

| Action Family | Representative Actions | Registry Coverage |
|---|---|---|
| Inventory items | `getSpareparts`, `createSparepart`, `updateSparepart`, `deleteSparepart` | `inventory.view`, `inventory.create`, `inventory.update`, `inventory.delete` |
| Inventory restock/history/report | `restockSparepart`, `restockSparepartsWithDebt`, `getStockInHistory`, `getRestockHistory`, `getInventoryReport` | `inventory.restock`, `inventory.viewHistory`, `inventory.report` |
| Inventory imports/pricelists | `importSpareparts`, `getServicePricelists`, `createServicePricelist`, `updateServicePricelist`, `deleteServicePricelist` | `inventory.import`, `inventory.manageServicePricelists` |
| Inventory audit | `getInventoryAuditOverview`, `startInventoryAudit`, `updateInventoryAuditItem`, `completeInventoryAudit`, `cancelInventoryAudit` | `inventory.audit` |
| Service records | `getServiceList`, `getService`, `createService`, `updateService`, `deleteService` | `service.view`, `service.create`, `service.update`, `service.delete` |
| Service technician workflow | `getAvailableTasks`, `getMyTasks`, `takeService`, `assignTechnician`, `updateStatus` | `service.view`, `service.takeOverTask`, `service.assignTechnician`, `service.updateStatus` |
| Service checkout/invoice/items | `pickupService`, `addItem`, `removeItem`, `payInvoice`, `markDpInvoice` | `service.pickup`, `service.manageItems`, `service.manageInvoice` |
| Warranty claims | `createWarrantyClaim`, `resolveWarrantyClaim` | `warranty.create`, `warranty.resolve` |
| Retail | `getRetailCheckoutItems`, `getRetailSales`, `getRetailSale`, `createRetailSale` | `retail.view`, `retail.viewHistory`, `retail.sell` |
| Supplier debts | `getSuppliers`, `createSupplier`, `getSupplierDebts`, `createSupplierDebt`, `updateSupplierDebt`, `deleteSupplierDebt`, `addSupplierDebtPayment` | `supplier_debts.view`, `supplier_debts.create`, `supplier_debts.update`, `supplier_debts.delete`, `supplier_debts.pay` |
| Karyawan | `getKaryawanList`, `getKaryawanStats`, `getTechnicianPerformanceDetail`, `createKaryawan`, `deleteKaryawan` | `karyawan.view`, `karyawan.create`, `karyawan.deactivate` |
| Analytics/dashboard/search | `getAdminAnalytics`, `getAdminOverview`, `getStaffOverview`, `searchDashboard` | `analytics.view`, `dashboard.view`, `dashboard.search` |
| Toko settings | `createTokoWithUsers`, `createToko`, `getTokoById`, `updateToko`, `getTokoInvoiceSettings`, `deleteToko` | `toko.create`, `toko.viewSettings`, `toko.updateProfile`, `toko.manageOperational`, `toko.delete` |
| Feature settings | `getTokoFeatureSettings`, `getTokoFeatureSettingsWithStatus`, `updateTokoFeatureSettings`, `setTokoFeatureEnabled` | `features.view`, `features.manage` |
| WhatsApp | `getTokoWhatsappSetting`, `getWhatsappState`, `connectTokoWhatsapp`, `refreshTokoWhatsappConnection`, `updateTokoWhatsappSetting`, `disconnectTokoWhatsapp` | `whatsapp.view`, `whatsapp.manageSettings` |

Notes:

- `service-shared.ts`, `service-types.ts`, `service.ts`, and `index.ts` mostly export helper types, helper functions, constants, or re-exports. Their externally reachable behavior is covered by service query/mutation permissions.
- Superuser and affiliate actions are intentionally outside this toko permission system.
- Account/profile actions are intentionally outside this permission system because users can manage their own account without toko-scoped permissions.
- Device catalog read access is intentionally outside this permission system because the catalog is shared and can be available to any authenticated workflow that needs it.
- Billing remains owner/admin-role governed and is intentionally not represented as a grantable toko permission.
- Supplier debt permissions are intentionally non-grantable in V1 because they touch financial records.
