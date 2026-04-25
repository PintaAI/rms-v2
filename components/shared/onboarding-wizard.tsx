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
  type MonthlyServiceVolume,
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
  RiSettings4Line,
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

type PlannedTeamSize = "ownerOnly" | "smallTeam" | "largerTeam";
type PlanDecision = "free" | "upgrade";

interface WizardData {
  tokoName: string;
  logoFile: File | null;
  address: string;
  phone: string;
  branchPlan: BranchPlan;
  monthlyServiceVolume: MonthlyServiceVolume;
  plannedTeamSize: PlannedTeamSize;
  usesInventory: boolean;
  needsTechnicianAssignment: boolean;
  needsInvoices: boolean;
  needsAnalytics: boolean;
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
  monthlyServiceVolume: "low",
  plannedTeamSize: "ownerOnly",
  usesInventory: false,
  needsTechnicianAssignment: false,
  needsInvoices: false,
  needsAnalytics: false,
  needsAudit: false,
  wantsBranding: false,
  planDecision: "free",
  hasEmployees: false,
  staff: [],
  technician: [],
  themeMode: "default",
};

const steps = [
  { id: 1, title: "Toko Info", description: "Masukkan identitas dasar toko." },
  { id: 2, title: "Survei Kebutuhan", description: "Jawaban ini menentukan rekomendasi fitur dan plan." },
  { id: 3, title: "Rekomendasi", description: "Pilih tetap Free atau lanjut upgrade saat billing tersedia." },
  { id: 4, title: "Team Members", description: "Tambahkan akun tim jika plan aktif mengizinkan." },
  { id: 5, title: "Contact Details", description: "Tambahkan alamat dan nomor telepon opsional." },
  { id: 6, title: "Summary", description: "Review konfigurasi akhir toko." },
];

const planLabels: Record<SubscriptionPlan, string> = {
  free: "Free",
  premium: "Premium",
  enterprise: "Enterprise",
};

