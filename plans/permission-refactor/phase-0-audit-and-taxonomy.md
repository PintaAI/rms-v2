# Phase 0: Audit And Permission Taxonomy

## Goal

Understand the current access-control system before changing it, then define the first permission taxonomy that can preserve existing behavior while enabling per-user overrides later.

This phase should not change runtime behavior.

## Why This Phase Exists

The current app protects access through a mix of role checks, feature gates, route protection, navigation filtering, and server-action checks. Before adding permissions, we need to know exactly what each module currently allows and blocks.

Without this audit, the refactor can accidentally do one of two bad things:

- Grant staff or technicians access to sensitive admin-only areas.
- Remove access that users already rely on today.

## Scope

Audit all access-control entry points that affect pages, server actions, navigation, route protection, and feature availability.

Primary files and areas to inspect:

- `lib/features.ts`
- `lib/auth/request-scope.ts`
- `lib/rbac.ts`
- `lib/redirect-by-role.ts`
- `proxy.ts`
- `actions/`
- `app/(dashboard)/[tokoid]/`
- `components/dashboard/nav/`
- Any module-level server helpers that enforce role, feature, or membership checks.

Search targets:

- `assertRole(`
- `assertFeature(`
- `withScope(`
- `featureAccess`
- `allowedRoles`
- `role ===`
- `role !==`
- `session.user.role`
- `member.role`
- `redirectByRole`
- `FeatureKey`
- `FEATURE_REGISTRY`

## Non-Goals

- Do not add new permission code yet.
- Do not add database models yet.
- Do not migrate routes yet.
- Do not change feature-gate behavior yet.
- Do not change navigation behavior yet.
- Do not add permission management UI yet.

## Audit Questions

For each module, answer these questions:

- Which roles can access the page today?
- Which roles can see navigation items today?
- Which roles can run server actions today?
- Which feature gates are required today?
- Which subscription plans allow the module today?
- Can admins disable the module per toko today?
- Are there read-only and write-level differences today?
- Are there hidden assumptions that `admin` always means owner-like control?
- Is the module operational, sensitive, or ownership-level?

## Module Groups

Group audited access into these module buckets first. Rename or split them only if the codebase proves a different boundary is better.

### Inventory

Expected permission family:

```txt
inventory.view
inventory.create
inventory.update
inventory.delete
inventory.restock
inventory.audit
```

Audit questions:

- Who can view inventory lists?
- Who can view inventory details?
- Who can create items?
- Who can edit item metadata?
- Who can adjust stock?
- Who can delete items?
- Who can view audit/history data?
- Which actions are available to staff today?
- Which actions are available to technicians today?

Expected feature mapping:

```txt
inventory.view -> inventory.management
inventory.create -> inventory.management
inventory.update -> inventory.management
inventory.delete -> inventory.management
inventory.restock -> inventory.management
inventory.audit -> inventory.audit
```

### Service

Expected permission family:

```txt
service.view
service.create
service.update
service.updateStatus
service.assignTechnician
service.takeOverTask
service.createInvoice
service.manageInvoice
```

Audit questions:

- Who can see service tickets?
- Who can create service tickets?
- Who can edit service details?
- Who can update service status?
- Who can assign technicians?
- Who can take over technician tasks?
- Who can create invoices from service records?
- Who can modify service invoices?
- Which technician actions are scoped to assigned work only?

Expected feature mapping should be confirmed from `FEATURE_REGISTRY` before implementation.

### Retail

Expected permission family:

```txt
retail.view
retail.sell
retail.viewHistory
retail.refund
retail.manageTransaction
```

Audit questions:

- Who can access retail sales pages?
- Who can create sales transactions?
- Who can view transaction history?
- Who can cancel or refund transactions, if supported?
- Which inventory permissions are needed during retail sales?

### Karyawan

Expected permission family:

```txt
karyawan.view
karyawan.create
karyawan.update
karyawan.deactivate
karyawan.managePermissions
```

Audit questions:

- Who can view employee lists?
- Who can invite or create employees?
- Who can update employee profiles or roles?
- Who can deactivate employees?
- Which parts must remain admin-only in V1?
- Should `karyawan.managePermissions` be grantable in V1? Expected answer: no.

### Analytics

Expected permission family:

```txt
analytics.view
analytics.export
```

Audit questions:

- Which analytics pages exist?
- Which feature gates protect them?
- Which analytics data is safe to grant to staff?
- Is export available or planned?

### WhatsApp

Expected permission family:

```txt
whatsapp.view
whatsapp.send
whatsapp.manageTemplates
whatsapp.manageSettings
```

Audit questions:

- Who can view WhatsApp-related pages?
- Who can send messages?
- Who can manage templates?
- Who can connect, disconnect, or configure providers?
- Which settings should remain admin-only?

### Toko Settings

Expected permission family:

