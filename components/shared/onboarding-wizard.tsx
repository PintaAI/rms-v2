"use client";

import { useState } from "react";
import type React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { createTokoWithUsers } from "@/actions/toko";
import { setDevUserPlan } from "@/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { setThemeMode, type ThemeMode } from "@/lib/theme-preference";
import { FEATURE_REGISTRY, isPlanAtLeast, type FeatureKey, type SubscriptionPlan } from "@/lib/features";
import {
  getOnboardingPlanRecommendation,
  type BranchPlan,
  type TeamSize,
  type TeamAccess,
} from "@/lib/onboarding-recommendation";
import {
  RiAddLine,
  RiBarChartBoxLine,
  RiCheckboxCircleLine,
  RiCloseLine,
  RiImageLine,
  RiLockPasswordLine,
  RiMailLine,
  RiMapPinLine,
  RiPaletteLine,
  RiPhoneLine,
  RiStore2Line,
  RiTeamLine,
  RiUserLine,
  RiVipCrownLine,
  RiLoader4Line,
} from "@remixicon/react";

interface UserData {
  name: string;
  email: string;
  password: string;
}

type PlanDecision = "free" | "upgrade";
type StepKey = "toko" | "survey" | "recommendation" | "team" | "contact" | "summary";

interface WizardData {
  tokoName: string;
  logoFile: File | null;
  address: string;
  phone: string;
  branchPlan: BranchPlan;
  teamSize: TeamSize;
  teamAccess: TeamAccess;
  usesInventory: boolean;
  needsInvoices: boolean;
  needsAnalyticsAndLogs: boolean;
  needsAudit: boolean;
  wantsBranding: boolean;
  planDecision: PlanDecision;
  hasEmployees: boolean;
  staff: UserData[];
  technician: UserData[];
  themeMode: ThemeMode;
}

const initialUserData: UserData = { name: "", email: "", password: "" };

const initialData: WizardData = {
  tokoName: "",
  logoFile: null,
  address: "",
  phone: "",
  branchPlan: "one",
  teamSize: "ownerOnly",
  teamAccess: "none",
  usesInventory: false,
  needsInvoices: false,
  needsAnalyticsAndLogs: false,
  needsAudit: false,
  wantsBranding: false,
  planDecision: "free",
  hasEmployees: false,
  staff: [],
  technician: [],
  themeMode: "default",
};

const allSteps: { key: StepKey; title: string; description: string }[] = [
  { key: "toko", title: "Toko Info", description: "Masukkan identitas dasar toko." },
  { key: "survey", title: "Survei Kebutuhan", description: "Jawaban ini menentukan rekomendasi fitur dan plan." },
  { key: "recommendation", title: "Rekomendasi", description: "Pilih tetap Free atau lanjut upgrade saat billing tersedia." },
  { key: "team", title: "Team Members", description: "Tambahkan akun tim jika plan aktif mengizinkan." },
  { key: "contact", title: "Contact Details", description: "Tambahkan alamat dan nomor telepon opsional." },
  { key: "summary", title: "Summary", description: "Review konfigurasi akhir toko." },
];

const planLabels: Record<SubscriptionPlan, string> = {
  free: "Free",
  premium: "Premium",
  enterprise: "Enterprise",
};