export function OnboardingWizard() {
  const router = useRouter();
  const { user, refetchTokoList, refetchSession } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDevUpgrading, setIsDevUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const estimatedTeamCounts = getEstimatedTeamCounts(data.plannedTeamSize);
  const actualTeamCounts = {
    staffCount: data.hasEmployees ? data.staff.length : estimatedTeamCounts.staffCount,
    technicianCount: data.hasEmployees ? data.technician.length : estimatedTeamCounts.technicianCount,
  };
  const recommendation = getOnboardingPlanRecommendation(
    {
      branchPlan: data.branchPlan,
      monthlyServiceVolume: data.monthlyServiceVolume,
      usesInventory: data.usesInventory,
      needsTechnicianAssignment: data.needsTechnicianAssignment,
      needsInvoices: data.needsInvoices,
      needsAnalytics: data.needsAnalytics,
      needsAudit: data.needsAudit,
      wantsBranding: data.wantsBranding,
      staffCount: actualTeamCounts.staffCount,
      technicianCount: actualTeamCounts.technicianCount,
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

    if (currentStep === 1) {
      if (!data.tokoName.trim()) {
        setError("Toko name is required");
        return false;
      }
      if (data.tokoName.trim().length < 2) {
        setError("Toko name must be at least 2 characters");
        return false;
      }
    }

    if (currentStep === 4 && data.hasEmployees && canCreateTeam) {
      for (const staff of data.staff) {
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

      for (const tech of data.technician) {
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

      const allEmails = [...data.staff.map((s) => s.email), ...data.technician.map((t) => t.email)];
      if (allEmails.length !== new Set(allEmails).size) {
        setError("Duplicate emails detected");
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep()) setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const logoUrl = await uploadLogo();
      const shouldCreateTeam = data.hasEmployees && canCreateTeam;
      const result = await createTokoWithUsers({
        name: data.tokoName.trim(),
        logoUrl,
        address: data.address.trim() || undefined,
        phone: data.phone.trim() || undefined,
        staff: shouldCreateTeam ? cleanUsers(data.staff) : [],
        technician: shouldCreateTeam ? cleanUsers(data.technician) : [],
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
          {steps.map((step, idx) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors",
                  currentStep >= step.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 bg-muted text-muted-foreground"
                )}
              >
                {step.id}
              </div>
              {idx < steps.length - 1 && (
                <div className={cn("mx-1 h-0.5 w-6 transition-colors", currentStep > step.id ? "bg-primary" : "bg-muted-foreground/30")} />
              )}
            </div>
          ))}
        </div>
        <CardTitle className="text-center text-lg">{steps[currentStep - 1].title}</CardTitle>
        <CardDescription className="text-center">{steps[currentStep - 1].description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        {currentStep === 1 && renderTokoStep(data, setData, logoPreview, setLogoPreview, handleLogoChange)}
        {currentStep === 2 && <SurveyStep data={data} setData={setData} />}
        {currentStep === 3 && (
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
        {currentStep === 4 && (
          <TeamStep
            data={data}
            setData={setData}
            canCreateTeam={canCreateTeam}
            recommendedPlan={recommendation.recommendedPlan}
          />
        )}
        {currentStep === 5 && <ContactStep data={data} setData={setData} />}
        {currentStep === 6 && (
          <SummaryStep
            data={data}
            recommendation={recommendation}
            currentPlan={currentPlan}
            canCreateTeam={canCreateTeam}
          />
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        {currentStep > 1 ? (
          <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
            Back
          </Button>
        ) : (
          <div />
        )}

        {currentStep < steps.length ? (
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
  return (
    <div className="space-y-5">
      <ChoiceGroup
        label="Berapa toko yang ingin dikelola?"
        options={[
          { value: "one", title: "1 toko", description: "Cukup untuk memulai di Free" },
          { value: "twoToThree", title: "2-3 toko", description: "Cocok dengan Premium" },
          { value: "moreThanThree", title: ">3 toko", description: "Butuh Enterprise" },
        ]}
        value={data.branchPlan}
        onChange={(branchPlan) => setData((prev) => ({ ...prev, branchPlan }))}
      />

      <ChoiceGroup
        label="Seberapa ramai service bulanan?"
        options={[
          { value: "low", title: "Ringan", description: "Kurang dari 50 service" },
          { value: "medium", title: "Sedang", description: "50-200 service" },
          { value: "high", title: "Tinggi", description: "Butuh analytics rutin" },
        ]}
        value={data.monthlyServiceVolume}
        onChange={(monthlyServiceVolume) => setData((prev) => ({ ...prev, monthlyServiceVolume }))}
      />

      <ChoiceGroup
        label="Siapa yang akan memakai sistem?"
        options={[
          { value: "ownerOnly", title: "Pemilik saja", description: "Operasional sederhana" },
          { value: "smallTeam", title: "Tim kecil", description: "Staff dan teknisi terbatas" },
          { value: "largerTeam", title: "Tim besar", description: "Kemungkinan butuh limit Enterprise" },
        ]}
        value={data.plannedTeamSize}
        onChange={(plannedTeamSize) => setData((prev) => ({ ...prev, plannedTeamSize }))}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <SurveySwitch label="Kelola stok sparepart" checked={data.usesInventory} onChange={(usesInventory) => setData((prev) => ({ ...prev, usesInventory }))} />
        <SurveySwitch label="Assign teknisi" checked={data.needsTechnicianAssignment} onChange={(needsTechnicianAssignment) => setData((prev) => ({ ...prev, needsTechnicianAssignment }))} />
        <SurveySwitch label="Buat invoice" checked={data.needsInvoices} onChange={(needsInvoices) => setData((prev) => ({ ...prev, needsInvoices }))} />
        <SurveySwitch label="Analytics revenue" checked={data.needsAnalytics} onChange={(needsAnalytics) => setData((prev) => ({ ...prev, needsAnalytics }))} />
        <SurveySwitch label="Audit gudang" checked={data.needsAudit} onChange={(needsAudit) => setData((prev) => ({ ...prev, needsAudit }))} />
        <SurveySwitch label="Branding dinamis" checked={data.wantsBranding} onChange={(wantsBranding) => setData((prev) => ({ ...prev, wantsBranding }))} />
      </div>
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
  return (
    <div className="space-y-6">
      {!canCreateTeam && (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Plan aktif masih Free, jadi onboarding hanya akan membuat akun pemilik. Rekomendasi Anda adalah {planLabels[recommendedPlan]} jika membutuhkan staff atau teknisi.
        </div>
      )}

      <Field>
        <FieldLabel>Apakah ingin membuat akun karyawan sekarang?</FieldLabel>
        <FieldContent>
          <div className="flex gap-3">
            <TeamModeButton active={!data.hasEmployees} title="Tidak" description="Pemilik saja" onClick={() => setData((prev) => ({ ...prev, hasEmployees: false, staff: [], technician: [] }))} />
            <TeamModeButton active={data.hasEmployees} title="Ya" description="Staff & teknisi" onClick={() => setData((prev) => ({ ...prev, hasEmployees: true }))} disabled={!canCreateTeam} />
          </div>
        </FieldContent>
      </Field>

      {data.hasEmployees && canCreateTeam && (
        <>
          <UserListSection title="Staff" users={data.staff} onAdd={() => setData((prev) => ({ ...prev, staff: [...prev.staff, { ...initialUserData }] }))} onRemove={(index) => setData((prev) => ({ ...prev, staff: prev.staff.filter((_, i) => i !== index) }))} onUpdate={(index, field, value) => setData((prev) => ({ ...prev, staff: prev.staff.map((staff, i) => (i === index ? { ...staff, [field]: value } : staff)) }))} />
          <UserListSection title="Technician" users={data.technician} onAdd={() => setData((prev) => ({ ...prev, technician: [...prev.technician, { ...initialUserData }] }))} onRemove={(index) => setData((prev) => ({ ...prev, technician: prev.technician.filter((_, i) => i !== index) }))} onUpdate={(index, field, value) => setData((prev) => ({ ...prev, technician: prev.technician.map((tech, i) => (i === index ? { ...tech, [field]: value } : tech)) }))} />
        </>
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
  const createdTeamCount = canCreateTeam && data.hasEmployees ? data.staff.length + data.technician.length : 0;
  const planDecisionLabel = isPlanAtLeast(currentPlan, recommendation.recommendedPlan)
    ? "Plan aktif sudah sesuai"
    : data.planDecision === "free"
      ? "Tetap Free"
      : "Upgrade nanti";

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

function SurveySwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <RiSettings4Line className="size-4 text-muted-foreground" />
        <span className="text-sm">{label}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
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

function getEstimatedTeamCounts(plannedTeamSize: PlannedTeamSize) {
  if (plannedTeamSize === "smallTeam") return { staffCount: 1, technicianCount: 1 };
  if (plannedTeamSize === "largerTeam") return { staffCount: 6, technicianCount: 6 };
  return { staffCount: 0, technicianCount: 0 };
}
