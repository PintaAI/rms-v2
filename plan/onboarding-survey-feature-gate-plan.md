# Onboarding Survey Feature Gate Alignment Plan

## Goal

Refine onboarding so every survey question maps clearly to the existing feature gate model. The survey should ask business-friendly questions, then translate answers behind the scenes into feature recommendations, plan recommendations, and toko feature settings.

This plan does not introduce new feature gates. It only aligns onboarding with the gates that already exist in `lib/features.ts`.

## Existing Feature Gates In Scope

| Feature key | Label | Min plan | Configurable | Survey source |
| --- | --- | --- | --- | --- |
| `service.manualItems` | Tambah Invoice Manual | free | yes | Auto-enabled when inventory is not needed |
| `inventory.management` | Manajemen Inventory | premium | yes | Inventory question |
| `karyawan.management` | Manajemen Karyawan | premium | yes | Team size question |
| `staff.workflow` | Workflow Staff | premium | yes | Team access question |
| `technician.workflow` | Workflow Teknisi | premium | yes | Team access question |
| `service.invoice` | Invoice Service | free | yes | Invoice question |
| `activityLog.view` | Activity Log | premium | yes | Statistics/monitoring question |
| `analytics.revenue` | Revenue Analytics | premium | yes | Statistics/monitoring question |
| `inventory.audit` | Audit Gudang | enterprise | yes | Audit question, only when inventory is needed |

## Existing Plan Limits In Scope

| Limit key | Free | Premium | Enterprise | Survey source |
| --- | --- | --- | --- | --- |
| `maxTokos` | 1 | 3 | unlimited | Branch question |
| `maxStaff` | 0 | 5 | unlimited | Team size + team access question |
| `maxTechnicians` | 0 | 5 | unlimited | Team size + team access question |

## New Survey Flow

### 1. Branch / Multi-Toko

Question:

> Apakah bisnismu punya cabang, atau hanya satu cabang saja?

Options:

| Option | Internal value | Behind-the-scenes effect |
| --- | --- | --- |
| Satu cabang saja | `one` | Free can be enough |
| 2-3 cabang | `twoToThree` | Recommend Premium because Free only allows 1 toko |
| Lebih dari 3 cabang | `moreThanThree` | Recommend Enterprise because Premium only allows 3 toko |

Maps to:

| Gate type | Key |
| --- | --- |
| Plan limit | `maxTokos` |

### 2. Current Team Size

Question:

> Ada berapa banyak orang di bisnismu sekarang? Contoh: staff kasir, admin toko, atau teknisi.

Options:

| Option | Internal value | Behind-the-scenes effect |
| --- | --- | --- |
| Hanya saya sendiri | `ownerOnly` | No team feature needed |
| 1-5 orang | `smallTeam` | Recommend Premium if staff/technician access is selected |
| Lebih dari 5 orang | `largerTeam` | Recommend Enterprise if staff/technician access is selected |

Maps to:

| Gate type | Key |
| --- | --- |
| Feature | `karyawan.management` |
| Plan limit | `maxStaff` |
| Plan limit | `maxTechnicians` |

Dynamic rule:

If the user selects `ownerOnly`, hide the team access question and force team access to none.

### 3. Team Access Type

Question:

> Siapa saja yang perlu akses sistem?

Only shown when current team size is not `ownerOnly`.

Options:

| Option | Internal value | Behind-the-scenes effect |
| --- | --- | --- |
| Staff/admin toko saja | `staffOnly` | Enable staff workflow |
| Teknisi saja | `technicianOnly` | Enable technician workflow |
| Staff dan teknisi | `staffAndTechnician` | Enable both workflows |

Maps to:

| Gate type | Key |
| --- | --- |
| Feature | `karyawan.management` |
| Feature | `staff.workflow` when staff access is selected |
| Feature | `technician.workflow` when technician access is selected |

Team count mapping for recommendation only:

| Team size | Staff only | Technician only | Staff and technician |
| --- | --- | --- | --- |
| `ownerOnly` | 0 staff, 0 technicians | 0 staff, 0 technicians | 0 staff, 0 technicians |
| `smallTeam` | 1 staff, 0 technicians | 0 staff, 1 technician | 1 staff, 1 technician |
| `largerTeam` | 6 staff, 0 technicians | 0 staff, 6 technicians | 6 staff, 6 technicians |

