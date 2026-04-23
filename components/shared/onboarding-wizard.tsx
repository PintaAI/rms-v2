"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { createTokoWithUsers } from "@/actions/toko";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { RiStore2Line, RiMapPinLine, RiPhoneLine, RiUserLine, RiMailLine, RiLockPasswordLine, RiLoader4Line, RiAddLine, RiCloseLine, RiImageLine, RiPaletteLine, RiTeamLine } from "@remixicon/react";
import { cn } from "@/lib/utils";
import { setThemeMode, type ThemeMode } from "@/lib/theme-preference";

interface UserData {
  name: string;
  email: string;
  password: string;
}

interface WizardData {
  tokoName: string;
  logoUrl: string;
  logoFile: File | null;
  address: string;
  phone: string;
  hasEmployees: boolean;
  staff: UserData[];
  technician: UserData[];
  themeMode: ThemeMode;
}

const initialUserData: UserData = { name: "", email: "", password: "" };

const initialData: WizardData = {
  tokoName: "",
  logoUrl: "",
  logoFile: null,
  address: "",
  phone: "",
  hasEmployees: false,
  staff: [],
  technician: [],
  themeMode: "dynamic",
};

const steps = [
  { id: 1, title: "Toko Info", description: "Enter your toko name and logo" },
  { id: 2, title: "Contact Details", description: "Add address and phone (optional)" },
  { id: 3, title: "Team Members", description: "Add staff and technician (optional)" },
  { id: 4, title: "Summary", description: "Review and confirm" },
];

