# Technician Workflow Assignment Cleanup

## Goal

Make `technician.workflow` the single feature gate for technician-related service assignment. When the feature is unavailable, the UI should hide technician assignment affordances entirely instead of showing a disabled or redundant assignment feature.

## Desired Behavior

- Free plan admins do not see the technician column in service tables.
- Premium or Enterprise admins who disable `technician.workflow` do not see the technician column in service tables.
- Admins and staff can assign technicians only when `technician.workflow` is enabled for the toko.
- `service.technicianAssignment` is removed as a configurable feature because it duplicates `technician.workflow`.
- Existing stored disabled feature values for `service.technicianAssignment` can be ignored by the existing parser after the feature key is removed.

## Scope

### Feature Registry

- Remove `service.technicianAssignment` from `FeatureKey` in `lib/features.ts`.
- Remove the `service.technicianAssignment` registry entry from `FEATURE_REGISTRY`.
- Keep `technician.workflow` as configurable and Premium-gated.

### Server Enforcement

- Update `assignTechnician` in `actions/service-mutations.ts` to enforce `technician.workflow` instead of `service.technicianAssignment`.
- Update `getTechniciansByToko` in `actions/service-queries.ts` to enforce `technician.workflow` before returning technician options.
- Consider also enforcing `technician.workflow` for technician self-service actions such as `takeService`, `getAvailableTasks`, `getMyTasks`, and `getTechnicianDashboard` so direct server action calls follow the same gate as the technician pages.

### Service Table UI

- Add a table-level prop such as `hideTechnicianColumn` to `ServiceTable`.
- Filter the `technician` column out before rendering headers, cells, width calculations, and the column settings dropdown.
- In `ManageService`, read `featureAccess["technician.workflow"]` via `useFeatureAccess()`.
- Pass `hideTechnicianColumn={!technicianWorkflowEnabled}` to `ServiceTable`.
- Disable technician assignment when `technicianWorkflowEnabled` is false.
- Remove admin page logic that checks `disabledFeatures.includes("service.technicianAssignment")`.

### Onboarding Recommendation

- Remove `service.technicianAssignment` from `optionalFeatureKeys` in `lib/onboarding-recommendation.ts`.
- When the survey says technician assignment is needed, add `technician.workflow` instead.
- Update recommendation copy to describe technician workflow rather than a separate assignment feature.

### Documentation And Plan Cleanup

- Search source files for remaining `service.technicianAssignment` references and remove or replace them.
- Update planning docs only where they describe current intended behavior.
- Ignore `.next` build artifacts during cleanup.

## Acceptance Criteria

- Free plan admin service table does not render the `Teknisi` column.
- Premium admin with `technician.workflow` disabled does not render the `Teknisi` column.
- Premium admin with `technician.workflow` enabled can see the `Teknisi` column and assign technicians.
- Server actions reject technician assignment when `technician.workflow` is plan-locked or disabled by toko.
- Feature settings no longer show a separate `Assignment Teknisi` toggle.
- `bun run lint` passes.
- `bun run build` passes.

## Notes

- A database migration is not required for existing disabled feature JSON. Once `service.technicianAssignment` is removed from `FeatureKey`, `parseDisabledFeatures` will filter it out.
- If historical cleanup is desired later, a small data script can remove `service.technicianAssignment` from existing `TokoFeatureSetting.disabledFeatures` JSON values.