This preserves the current lightweight onboarding approach without requiring exact employee counts during setup.

### 4. Inventory Management

Question:

> Apakah bisnismu butuh manajemen inventory/sparepart?

Options:

| Option | Internal value | Behind-the-scenes effect |
| --- | --- | --- |
| Ya, perlu stok sparepart | `true` | Enable `inventory.management`; recommend Premium |
| Tidak, cukup input item manual | `false` | Enable `service.manualItems`; no paid plan required |

Maps to:

| Gate type | Key |
| --- | --- |
| Feature | `inventory.management` when answer is yes |
| Feature | `service.manualItems` when answer is no |

Important rule:

If inventory is not needed, onboarding should treat manual service item as the intended workflow. This prevents service pricing from depending on inventory data.

### 5. Inventory Audit

Question:

> Apakah bisnismu butuh audit inventory atau stok fisik?

Only shown when inventory management is needed.

Options:

| Option | Internal value | Behind-the-scenes effect |
| --- | --- | --- |
| Tidak perlu audit | `false` | Inventory management only |
| Ya, perlu audit stok | `true` | Enable `inventory.audit`; recommend Enterprise |

Maps to:

| Gate type | Key |
| --- | --- |
| Feature | `inventory.audit` |

Dynamic rule:

If inventory is not needed, hide this question and force `needsAudit` to `false`.

### 6. Statistics And Process Monitoring

Question:

> Apakah bisnismu butuh statistik dan pantauan proses manajemen?

Options:

| Option | Internal value | Behind-the-scenes effect |
| --- | --- | --- |
| Tidak dulu | `false` | No analytics/log recommendation |
| Ya, perlu pantauan | `true` | Enable analytics and activity log; recommend Premium |

Maps to:

| Gate type | Key |
| --- | --- |
| Feature | `analytics.revenue` |
| Feature | `activityLog.view` |

### 7. Invoice

Question:

> Apakah bisnismu butuh invoice service?

Options:

| Option | Internal value | Behind-the-scenes effect |
| --- | --- | --- |
| Tidak perlu invoice | `false` | Disable invoice when configurable for the plan |
| Ya, perlu invoice | `true` | Enable `service.invoice` |

Maps to:

| Gate type | Key |
| --- | --- |
| Feature | `service.invoice` |

Note:

`service.invoice` currently has `minimumPlan: "free"`, so it should not force Premium. The current recommendation logic says invoice requires Premium, which should be corrected.

## Recommended Wizard State Changes

Current state fields:

```ts
branchPlan: BranchPlan;
monthlyServiceVolume: MonthlyServiceVolume;
plannedTeamSize: PlannedTeamSize;
usesInventory: boolean;
needsTechnicianAssignment: boolean;
needsInvoices: boolean;
needsAnalytics: boolean;
needsAudit: boolean;
wantsBranding: boolean;
```

Recommended state fields:

```ts
branchPlan: BranchPlan;
teamSize: TeamSize;
teamAccess: TeamAccess;
usesInventory: boolean;
needsInvoices: boolean;
needsAnalyticsAndLogs: boolean;
needsAudit: boolean;
wantsBranding: boolean;
```

New types:

```ts
type TeamSize = "ownerOnly" | "smallTeam" | "largerTeam";
type TeamAccess = "none" | "staffOnly" | "technicianOnly" | "staffAndTechnician";
```

Fields to remove or fold into new fields:

| Field | Action | Reason |
| --- | --- | --- |
| `monthlyServiceVolume` | Remove from survey | It does not map directly to a feature gate after the new question set |
| `plannedTeamSize` | Rename to `teamSize` | Keeps business language clear |
| `needsTechnicianAssignment` | Replace with `teamAccess` | Workflow should be based on who needs access |
| `needsAnalytics` | Rename to `needsAnalyticsAndLogs` | Better maps to `analytics.revenue` + `activityLog.view` |

## Recommendation Engine Changes

