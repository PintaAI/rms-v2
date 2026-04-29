# Service Detail Card Refactor Plan

## Goal

Refactor the current `ServiceTaskCard` into `ServiceDetailCard` because the component is used as the service detail/workflow UI across admin, staff, and technician screens, not only as a technician task card.

The refactor should improve naming, folder structure, and maintainability without changing behavior.

## Current State

Current file:

- `components/dashboard/services/service-task-card.tsx`

Current exports:

- `ServiceTaskCard`
- `ServiceTaskCardProps`
- `ServiceTaskItem`

Current consumers:

- `components/dashboard/services/manage-service.tsx`
- `components/dashboard/services/staff-manage-service.tsx`
- `components/dashboard/services/teknisi-task-manager.tsx`
- `components/dashboard/teknisi/teknisi-overview.tsx`

Current responsibilities:

- Displays selected service details in bottom sheet views.
- Shows customer, device, complaint, included items, password/pattern, and IMEI.
- Shows repair items and total.
- Handles add/remove repair item flows.
- Handles status changes: `received`, `repairing`, `done`, and `failed`.
- Handles invoice payment.
- Handles pickup/handoff.
- Handles WhatsApp contact.
- Uses optimistic local state with pending mutation guards.
- Uses role-specific actions for admin, staff, and technician.

## Naming Decision

Use `ServiceDetailCard`.

Reasons:

- More accurate than `ServiceTaskCard`.
- Safe from confusion with `ServiceCardDemo`, which is only a user manual demo.
- Distinct enough from `ServiceDetail`, which is an action/data type.
- Consistent with `ServiceTable` as a sibling service UI component.

New folder:

- `components/dashboard/services/service-detail-card/`

New public import:

```ts
import { ServiceDetailCard } from "@/components/dashboard/services/service-detail-card";
```

## Phase 1: Rename And Move Only

Keep this phase behavior-preserving.

### Add Files

- `components/dashboard/services/service-detail-card/index.ts`
- `components/dashboard/services/service-detail-card/service-detail-card.tsx`

### Remove File

- `components/dashboard/services/service-task-card.tsx`

### Rename Symbols

- `ServiceTaskCard` -> `ServiceDetailCard`
- `ServiceTaskCardProps` -> `ServiceDetailCardProps`
- `ServiceTaskItem` -> `ServiceDetailCardItem`

### Rename Main Prop

Rename the main prop from `task` to `service`.

Before:

```tsx
<ServiceTaskCard task={selectedService} />
```

After:

```tsx
<ServiceDetailCard service={selectedService} />
```

### Internal Rename Targets

Rename internal state and refs for clarity:

- `task` -> `service`
- `localTask` -> `localService`
- `setLocalTask` -> `setLocalService`
- `localTaskRef` -> `localServiceRef`
- `taskPropRef` -> `servicePropRef`
- `taskFingerprint` -> `serviceFingerprint`

Keep these callback prop names unchanged because they are still clear:

- `onAddItem`
- `onRemoveItem`
- `onRefresh`
- `onStatusChange`

### Public API

Create `components/dashboard/services/service-detail-card/index.ts`:

```ts
export { ServiceDetailCard } from "./service-detail-card";
export type {
  ServiceDetailCardItem,
  ServiceDetailCardProps,
} from "./service-detail-card";
```

### Consumer Updates

Update imports and JSX usage in:

- `components/dashboard/services/manage-service.tsx`
- `components/dashboard/services/staff-manage-service.tsx`
- `components/dashboard/services/teknisi-task-manager.tsx`
- `components/dashboard/teknisi/teknisi-overview.tsx`

Example:

```tsx
import { ServiceDetailCard } from "@/components/dashboard/services/service-detail-card";
```

```tsx
<ServiceDetailCard
  service={selectedService}
  variant={["done", "failed"].includes(selectedService.status) ? "completed" : "active"}
  viewerRole="admin"
  onRefresh={handleRefreshDetail}
  onStatusChange={() => router.refresh()}
/>
```

## Phase 1 Verification

Search for old names:

```bash
rg "ServiceTaskCard|ServiceTaskCardProps|ServiceTaskItem|service-task-card" .
```

Expected result:

- No matches.

Run checks:

```bash
bun run lint
bun run build
```