export function OnboardingWizard() {
  const router = useRouter();
  const { refetchTokoList } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setData(prev => ({ ...prev, logoFile: file }));
      const reader = new FileReader();
      reader.onload = (ev) => {
        setLogoPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (): Promise<string | undefined> => {
    if (!data.logoFile) return undefined;

    const formData = new FormData();
    formData.append("file", data.logoFile);
    formData.append("pathname", `logos/${Date.now()}-${data.logoFile.name}`);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload logo");
      }

      const result = await res.json();
      return result.blob.url;
    } catch (err) {
      console.error("Logo upload error:", err);
      return undefined;
    }
  };

  const addStaff = () => {
    setData(prev => ({ ...prev, staff: [...prev.staff, { ...initialUserData }] }));
  };

  const removeStaff = (index: number) => {
    setData(prev => ({ ...prev, staff: prev.staff.filter((_, i) => i !== index) }));
  };

  const updateStaff = (index: number, field: keyof UserData, value: string) => {
    setData(prev => ({
      ...prev,
      staff: prev.staff.map((s, i) => i === index ? { ...s, [field]: value } : s),
    }));
  };

  const addTechnician = () => {
    setData(prev => ({ ...prev, technician: [...prev.technician, { ...initialUserData }] }));
  };

  const removeTechnician = (index: number) => {
    setData(prev => ({ ...prev, technician: prev.technician.filter((_, i) => i !== index) }));
  };

  const updateTechnician = (index: number, field: keyof UserData, value: string) => {
    setData(prev => ({
      ...prev,
      technician: prev.technician.map((t, i) => i === index ? { ...t, [field]: value } : t),
    }));
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

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

    if (currentStep === 3) {
      if (!data.hasEmployees) {
        return true;
      }
      
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

      const allEmails = [...data.staff.map(s => s.email), ...data.technician.map(t => t.email)];
      const uniqueEmails = new Set(allEmails);
      if (allEmails.length !== uniqueEmails.size) {
        setError("Duplicate emails detected");
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError(null);
  };

  const handleSkip = () => {
    setError(null);
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const logoUrl = await uploadLogo();

      const result = await createTokoWithUsers({
        name: data.tokoName.trim(),
        logoUrl,
        address: data.address.trim() || undefined,
        phone: data.phone.trim() || undefined,
        staff: data.staff.map(s => ({
          name: s.name.trim(),
          email: s.email.trim(),
          password: s.password,
        })),
        technician: data.technician.map(t => ({
          name: t.name.trim(),
          email: t.email.trim(),
          password: t.password,
        })),
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
        <div className="flex items-center justify-center gap-2 mb-4">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  "size-8 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-colors",
                  currentStep >= step.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-muted-foreground/30"
                )}
              >
                {step.id}
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    "w-8 h-0.5 mx-1 transition-colors",
                    currentStep > step.id ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <CardTitle className="text-center text-lg">
          {steps[currentStep - 1].title}
        </CardTitle>
        <CardDescription className="text-center">
          {steps[currentStep - 1].description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Toko Name & Logo */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <Field>
              <FieldLabel>Toko Name</FieldLabel>
              <FieldContent>
                <div className="relative">
                  <Input
                    value={data.tokoName}
                    onChange={(e) => setData(prev => ({ ...prev, tokoName: e.target.value }))}
                    placeholder="Enter your toko name"
                    className="pl-10"
                  />
                  <RiStore2Line className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
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
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="size-16 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setLogoPreview(null);
                          setData(prev => ({ ...prev, logoFile: null, logoUrl: "", themeMode: "default" }));
                        }}
                        className="absolute -top-1 -right-1 size-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                      >
                        <RiCloseLine className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="size-16 rounded-lg bg-muted flex items-center justify-center">
                      <RiImageLine className="size-6 text-muted-foreground" />
                    </div>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="flex-1"
                  />
                </div>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Tema Dinamis</FieldLabel>
              <FieldContent>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <RiPaletteLine className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm">Ekstrak warna dari logo</p>
                      <p className="text-xs text-muted-foreground">
                        {logoPreview 
                          ? "Warna akan diambil dari logo yang diupload" 
                          : "Upload logo untuk menggunakan tema dinamis"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={data.themeMode === "dynamic"}
                    onCheckedChange={(checked) => 
                      setData(prev => ({ ...prev, themeMode: checked ? "dynamic" : "default" }))
                    }
                    disabled={!logoPreview}
                  />
                </div>
              </FieldContent>
            </Field>
          </div>
        )}

        {/* Step 2: Address & Phone */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <Field>
              <FieldLabel>Address (Optional)</FieldLabel>
              <FieldContent>
                <div className="relative">
                  <Input
                    value={data.address}
                    onChange={(e) => setData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Enter address"
                    className="pl-10"
                  />
                  <RiMapPinLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Phone (Optional)</FieldLabel>
              <FieldContent>
                <div className="relative">
                  <Input
                    value={data.phone}
                    onChange={(e) => setData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                    className="pl-10"
                  />
                  <RiPhoneLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
              </FieldContent>
            </Field>
          </div>
        )}

        {/* Step 3: Staff & Technician */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <Field>
              <FieldLabel>Apakah tokonya ada karyawan selain pemilik?</FieldLabel>
              <FieldContent>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setData(prev => ({ ...prev, hasEmployees: false, staff: [], technician: [] }))}
                    className={cn(
                      "flex-1 p-4 rounded-lg border-2 transition-all text-left",
                      !data.hasEmployees 
                        ? "border-primary bg-primary/5" 
                        : "border-muted-foreground/30 hover:border-muted-foreground/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "size-8 rounded-full flex items-center justify-center",
                        !data.hasEmployees ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        <RiUserLine className="size-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Tidak ada</p>
                        <p className="text-xs text-muted-foreground">Pemilik saja</p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setData(prev => ({ ...prev, hasEmployees: true }))}
                    className={cn(
                      "flex-1 p-4 rounded-lg border-2 transition-all text-left",
                      data.hasEmployees 
                        ? "border-primary bg-primary/5" 
                        : "border-muted-foreground/30 hover:border-muted-foreground/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "size-8 rounded-full flex items-center justify-center",
                        data.hasEmployees ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        <RiTeamLine className="size-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Ada karyawan</p>
                        <p className="text-xs text-muted-foreground">Staff & Teknisi</p>
                      </div>
                    </div>
                  </button>
                </div>
              </FieldContent>
            </Field>

            {data.hasEmployees && (
              <>
                {/* Staff Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Staff</h3>
                    <Button variant="outline" size="sm" onClick={addStaff}>
                      <RiAddLine className="size-3" />
                      Add Staff
                    </Button>
                  </div>

                  {data.staff.length === 0 && (
                    <p className="text-xs text-muted-foreground">No staff added. Click &quot;Add Staff&quot; to add one.</p>
                  )}

                  {data.staff.map((staff, index) => (
                    <div key={index} className="p-3 rounded-lg border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">Staff #{index + 1}</span>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeStaff(index)}
                        >
                          <RiCloseLine className="size-3" />
                        </Button>
                      </div>

                      <div className="grid gap-3">
                        <div className="relative">
                          <Input
                            value={staff.name}
                            onChange={(e) => updateStaff(index, "name", e.target.value)}
                            placeholder="Name"
                            className="pl-10"
                          />
                          <RiUserLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        </div>

                        <div className="relative">
                          <Input
                            type="email"
                            value={staff.email}
                            onChange={(e) => updateStaff(index, "email", e.target.value)}
                            placeholder="Email"
                            className="pl-10"
                          />
                          <RiMailLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        </div>

                        <div className="relative">
                          <Input
                            type="password"
                            value={staff.password}
                            onChange={(e) => updateStaff(index, "password", e.target.value)}
                            placeholder="Password"
                            className="pl-10"
                          />
                          <RiLockPasswordLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Technician Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Technician</h3>
                    <Button variant="outline" size="sm" onClick={addTechnician}>
                      <RiAddLine className="size-3" />
                      Add Technician
                    </Button>
                  </div>

                  {data.technician.length === 0 && (
                    <p className="text-xs text-muted-foreground">No technician added. Click &quot;Add Technician&quot; to add one.</p>
                  )}

                  {data.technician.map((tech, index) => (
                    <div key={index} className="p-3 rounded-lg border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">Technician #{index + 1}</span>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeTechnician(index)}
                        >
                          <RiCloseLine className="size-3" />
                        </Button>
                      </div>

                      <div className="grid gap-3">
                        <div className="relative">
                          <Input
                            value={tech.name}
                            onChange={(e) => updateTechnician(index, "name", e.target.value)}
                            placeholder="Name"
                            className="pl-10"
                          />
                          <RiUserLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        </div>

                        <div className="relative">
                          <Input
                            type="email"
                            value={tech.email}
                            onChange={(e) => updateTechnician(index, "email", e.target.value)}
                            placeholder="Email"
                            className="pl-10"
                          />
                          <RiMailLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        </div>

                        <div className="relative">
                          <Input
                            type="password"
                            value={tech.password}
                            onChange={(e) => updateTechnician(index, "password", e.target.value)}
                            placeholder="Password"
                            className="pl-10"
                          />
                          <RiLockPasswordLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {!data.hasEmployees && (
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground">
                  Anda bisa menambahkan karyawan kapan saja melalui menu Pengaturan.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Summary */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg border space-y-3">
              <h3 className="text-sm font-medium">Toko Information</h3>
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{data.tokoName}</span>
                </div>
                {logoPreview && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Logo:</span>
                    {/* Local data URL preview from FileReader; next/image is unnecessary here. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoPreview} alt="Logo" className="size-8 rounded object-cover" />
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Theme:</span>
                  <span className="font-medium capitalize">{data.themeMode === "dynamic" ? "Dinamis" : "Default"}</span>
                </div>
                {data.address && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Address:</span>
                    <span>{data.address}</span>
                  </div>
                )}
                {data.phone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{data.phone}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Karyawan:</span>
                  <span className="font-medium">
                    {data.hasEmployees 
                      ? `${data.staff.length + data.technician.length} orang`
                      : "Pemilik saja"}
                  </span>
                </div>
              </div>
            </div>

            {data.staff.length > 0 && (
              <div className="p-4 rounded-lg border space-y-3">
                <h3 className="text-sm font-medium">Staff ({data.staff.length})</h3>
                <div className="space-y-2">
                  {data.staff.map((staff, index) => (
                    <div key={index} className="text-xs flex justify-between">
                      <span>{staff.name}</span>
                      <span className="text-muted-foreground">{staff.email}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.technician.length > 0 && (
              <div className="p-4 rounded-lg border space-y-3">
                <h3 className="text-sm font-medium">Technician ({data.technician.length})</h3>
                <div className="space-y-2">
                  {data.technician.map((tech, index) => (
                    <div key={index} className="text-xs flex justify-between">
                      <span>{tech.name}</span>
                      <span className="text-muted-foreground">{tech.email}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.staff.length === 0 && data.technician.length === 0 && (
              <p className="text-xs text-muted-foreground text-center">
                No team members added. You can add them later in settings.
              </p>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        {currentStep > 1 && (
          <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
            Back
          </Button>
        )}

        {currentStep < 4 && (
          <div className="flex gap-2">
            {currentStep === 2 && (
              <Button variant="ghost" onClick={handleSkip} disabled={isSubmitting}>
                Skip
              </Button>
            )}
            <Button onClick={handleNext} disabled={isSubmitting}>
              Next
            </Button>
          </div>
        )}

        {currentStep === 4 && (
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