File: `lib/onboarding-recommendation.ts`

### Input Shape

Current input:

```ts
export interface OnboardingSurveyAnswers {
  branchPlan: BranchPlan;
  monthlyServiceVolume: MonthlyServiceVolume;
  usesInventory: boolean;
  needsTechnicianAssignment: boolean;
  needsInvoices: boolean;
  needsAnalytics: boolean;
  needsAudit: boolean;
  wantsBranding: boolean;
  staffCount: number;
  technicianCount: number;
}
```

Recommended input:

```ts
export interface OnboardingSurveyAnswers {
  branchPlan: BranchPlan;
  teamSize: TeamSize;
  teamAccess: TeamAccess;
  usesInventory: boolean;
  needsInvoices: boolean;
  needsAnalyticsAndLogs: boolean;
  needsAudit: boolean;
  wantsBranding: boolean;
  staffCount: number;
  technicianCount: number;
}
```

### Feature Mapping Rules

```ts
if (answers.branchPlan === "twoToThree") {
  requirePlan("premium", "Anda berencana mengelola 2-3 cabang.");
}

if (answers.branchPlan === "moreThanThree") {
  requirePlan("enterprise", "Kebutuhan cabang melewati batas Premium.");
}

if (answers.staffCount > 0 || answers.technicianCount > 0) {
  neededFeatures.add("karyawan.management");
  requirePlan("premium", "Akses staff atau teknisi membutuhkan fitur manajemen karyawan.");
}

if (answers.staffCount > 0) {
  neededFeatures.add("staff.workflow");
}

if (answers.technicianCount > 0) {
  neededFeatures.add("technician.workflow");
}

if (answers.staffCount > premiumStaffLimit || answers.technicianCount > premiumTechnicianLimit) {
  requirePlan("enterprise", "Jumlah tim melewati batas Premium.");
}

if (answers.usesInventory) {
  neededFeatures.add("inventory.management");
  requirePlan("premium", "Manajemen inventory/sparepart membutuhkan Premium.");
} else {
  neededFeatures.add("service.manualItems");
}

if (answers.usesInventory && answers.needsAudit) {
  neededFeatures.add("inventory.audit");
  requirePlan("enterprise", "Audit stok gudang adalah fitur Enterprise.");
}

if (answers.needsAnalyticsAndLogs) {
  neededFeatures.add("activityLog.view");
  neededFeatures.add("analytics.revenue");
  requirePlan("premium", "Statistik dan pantauan proses membutuhkan fitur analytics dan activity log Premium.");
}

if (answers.needsInvoices) {
  neededFeatures.add("service.invoice");
}
```

### Correction Needed

Current logic incorrectly raises invoice to Premium:

```ts
if (answers.needsInvoices) {
  neededFeatures.add("service.invoice");
  requirePlan("premium", "Invoice service tersedia mulai Premium.");
}
```

But `service.invoice` is currently `minimumPlan: "free"`, so the corrected logic should add the feature without calling `requirePlan("premium", ...)`.

## Dynamic UI Rules

| Condition | UI behavior | State reset |
| --- | --- | --- |
| `teamSize === "ownerOnly"` | Hide team access question | Set `teamAccess = "none"` |
| `teamSize !== "ownerOnly"` | Show team access question | Keep or default to `staffAndTechnician` |
| `usesInventory === false` | Hide audit question | Set `needsAudit = false` |
| `usesInventory === true` | Show audit question | Keep selected audit answer |

## Dynamic Wizard Step Rules

The wizard should also hide whole setup steps when they are not relevant.

| Condition | Wizard behavior | Reason |
| --- | --- | --- |
| `teamSize === "ownerOnly"` | Completely hide the Team Members step | Owner-only businesses should not see staff/technician creation UI |
| `teamSize !== "ownerOnly"` | Show the Team Members step | User indicated they have staff, technicians, or both |
| `canCreateTeam === false` and team is needed | Show the Team Members step with plan explanation, but do not allow creating users | The user needs team features, but the active plan cannot create staff/technician accounts |

Implementation detail:

The `steps` array should become dynamic instead of static. Step rendering and navigation should use the filtered list so the progress indicator, Back/Next behavior, and final Summary all stay consistent.