```txt
toko.viewSettings
toko.updateProfile
toko.manageOperationalSettings
```

Audit questions:

- Which settings are operational and safe to delegate?
- Which settings are ownership-level and should stay admin-only?
- Are there billing, subscription, or destructive controls here?

### Feature Settings

Expected permission family:

```txt
features.view
features.manage
```

V1 recommendation:

```txt
features.manage = admin-only, not grantable
```

Audit questions:

- Where are per-toko feature settings changed?
- Which actions can enable or disable modules?
- Can this accidentally bypass plan restrictions?
- Should this remain admin-only in V1? Expected answer: yes.

## Permission Naming Rules

Use consistent permission key names so the registry stays predictable.

Rules:

- Use lowercase dot-separated keys.
- Start with the module name.
- Use action verbs after the module.
- Prefer common verbs: `view`, `create`, `update`, `delete`, `manage`, `assign`, `export`.
- Use `manage` only when a permission covers multiple related write actions.
- Avoid role names in permission keys.
- Avoid plan names in permission keys.
- Avoid UI-specific names like `button.create`.

Good examples:

```txt
inventory.view
inventory.create
service.assignTechnician
retail.viewHistory
karyawan.managePermissions
```

Avoid:

```txt
admin.inventory
premium.analytics
showCreateButton
staffCanSell
```

## Permission Metadata

Each permission should eventually have metadata like this:

```ts
type PermissionMetadata = {
  label: string;
  description: string;
  category: PermissionCategory;
  requiredFeature: FeatureKey | null;
  grantableInV1: boolean;
  sensitivity: "operational" | "sensitive" | "ownership";
};
```

Phase 0 does not need to implement this type. It only needs to decide the taxonomy that Phase 1 will encode.

## Admin-Only Guardrail Classification

Classify each permission with one of these sensitivity levels:

```txt
operational = can be granted to staff/technicians when the admin chooses
sensitive = can be granted later, but needs extra review
ownership = not grantable in V1
```

Recommended V1 ownership-level permissions:

```txt
karyawan.managePermissions
features.manage
billing.manage
toko.transferOwnership
toko.delete
```

If a permission can grant access to other users, change subscription state, change billing, delete toko data, or transfer ownership, it should not be grantable in V1.

## Role Default Mapping

Produce a draft table that maps current behavior to future role defaults.

Example format:

| Permission | Admin Default | Staff Default | Technician Default | Required Feature | V1 Grantable |
|---|---:|---:|---:|---|---:|
| `inventory.view` | yes | yes | maybe | `inventory.management` | yes |
| `inventory.create` | yes | maybe | no | `inventory.management` | yes |
| `inventory.delete` | yes | no | no | `inventory.management` | yes |
| `karyawan.managePermissions` | yes | no | no | none | no |

The goal is not to finalize every permission forever. The goal is to create a safe first registry that can preserve current behavior.

## Required Feature Mapping

Each permission should map to one of these:

- A required `FeatureKey` when the permission belongs to a plan-gated module.
- `null` when the permission only requires toko membership and user authority.

Rules:

- Permissions must not duplicate plan logic.
- Permissions must not bypass disabled toko features.
- A permission should be unavailable when its required feature is unavailable.
- A permission can be present in role defaults but still locked by feature availability.

Example:

```txt
analytics.view is granted to a user
but analytics.revenue is not available on the toko plan
= access denied with feature/plan lock reason
```

## Deliverables

This phase should produce:

- A list of all current role checks and feature checks.
- A module-by-module access matrix.
- A draft `PermissionKey` taxonomy.
- A draft role-default permission matrix.
- A required-feature mapping for each permission.
- A list of permissions that are not grantable in V1.
- A recommended first migration module.

Suggested output file after audit:

```txt
plans/permission-refactor/phase-0-audit-results.md
```

## Manual Verification

Because this phase should not change runtime behavior, verification is document-focused.

Verify that:

- Every role check found in code has an audit entry.
- Every feature gate found in code has an audit entry.
- Every navigation role/feature condition has an audit entry.
- Every server action with access control has an audit entry.
- Every proposed permission has a module and required feature decision.
- Every sensitive or ownership-level permission has a grantability decision.

## Risks

- Missing server-action checks can create false confidence in the taxonomy.
- Navigation checks may hide access paths that are still reachable by URL.
- Feature gates may currently combine role and plan logic in ways that are hard to separate.
- Some technician access may be assignment-scoped, not just permission-scoped.
- Some admin actions may be operational, while others are ownership-level.

## Exit Criteria

Phase 0 is complete when:

- The permission taxonomy is reviewed and accepted for V1 implementation.
- The first migration module is selected.
- Admin-only and ownership-level guardrails are documented.
- Current access behavior is understood well enough to preserve it in Phase 1 and Phase 2.
- No runtime behavior has changed.