Expected result:

- Lint passes.
- Build passes.

## Phase 2: Split Into Smaller Files

Only start this after Phase 1 passes.

Target folder:

- `components/dashboard/services/service-detail-card/`

Suggested structure:

- `index.ts`
- `service-detail-card.tsx`
- `types.ts`
- `constants.ts`
- `utils.ts`
- `service-detail-header.tsx`
- `service-device-info.tsx`
- `repair-items-table.tsx`
- `service-completion-actions.tsx`
- `customer-handoff-actions.tsx`
- `pattern-lock-dialog.tsx`
- `undo-status-dialog.tsx`
- `completion-note-dialog.tsx`

### `types.ts`

Move shared types:

- `ServiceDetailCardItem`
- `ServiceDetailCardProps`
- Viewer role type if useful.
- Variant type if useful.

### `constants.ts`

Move static display config:

- `roleToneClasses`
- `statusColors`
- `statusLabels`

### `utils.ts`

Move pure helpers:

- `parsePatternString`
- WhatsApp number normalization helper, if extracted.

### `service-detail-header.tsx`

Owns:

- Device title.
- Status badge.
- Technician badge.
- Pickup badge.
- Invoice badge.
- Customer name and WhatsApp number.
- Check-in date.
- Add item button.
- Undo button.

### `service-device-info.tsx`

Owns:

- Complaint.
- Included items.
- Password/pattern display.
- IMEI display.

### `repair-items-table.tsx`

Owns:

- Repair items table.
- Empty repair items state.
- Total amount display.
- Remove item button.

### `service-completion-actions.tsx`

Owns active repair actions:

- WhatsApp.
- Mark as failed.
- Mark as done.

### `customer-handoff-actions.tsx`

Owns completed service handoff actions:

- Pay invoice.
- WhatsApp.
- Mark picked up.

### Dialog Components

Move dialogs into smaller components:

- Pattern lock dialog.
- Undo status dialog.
- Done note dialog.
- Failed note dialog.

If done and failed dialogs remain nearly identical, use one reusable `CompletionNoteDialog`.

## Phase 2 Constraints

Preserve behavior exactly:

- Keep optimistic update behavior.
- Keep pending mutation sync guard.
- Keep `useFeatureAccess` behavior.
- Keep inventory/pricelist fetch behavior.
- Keep role-specific permissions.
- Keep admin/staff customer handoff behavior.
- Keep technician completion behavior.
- Keep existing copy unless intentionally changed later.
- Do not introduce new UI library dependencies.
- Do not introduce `lucide-react`.
- Keep shadcn and Remix Icon conventions.

## Phase 2 Verification

After each meaningful split, run:

```bash
bun run lint
```

After the full split, run:

```bash
bun run lint
bun run build
```

Also search:

```bash
rg "localTask|taskPropRef|ServiceTask|service-task-card" components/dashboard
```

Expected result:

- No old names remain unless intentionally kept in unrelated contexts.

## Risks

### Behavior Regression In Optimistic Updates

Mitigation:

- Phase 1 should be rename/move only.
- Phase 2 should move JSX and helpers gradually.
- Keep mutation logic in `ServiceDetailCard` until visual pieces are stable.

### Type Mismatch With `ServiceDetail`

Mitigation:

- Keep `ServiceDetailCardItem` shape compatible with current `ServiceDetail` data.
- Do not import action-layer types directly unless it clearly reduces duplication without creating layering issues.

### Too Many Props After Splitting

Mitigation:

- Split presentational sections first.
- Keep mutation handlers and state in `ServiceDetailCard`.
- Only extract logic hooks if there is clear reuse or complexity reduction.

### Import Path Churn

Mitigation:

- Use folder-level `index.ts` as the public API.
- Consumers should import only from `@/components/dashboard/services/service-detail-card`.

## Completion Criteria

The refactor is complete when:

- `ServiceTaskCard` no longer exists.
- `ServiceDetailCard` is used in all current detail sheet consumers.
- The public import path is folder-based.
- Old file path `service-task-card` has no references.
- `bun run lint` passes.
- `bun run build` passes.
- Phase 1 behavior is unchanged.
- Phase 2, if executed, leaves the component easier to maintain without changing behavior.