Recommended approach:

```ts
const visibleSteps = steps.filter((step) => {
  if (step.key === "team" && data.teamSize === "ownerOnly") return false;
  return true;
});
```

Because current code uses numeric `currentStep`, implementation should either:

1. Convert step tracking to a stable step key like `"toko" | "survey" | "recommendation" | "team" | "contact" | "summary"`.
2. Or keep numeric steps but derive the active step from `visibleSteps[currentStepIndex]` instead of hardcoded IDs.

Preferred option: use stable step keys. It avoids bugs when steps are hidden dynamically.

## Behind-The-Scenes Behavior

The UI should not expose internal feature key names to users. The survey should ask business questions, then the recommendation engine should translate answers into:

| User-facing concept | Internal output |
| --- | --- |
| Cabang | Plan recommendation via `maxTokos` |
| Orang/tim | `karyawan.management`, `staff.workflow`, `technician.workflow`, staff/technician counts |
| Inventory | `inventory.management` or `service.manualItems` |
| Audit stok | `inventory.audit` |
| Statistik dan pantauan proses | `analytics.revenue`, `activityLog.view` |
| Invoice | `service.invoice` |

## Summary Step Changes

The summary should show business-language answers, not raw feature names.

Recommended summary rows:

| Label | Example value |
| --- | --- |
| Cabang | Satu cabang / 2-3 cabang / Lebih dari 3 cabang |
| Tim | Hanya pemilik / Staff saja / Teknisi saja / Staff dan teknisi |
| Inventory | Stok sparepart / Item manual tanpa inventory |
| Audit inventory | Ya / Tidak |
| Statistik dan pantauan | Ya / Tidak |
| Invoice | Ya / Tidak |

Feature cards can still use `FeatureSummary` because it reads labels from `FEATURE_REGISTRY`.

## Files To Modify

| File | Required changes |
| --- | --- |
| `components/shared/onboarding-wizard.tsx` | Update survey UI, state shape, dynamic question rendering, recommendation input, summary labels |
| `lib/onboarding-recommendation.ts` | Update answer types and feature mapping logic |
| `lib/features.ts` | No feature key changes expected |
| `actions/toko.ts` | No changes expected |

## Implementation Order

1. Update `lib/onboarding-recommendation.ts` types and mapping logic.
2. Update `components/shared/onboarding-wizard.tsx` state fields and recommendation call.
3. Convert wizard step navigation to dynamic visible steps using stable step keys.
4. Replace the current survey question UI with the new business-question flow.
5. Add dynamic reset behavior for hidden dependent questions.
6. Hide the Team Members step entirely when `teamSize === "ownerOnly"`.
7. Update the summary step to reflect the new survey fields.
8. Run `bun run lint`.
9. Run `bun run build`.

## Acceptance Criteria

- Survey questions use business language and do not expose feature keys.
- Every configurable feature gate is either explicitly asked or intentionally derived.
- If inventory is not needed, `service.manualItems` is included in `recommendedFeatures`.
- If inventory is not needed, audit is hidden and `needsAudit` is false.
- If inventory is needed, `inventory.management` is included and Premium is recommended.
- If inventory audit is needed, `inventory.audit` is included and Enterprise is recommended.
- If team is owner-only, no staff/technician workflow is recommended.
- If team is owner-only, the Team Members creation step is completely hidden.
- If team access includes staff, `staff.workflow` is included.
- If team access includes technician, `technician.workflow` is included.
- If statistics/monitoring is needed, both `analytics.revenue` and `activityLog.view` are included.
- If invoice is needed, `service.invoice` is included but does not force Premium unless the feature registry changes later.
- `recommendedDisabledFeatures` only disables configurable features available on the current plan and not selected/derived by the survey.

## Open Questions Before Implementation

1. Should the team question stay coarse (`1-5`, `>5`) or ask exact counts for staff and technicians?
2. Should invoice remain a visible question, or should invoice be enabled by default for all toko because it is Free?
3. Should branding/dynamic theme stay in the survey step, or remain tied only to logo upload in the toko info step?