export function OnboardingWizard() {
  const router = useRouter();
  const { user, refetchTokoList, refetchSession } = useAuth();
  const [currentStepKey, setCurrentStepKey] = useState<StepKey>("toko");
  const [data, setData] = useState<WizardData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDevUpgrading, setIsDevUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const visibleSteps = allSteps.filter((step) => {
    if (step.key === "team" && data.teamSize === "ownerOnly") return false;
    return true;
  });
  const currentStepIndex = visibleSteps.findIndex((step) => step.key === currentStepKey);
  const currentStep = visibleSteps[currentStepIndex];

  const estimatedTeamCounts = getEstimatedTeamCounts(data.teamSize, data.teamAccess);
  const recommendation = getOnboardingPlanRecommendation(
    {
      branchPlan: data.branchPlan,
      teamSize: data.teamSize,
      teamAccess: data.teamAccess,
      usesInventory: data.usesInventory,
      needsInvoices: data.needsInvoices,
      needsAnalyticsAndLogs: data.needsAnalyticsAndLogs,
      needsAudit: data.needsAudit,
      wantsBranding: data.wantsBranding,
      staffCount: estimatedTeamCounts.staffCount,
      technicianCount: estimatedTeamCounts.technicianCount,
    },
    user?.plan
  );
  const currentPlan = user?.plan ?? "free";
  const canCreateTeam = isPlanAtLeast(currentPlan, "premium");
  const isRecommendedPlanActive = isPlanAtLeast(currentPlan, recommendation.recommendedPlan);

  const handleDevUpgrade = async () => {
    setIsDevUpgrading(true);
    setError(null);
    try {
      const result = await setDevUserPlan(recommendation.recommendedPlan);
      if (result.success) {
        await refetchSession();
        await refetchTokoList();
        setError(null);
      } else {
        setError(result.error || "Failed to upgrade plan");
      }
    } catch (err) {
      console.error("Dev upgrade error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsDevUpgrading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setData((prev) => ({ ...prev, logoFile: file, wantsBranding: true, themeMode: "dynamic" }));
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadLogo = async (): Promise<string | undefined> => {
    if (!data.logoFile) return undefined;

    const formData = new FormData();
    formData.append("file", data.logoFile);
    formData.append("pathname", `logos/${Date.now()}-${data.logoFile.name}`);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to upload logo");
      const result = await res.json();
      return result.blob.url;
    } catch (err) {
      console.error("Logo upload error:", err);
      return undefined;
    }
  };

  const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateStep = (): boolean => {
    setError(null);

    if (currentStepKey === "toko") {
      if (!data.tokoName.trim()) {
        setError("Toko name is required");
        return false;
      }
      if (data.tokoName.trim().length < 2) {
        setError("Toko name must be at least 2 characters");
        return false;
      }
    }

    if (currentStepKey === "team" && canCreateTeam) {
      const hasMembers = data.staff.length > 0 || data.technician.length > 0;
      if (!hasMembers) {
        setError("Tambahkan minimal satu anggota tim");
        return false;
      }
      const staffToValidate = shouldUseStaff(data.teamAccess) ? data.staff : [];
      const technicianToValidate = shouldUseTechnician(data.teamAccess) ? data.technician : [];

      for (const staff of staffToValidate) {
        if (!staff.name.trim() || !staff.email.trim() || !staff.password) {
          setError("All staff fields are required");
          return false;
        }
        if (!validateEmail(staff.email)) {
          setError("Invalid staff email format");
          return false;
        }
        if (staff.password.length < 4) {
          setError("Staff password must be at least 4 characters");
          return false;
        }
      }

      for (const tech of technicianToValidate) {
        if (!tech.name.trim() || !tech.email.trim() || !tech.password) {
          setError("All technician fields are required");
          return false;
        }
        if (!validateEmail(tech.email)) {
          setError("Invalid technician email format");
          return false;
        }
        if (tech.password.length < 4) {
          setError("Technician password must be at least 4 characters");
          return false;
        }
      }

      const allEmails = [...staffToValidate.map((s) => s.email), ...technicianToValidate.map((t) => t.email)];
      if (allEmails.length !== new Set(allEmails).size) {
        setError("Duplicate emails detected");
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < visibleSteps.length) {
        setCurrentStepKey(visibleSteps[nextIndex].key);
      }
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStepKey(visibleSteps[prevIndex].key);
    }
    setError(null);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const logoUrl = await uploadLogo();
      const hasMembers = data.staff.length > 0 || data.technician.length > 0;
      const shouldCreateTeam = hasMembers && canCreateTeam;
      const staff = shouldCreateTeam && shouldUseStaff(data.teamAccess) ? cleanUsers(data.staff) : [];
      const technician = shouldCreateTeam && shouldUseTechnician(data.teamAccess) ? cleanUsers(data.technician) : [];
      const result = await createTokoWithUsers({
        name: data.tokoName.trim(),
        logoUrl,
        address: data.address.trim() || undefined,
        phone: data.phone.trim() || undefined,
        staff,
        technician,
        disabledFeatures: recommendation.recommendedDisabledFeatures,
      });

      if (!result.success) {
        setError(result.error || "Failed to create toko");
        setIsSubmitting(false);
        return;
      }

      setThemeMode(data.themeMode);
      await refetchTokoList();
      router.push(`/${result.tokoId}/admin`);
    } catch (err) {
      console.error("Submit error:", err);
      setError("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="mb-4 flex items-center justify-center gap-2">
          {visibleSteps.map((step, idx) => (
            <div key={step.key} className="flex items-center">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors",
                  currentStepIndex >= idx
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 bg-muted text-muted-foreground"
                )}
              >
                {idx + 1}
              </div>
              {idx < visibleSteps.length - 1 && (
                <div className={cn("mx-1 h-0.5 w-6 transition-colors", currentStepIndex > idx ? "bg-primary" : "bg-muted-foreground/30")} />
              )}
            </div>
          ))}
        </div>
        <CardTitle className="text-center text-lg">{currentStep?.title}</CardTitle>
        <CardDescription className="text-center">{currentStep?.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        {currentStepKey === "toko" && renderTokoStep(data, setData, logoPreview, setLogoPreview, handleLogoChange)}
        {currentStepKey === "survey" && <SurveyStep data={data} setData={setData} />}
        {currentStepKey === "recommendation" && (
          <RecommendationStep
            currentPlan={currentPlan}
            recommendation={recommendation}
            decision={data.planDecision}
            isRecommendedPlanActive={isRecommendedPlanActive}
            setDecision={(planDecision) => setData((prev) => ({ ...prev, planDecision }))}
            onDevUpgrade={handleDevUpgrade}
            isDevUpgrading={isDevUpgrading}
          />
        )}
        {currentStepKey === "team" && (
          <TeamStep
            data={data}
            setData={setData}
            canCreateTeam={canCreateTeam}
            recommendedPlan={recommendation.recommendedPlan}
          />
        )}
        {currentStepKey === "contact" && <ContactStep data={data} setData={setData} />}
        {currentStepKey === "summary" && (
          <SummaryStep
            data={data}
            recommendation={recommendation}
            currentPlan={currentPlan}
            canCreateTeam={canCreateTeam}
          />
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        {currentStepIndex > 0 ? (
          <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
            Back
          </Button>
        ) : (
          <div />
        )}

        {currentStepIndex < visibleSteps.length - 1 ? (
          <Button onClick={handleNext} disabled={isSubmitting}>
            Next
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <RiLoader4Line className="size-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Toko"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function renderTokoStep(
  data: WizardData,
  setData: React.Dispatch<React.SetStateAction<WizardData>>,
  logoPreview: string | null,
  setLogoPreview: React.Dispatch<React.SetStateAction<string | null>>,
  handleLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void
) {
  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel>Toko Name</FieldLabel>
        <FieldContent>
          <div className="relative">
            <Input
              value={data.tokoName}
              onChange={(e) => setData((prev) => ({ ...prev, tokoName: e.target.value }))}
              placeholder="Enter your toko name"
              className="pl-10"
            />
            <RiStore2Line className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>Logo (Optional)</FieldLabel>
        <FieldContent>
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <div className="relative">
                {/* Local data URL preview from FileReader; next/image is unnecessary here. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoPreview} alt="Logo preview" className="size-16 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setLogoPreview(null);
                    setData((prev) => ({ ...prev, logoFile: null, wantsBranding: false, themeMode: "default" }));
                  }}
                  className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                >
                  <RiCloseLine className="size-3" />
                </button>
              </div>
            ) : (
              <div className="flex size-16 items-center justify-center rounded-lg bg-muted">
                <RiImageLine className="size-6 text-muted-foreground" />
              </div>
            )}
            <Input type="file" accept="image/*" onChange={handleLogoChange} className="flex-1" />
          </div>
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>Tema Dinamis</FieldLabel>
        <FieldContent>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <RiPaletteLine className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm">Ekstrak warna dari logo</p>
                <p className="text-xs text-muted-foreground">
                  {logoPreview ? "Warna akan diambil dari logo yang diupload" : "Upload logo untuk menggunakan tema dinamis"}
                </p>
              </div>
            </div>
            <Switch
              checked={data.themeMode === "dynamic"}
              onCheckedChange={(checked) =>
                setData((prev) => ({ ...prev, themeMode: checked ? "dynamic" : "default", wantsBranding: checked }))
              }
              disabled={!logoPreview}
            />
          </div>
        </FieldContent>
      </Field>
    </div>
  );
}

function SurveyStep({ data, setData }: WizardStepProps) {
  const handleTeamSizeChange = (teamSize: TeamSize) => {
    if (teamSize === "ownerOnly") {
      setData((prev) => ({ ...prev, teamSize, teamAccess: "none", hasEmployees: false, staff: [], technician: [] }));
    } else {
      setData((prev) => ({ ...prev, teamSize, teamAccess: prev.teamAccess === "none" ? "staffAndTechnician" : prev.teamAccess }));
    }
  };

  const handleUsesInventoryChange = (usesInventory: boolean) => {
    if (!usesInventory) {
      setData((prev) => ({ ...prev, usesInventory, needsAudit: false }));
    } else {
      setData((prev) => ({ ...prev, usesInventory }));
    }
  };

  return (
    <div className="space-y-5">
      <ChoiceGroup
        label="Apakah bisnismu punya cabang, atau hanya satu cabang saja?"
        options={[
          { value: "one", title: "Satu cabang saja", description: "Cukup untuk memulai di Free" },
          { value: "twoToThree", title: "2-3 cabang", description: "Cocok dengan Premium" },
          { value: "moreThanThree", title: "Lebih dari 3 cabang", description: "Butuh Enterprise" },
        ]}
        value={data.branchPlan}
        onChange={(branchPlan) => setData((prev) => ({ ...prev, branchPlan: branchPlan as BranchPlan }))}
      />

      <ChoiceGroup
        label="Ada berapa banyak orang di bisnismu sekarang?"
        options={[
          { value: "ownerOnly", title: "Hanya saya sendiri", description: "Operasional sederhana" },
          { value: "smallTeam", title: "1-5 orang", description: "Tim kecil" },
          { value: "largerTeam", title: "Lebih dari 5 orang", description: "Kemungkinan butuh limit Enterprise" },
        ]}
        value={data.teamSize}
        onChange={handleTeamSizeChange}
      />

      {data.teamSize !== "ownerOnly" && (
        <ChoiceGroup
          label="Siapa saja yang perlu akses sistem?"
          options={[
            { value: "staffOnly", title: "Staff/admin toko saja", description: "Workflow staff" },
            { value: "technicianOnly", title: "Teknisi saja", description: "Workflow teknisi" },
            { value: "staffAndTechnician", title: "Staff dan teknisi", description: "Keduanya" },
          ]}
          value={data.teamAccess}
          onChange={(teamAccess) => setData((prev) => ({ ...prev, teamAccess: teamAccess as TeamAccess }))}
        />
      )}

      <ChoiceGroup
        label="Apakah bisnismu butuh manajemen inventory/sparepart?"
        options={[
          { value: "true", title: "Ya, perlu stok sparepart", description: "Kelola inventory dan stok" },
          { value: "false", title: "Tidak, cukup input item manual", description: "Item manual tanpa inventory" },
        ]}
        value={data.usesInventory ? "true" : "false"}
        onChange={(value) => handleUsesInventoryChange(value === "true")}
      />

      {data.usesInventory && (
        <ChoiceGroup
          label="Apakah bisnismu butuh audit inventory atau stok fisik?"
          options={[
            { value: "false", title: "Tidak perlu audit", description: "Inventory management saja" },
            { value: "true", title: "Ya, perlu audit stok", description: "Fitur Enterprise" },
          ]}
          value={data.needsAudit ? "true" : "false"}
          onChange={(value) => setData((prev) => ({ ...prev, needsAudit: value === "true" }))}
        />
      )}

      <ChoiceGroup
        label="Apakah bisnismu butuh statistik dan pantauan proses manajemen?"
        options={[
          { value: "false", title: "Tidak dulu", description: "Tanpa analytics" },
          { value: "true", title: "Ya, perlu pantauan", description: "Analytics dan activity log" },
        ]}
        value={data.needsAnalyticsAndLogs ? "true" : "false"}
        onChange={(value) => setData((prev) => ({ ...prev, needsAnalyticsAndLogs: value === "true" }))}
      />

      <ChoiceGroup
        label="Apakah bisnismu butuh invoice service?"
        options={[
          { value: "false", title: "Tidak perlu invoice", description: "Tanpa invoice" },
          { value: "true", title: "Ya, perlu invoice", description: "Buat dan kelola invoice" },
        ]}
        value={data.needsInvoices ? "true" : "false"}
        onChange={(value) => setData((prev) => ({ ...prev, needsInvoices: value === "true" }))}
      />
    </div>
  );
}

function RecommendationStep({
  currentPlan,
  recommendation,
  decision,
  isRecommendedPlanActive,
  setDecision,
  onDevUpgrade,
  isDevUpgrading,
}: {
  currentPlan: SubscriptionPlan;
  recommendation: ReturnType<typeof getOnboardingPlanRecommendation>;
  decision: PlanDecision;
  isRecommendedPlanActive: boolean;
  setDecision: (decision: PlanDecision) => void;
  onDevUpgrade?: () => void;
  isDevUpgrading?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <RiVipCrownLine className="size-5 text-primary" />
            <p className="font-medium">Rekomendasi: {planLabels[recommendation.recommendedPlan]}</p>
          </div>
          <Badge variant={isRecommendedPlanActive ? "success" : "outline"}>
            Current: {planLabels[currentPlan]}
          </Badge>
        </div>
        <div className="mt-3 grid gap-2 text-sm">
          {recommendation.reasons.map((reason) => (
            <div key={reason} className="flex gap-2 text-muted-foreground">
              <RiCheckboxCircleLine className="mt-0.5 size-4 shrink-0" />
              <span>{reason}</span>
            </div>
          ))}
        </div>
      </div>

      <FeatureSummary title="Fitur yang direkomendasikan" features={recommendation.recommendedFeatures} emptyLabel="Fitur Free sudah cukup untuk kebutuhan ini." />

      {!isRecommendedPlanActive && (
        <>
          <Separator />
          <div className="grid gap-3 sm:grid-cols-2">
            <DecisionCard
              title="Tetap Free"
              description="Toko tetap dibuat sekarang. Fitur berbayar tetap terkunci oleh gate yang sudah ada."
              active={decision === "free"}
              onClick={() => setDecision("free")}
              disabled={isDevUpgrading}
            />
            <DecisionCard
              title="Upgrade sekarang (DEV)"
              description="DEV: Langsung set plan tanpa payment flow. Hapus sebelum production."
              active={decision === "upgrade" || (isDevUpgrading ?? false)}
              onClick={onDevUpgrade}
              disabled={isDevUpgrading ?? false}
              loading={isDevUpgrading ?? false}
            />
          </div>
          <FeatureSummary title="Tetap terkunci jika Free" features={recommendation.lockedIfFree} emptyLabel="Tidak ada fitur penting yang terkunci di Free." muted />
        </>
      )}
    </div>
  );
}

function TeamStep({ data, setData, canCreateTeam, recommendedPlan }: WizardStepProps & { canCreateTeam: boolean; recommendedPlan: SubscriptionPlan }) {
  const canAddStaff = data.teamAccess === "staffOnly" || data.teamAccess === "staffAndTechnician";
  const canAddTechnician = data.teamAccess === "technicianOnly" || data.teamAccess === "staffAndTechnician";
  const teamDescription = data.teamAccess === "staffOnly" ? "Staff/admin toko" : data.teamAccess === "technicianOnly" ? "Teknisi" : "Staff & teknisi";

  return (
    <div className="space-y-6">
      {!canCreateTeam && (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Plan aktif masih Free, jadi onboarding hanya akan membuat akun pemilik. Rekomendasi Anda adalah {planLabels[recommendedPlan]} jika membutuhkan staff atau teknisi.
        </div>
      )}

      {canAddStaff && (
        <UserListSection title="Staff" users={data.staff} onAdd={() => setData((prev) => ({ ...prev, staff: [...prev.staff, { ...initialUserData }] }))} onRemove={(index) => setData((prev) => ({ ...prev, staff: prev.staff.filter((_, i) => i !== index) }))} onUpdate={(index, field, value) => setData((prev) => ({ ...prev, staff: prev.staff.map((staff, i) => (i === index ? { ...staff, [field]: value } : staff)) }))} />
      )}
      {canAddTechnician && (
        <UserListSection title="Technician" users={data.technician} onAdd={() => setData((prev) => ({ ...prev, technician: [...prev.technician, { ...initialUserData }] }))} onRemove={(index) => setData((prev) => ({ ...prev, technician: prev.technician.filter((_, i) => i !== index) }))} onUpdate={(index, field, value) => setData((prev) => ({ ...prev, technician: prev.technician.map((tech, i) => (i === index ? { ...tech, [field]: value } : tech)) }))} />
      )}
    </div>
  );
}

function ContactStep({ data, setData }: WizardStepProps) {
  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel>Address (Optional)</FieldLabel>
        <FieldContent>
          <div className="relative">
            <Input value={data.address} onChange={(e) => setData((prev) => ({ ...prev, address: e.target.value }))} placeholder="Enter address" className="pl-10" />
            <RiMapPinLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>Phone (Optional)</FieldLabel>
        <FieldContent>
          <div className="relative">
            <Input value={data.phone} onChange={(e) => setData((prev) => ({ ...prev, phone: e.target.value }))} placeholder="Enter phone number" className="pl-10" />
            <RiPhoneLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </FieldContent>
      </Field>
    </div>
  );
}

function SummaryStep({
  data,
  recommendation,
  currentPlan,
  canCreateTeam,
}: {
  data: WizardData;
  recommendation: ReturnType<typeof getOnboardingPlanRecommendation>;
  currentPlan: SubscriptionPlan;
  canCreateTeam: boolean;
}) {
  const hasMembers = data.staff.length > 0 || data.technician.length > 0;
  const createdTeamCount = canCreateTeam && hasMembers ? data.staff.length + data.technician.length : 0;
  const planDecisionLabel = isPlanAtLeast(currentPlan, recommendation.recommendedPlan)
    ? "Plan aktif sudah sesuai"
    : data.planDecision === "free"
      ? "Tetap Free"
      : "Upgrade nanti";

  const branchLabel = data.branchPlan === "one" ? "Satu cabang" : data.branchPlan === "twoToThree" ? "2-3 cabang" : "Lebih dari 3 cabang";
  const teamLabel = data.teamSize === "ownerOnly" ? "Hanya pemilik" : data.teamAccess === "staffOnly" ? "Staff saja" : data.teamAccess === "technicianOnly" ? "Teknisi saja" : "Staff dan teknisi";
  const inventoryLabel = data.usesInventory ? "Stok sparepart" : "Item manual tanpa inventory";

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-medium">Toko Information</h3>
        <div className="mt-3 grid gap-2 text-xs">
          <SummaryRow label="Name" value={data.tokoName} />
          <SummaryRow label="Current plan" value={planLabels[currentPlan]} />
          <SummaryRow label="Recommended plan" value={planLabels[recommendation.recommendedPlan]} />
          <SummaryRow label="Decision" value={planDecisionLabel} />
          <SummaryRow label="Theme" value={data.themeMode === "dynamic" ? "Dinamis" : "Default"} />
          <SummaryRow label="Karyawan dibuat" value={createdTeamCount > 0 ? `${createdTeamCount} orang` : "Tidak ada"} />
          {data.address && <SummaryRow label="Address" value={data.address} />}
          {data.phone && <SummaryRow label="Phone" value={data.phone} />}
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-medium">Survei Kebutuhan</h3>
        <div className="mt-3 grid gap-2 text-xs">
          <SummaryRow label="Cabang" value={branchLabel} />
          <SummaryRow label="Tim" value={teamLabel} />
          <SummaryRow label="Inventory" value={inventoryLabel} />
          {data.usesInventory && <SummaryRow label="Audit inventory" value={data.needsAudit ? "Ya" : "Tidak"} />}
          <SummaryRow label="Statistik dan pantauan" value={data.needsAnalyticsAndLogs ? "Ya" : "Tidak"} />
          <SummaryRow label="Invoice" value={data.needsInvoices ? "Ya" : "Tidak"} />
        </div>
      </div>

      <FeatureSummary title="Fitur aktif yang diprioritaskan" features={recommendation.recommendedFeatures} emptyLabel="Konfigurasi dasar Free akan digunakan." />
      {recommendation.recommendedDisabledFeatures.length > 0 && (
        <FeatureSummary title="Fitur opsional yang dimatikan otomatis" features={recommendation.recommendedDisabledFeatures} emptyLabel="Tidak ada." muted />
      )}
    </div>
  );
}

type WizardStepProps = {
  data: WizardData;
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
};

function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; title: string; description: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <FieldContent>
        <div className="grid gap-2 sm:grid-cols-3">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-lg border-2 p-3 text-left transition-all",
                value === option.value ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-muted-foreground/50"
              )}
            >
              <p className="text-sm font-medium">{option.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
            </button>
          ))}
        </div>
      </FieldContent>
    </Field>
  );
}

function DecisionCard({ title, description, active, onClick, disabled, loading }: { title: string; description: string; active: boolean; onClick?: () => void; disabled?: boolean; loading?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn("rounded-lg border-2 p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50", active ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-muted-foreground/50")}>
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">{title}</p>
        {loading && <RiLoader4Line className="size-4 animate-spin" />}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

function TeamModeButton({ active, title, description, onClick, disabled }: { active: boolean; title: string; description: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn("flex-1 rounded-lg border-2 p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50", active ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-muted-foreground/50")}>
      <div className="flex items-center gap-3">
        <div className={cn("flex size-8 items-center justify-center rounded-full", active ? "bg-primary text-primary-foreground" : "bg-muted")}>
          {title === "Ya" ? <RiTeamLine className="size-4" /> : <RiUserLine className="size-4" />}
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  );
}

function UserListSection({
  title,
  users,
  onAdd,
  onRemove,
  onUpdate,
}: {
  title: string;
  users: UserData[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof UserData, value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <RiAddLine className="size-3" />
          Add {title}
        </Button>
      </div>
      {users.length === 0 && <p className="text-xs text-muted-foreground">No {title.toLowerCase()} added.</p>}
      {users.map((person, index) => (
        <div key={index} className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">{title} #{index + 1}</span>
            <Button variant="ghost" size="icon-xs" onClick={() => onRemove(index)}>
              <RiCloseLine className="size-3" />
            </Button>
          </div>
          <IconInput icon="user" value={person.name} onChange={(value) => onUpdate(index, "name", value)} placeholder="Name" />
          <IconInput icon="mail" type="email" value={person.email} onChange={(value) => onUpdate(index, "email", value)} placeholder="Email" />
          <IconInput icon="password" type="password" value={person.password} onChange={(value) => onUpdate(index, "password", value)} placeholder="Password" />
        </div>
      ))}
    </div>
  );
}

function IconInput({ icon, value, onChange, placeholder, type = "text" }: { icon: "user" | "mail" | "password"; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
  const Icon = icon === "user" ? RiUserLine : icon === "mail" ? RiMailLine : RiLockPasswordLine;
  return (
    <div className="relative">
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-10" />
      <Icon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function FeatureSummary({ title, features, emptyLabel, muted }: { title: string; features: FeatureKey[]; emptyLabel: string; muted?: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <RiBarChartBoxLine className="size-4 text-muted-foreground" />
        <p className="text-sm font-medium">{title}</p>
      </div>
      {features.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="grid gap-2">
          {features.map((feature) => {
            const metadata = FEATURE_REGISTRY[feature];
            return (
              <div key={feature} className="flex items-start gap-3 rounded-lg border p-3">
                <RiCheckboxCircleLine className={cn("mt-0.5 size-4 shrink-0", muted ? "text-muted-foreground" : "text-green-600")} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{metadata.label}</p>
                    <Badge variant={muted ? "outline" : "secondary"}>{planLabels[metadata.minimumPlan]}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{metadata.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function cleanUsers(users: UserData[]): UserData[] {
  return users.map((user) => ({ name: user.name.trim(), email: user.email.trim(), password: user.password }));
}

function shouldUseStaff(teamAccess: TeamAccess) {
  return teamAccess === "staffOnly" || teamAccess === "staffAndTechnician";
}

function shouldUseTechnician(teamAccess: TeamAccess) {
  return teamAccess === "technicianOnly" || teamAccess === "staffAndTechnician";
}

function getEstimatedTeamCounts(teamSize: TeamSize, teamAccess: TeamAccess) {
  if (teamSize === "ownerOnly" || teamAccess === "none") return { staffCount: 0, technicianCount: 0 };

  const baseCounts = teamSize === "smallTeam" ? 1 : 6;

  if (teamAccess === "staffOnly") return { staffCount: baseCounts, technicianCount: 0 };
  if (teamAccess === "technicianOnly") return { staffCount: 0, technicianCount: baseCounts };
  return { staffCount: baseCounts, technicianCount: baseCounts };
}
