"use client";

import * as React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import { signIn, signUp } from "@/lib/auth-client";
import { attachPendingReferralToCurrentUser, attachReferralToCurrentUser, storePendingReferralCode, type ReferralCodePreview } from "@/actions/affiliate";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldDescription, FieldError, FieldGroup, FieldContent } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { RiGoogleFill, RiMailLine, RiLockPasswordLine, RiUserLine, RiEyeLine, RiEyeOffLine, RiLoader4Line } from "@remixicon/react";

const AUTH_REDIRECT_CONTROLLER_PATH = "/auth";

// Validation utilities
interface ValidationErrors {
  email?: string;
  password?: string;
  name?: string;
  confirmPassword?: string;
}

function validateEmail(email: string): string | undefined {
  if (!email.trim()) {
    return "Email wajib diisi";
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Masukkan alamat email yang valid";
  }
  return undefined;
}

function validatePassword(password: string): string | undefined {
  if (!password) {
    return "Password wajib diisi";
  }
  if (password.length < 4) {
    return "Password minimal 4 karakter";
  }
  return undefined;
}

function validateName(name: string): string | undefined {
  if (!name.trim()) {
    return "Nama wajib diisi";
  }
  if (name.trim().length < 2) {
    return "Nama minimal 2 karakter";
  }
  return undefined;
}

function validateConfirmPassword(password: string, confirmPassword: string): string | undefined {
  if (!confirmPassword) {
    return "Konfirmasi password wajib diisi";
  }
  if (password !== confirmPassword) {
    return "Password tidak sama";
  }
  return undefined;
}

interface AuthCardProps {
  defaultTab?: "login" | "register";
  onLoginSuccess?: () => void;
  onRegisterSuccess?: () => void;
  redirectAfterLogin?: string;
  redirectAfterRegister?: string;
  showGoogleAuth?: boolean;
  className?: string;
}

export function AuthCard({
  defaultTab = "login",
  onLoginSuccess,
  onRegisterSuccess,
  redirectAfterLogin = AUTH_REDIRECT_CONTROLLER_PATH,
  redirectAfterRegister = AUTH_REDIRECT_CONTROLLER_PATH,
  showGoogleAuth = true,
  className,
}: AuthCardProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  
  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginServerError, setLoginServerError] = useState<string | undefined>();
  const [loginIsLoading, setLoginIsLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  // Register state
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerServerError, setRegisterServerError] = useState<string | undefined>();
  const [registerIsLoading, setRegisterIsLoading] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralPreview, setReferralPreview] = useState<ReferralCodePreview | null>(null);
  const [referralMessage, setReferralMessage] = useState<string | undefined>();
  const [tabBodyHeight, setTabBodyHeight] = useState<number>();
  const tabBodyRef = React.useRef<HTMLDivElement>(null);

  // Touch tracking for real-time validation
  const [loginTouched, setLoginTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });
  const [registerTouched, setRegisterTouched] = useState<{
    name: boolean;
    email: boolean;
    password: boolean;
    confirmPassword: boolean;
  }>({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const loginErrors: ValidationErrors = {
    email: loginTouched.email ? validateEmail(loginEmail) : undefined,
    password: loginTouched.password ? validatePassword(loginPassword) : undefined,
  };

  const registerErrors: ValidationErrors = {
    name: registerTouched.name ? validateName(registerName) : undefined,
    email: registerTouched.email ? validateEmail(registerEmail) : undefined,
    password: registerTouched.password ? validatePassword(registerPassword) : undefined,
    confirmPassword: registerTouched.confirmPassword
      ? validateConfirmPassword(registerPassword, registerConfirmPassword)
      : undefined,
  };

  React.useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (code) {
      window.setTimeout(() => {
        setActiveTab("register");
        setReferralCode(code.trim().toUpperCase());
      }, 0);
    }
  }, []);

  React.useEffect(() => {
    const code = referralCode.trim().toUpperCase();
    if (!code) {
      const timeout = window.setTimeout(() => {
        setReferralPreview(null);
        setReferralMessage(undefined);
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      const result = await storePendingReferralCode(code);
      if (cancelled) return;

      if (result.success && result.data) {
        setReferralPreview(result.data);
        setReferralMessage(undefined);
      } else {
        setReferralPreview(null);
        setReferralMessage("Kode referral tidak valid atau sudah tidak aktif.");
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [referralCode]);

  React.useLayoutEffect(() => {
    const element = tabBodyRef.current;
    if (!element) return;

    const updateHeight = () => setTabBodyHeight(element.offsetHeight);
    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, [activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginServerError(undefined);
    
    // Validate all fields
    const errors: ValidationErrors = {
      email: validateEmail(loginEmail),
      password: validatePassword(loginPassword),
    };
    setLoginTouched({ email: true, password: true });

    if (Object.values(errors).some((error) => error !== undefined)) {
      return;
    }

    setLoginIsLoading(true);
    try {
      const result = await signIn.email({
        email: loginEmail,
        password: loginPassword,
      });

      if (result.error) {
        setLoginServerError(result.error.message || "Login gagal. Silakan coba lagi.");
        return;
      }

      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        // Use full page reload to ensure session state is properly refreshed
        window.location.href = redirectAfterLogin;
      }
    } catch (error) {
      console.error("Login error:", error);
      setLoginServerError("Terjadi error yang tidak terduga. Silakan coba lagi.");
    } finally {
      setLoginIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterServerError(undefined);

    // Validate all fields
    const errors: ValidationErrors = {
      name: validateName(registerName),
      email: validateEmail(registerEmail),
      password: validatePassword(registerPassword),
      confirmPassword: validateConfirmPassword(registerPassword, registerConfirmPassword),
    };
    setRegisterTouched({ name: true, email: true, password: true, confirmPassword: true });

    if (Object.values(errors).some((error) => error !== undefined)) {
      return;
    }

    setRegisterIsLoading(true);
    try {
      const result = await signUp.email({
        email: registerEmail,
        password: registerPassword,
        name: registerName,
      });

      if (result.error) {
        setRegisterServerError(result.error.message || "Register gagal. Silakan coba lagi.");
        return;
      }

      const attachResult = await attachPendingReferralToCurrentUser();
      if (attachResult.success && !attachResult.data && referralCode.trim()) {
        await attachReferralToCurrentUser(referralCode);
      }

      if (onRegisterSuccess) {
        onRegisterSuccess();
      } else {
        // Use full page reload to ensure session state is properly refreshed
        window.location.href = redirectAfterRegister;
      }
    } catch {
      setRegisterServerError("Terjadi error yang tidak terduga. Silakan coba lagi.");
    } finally {
      setRegisterIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      if (referralCode.trim()) {
        await storePendingReferralCode(referralCode);
      }

      const result = await signIn.social({
        provider: "google",
        callbackURL: redirectAfterLogin,
      });

      if (result.error) {
        setLoginServerError(result.error.message || "Login dengan Google gagal.");
      }
    } catch {
      setLoginServerError("Terjadi error saat login dengan Google.");
    }
  };

  const switchToRegister = () => {
    setActiveTab("register");
    setLoginServerError(undefined);
    setLoginTouched({ email: false, password: false });
  };

  const switchToLogin = () => {
    setActiveTab("login");
    setRegisterServerError(undefined);
    setRegisterTouched({ name: false, email: false, password: false, confirmPassword: false });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", layout: { duration: 0.3 } }}
    >
      <Card className={className}>
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex justify-center">
          <Image src="/rms.png" alt="RMS" width={56} height={56} className="size-14" priority />
        </div>
        <CardTitle className="text-xl">Selamat datang</CardTitle>
        <CardDescription className="text-center">
          Login ke account RMS atau register account baru
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <motion.div
            animate={{ height: tabBodyHeight ?? "auto" }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div ref={tabBodyRef} className="relative">
              <AnimatePresence mode="popLayout" initial={false}>
                {activeTab === "login" ? (
              <motion.form
                key="login-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleLogin}
                className="space-y-8"
              >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="login-email">Email</FieldLabel>
                  <FieldContent>
                    <div className="relative">
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        onBlur={() => setLoginTouched((prev) => ({ ...prev, email: true }))}
                        aria-invalid={!!loginErrors.email}
                        disabled={loginIsLoading}
                        className="pl-10"
                      />
                      <RiMailLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    </div>
                    <FieldError errors={loginErrors.email ? [{ message: loginErrors.email }] : []} />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="login-password">Password</FieldLabel>
                  <FieldContent>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="Masukkan password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        onBlur={() => setLoginTouched((prev) => ({ ...prev, password: true }))}
                        aria-invalid={!!loginErrors.password}
                        disabled={loginIsLoading}
                        className="pl-10 pr-10"
                      />
                      <RiLockPasswordLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showLoginPassword ? (
                          <RiEyeOffLine className="size-4" />
                        ) : (
                          <RiEyeLine className="size-4" />
                        )}
                      </button>
                    </div>
                    <FieldError errors={loginErrors.password ? [{ message: loginErrors.password }] : []} />
                  </FieldContent>
                </Field>
              </FieldGroup>

              {loginServerError && (
                <div className="p-3 rounded-2xl bg-destructive/10 text-destructive text-sm">
                  {loginServerError}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loginIsLoading}>
                {loginIsLoading ? (
                  <>
                    <RiLoader4Line className="size-4 animate-spin" />
                    Sedang login...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
              </motion.form>
                ) : (
                  <motion.div
                    key="register-wrapper"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <form onSubmit={handleRegister} className="space-y-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="register-name">Nama lengkap</FieldLabel>
                  <FieldContent>
                    <div className="relative">
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Budi Santoso"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        onBlur={() => setRegisterTouched((prev) => ({ ...prev, name: true }))}
                        aria-invalid={!!registerErrors.name}
                        disabled={registerIsLoading}
                        className="pl-10"
                      />
                      <RiUserLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    </div>
                    <FieldError errors={registerErrors.name ? [{ message: registerErrors.name }] : []} />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="register-email">Email</FieldLabel>
                  <FieldContent>
                    <div className="relative">
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="you@example.com"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        onBlur={() => setRegisterTouched((prev) => ({ ...prev, email: true }))}
                        aria-invalid={!!registerErrors.email}
                        disabled={registerIsLoading}
                        className="pl-10"
                      />
                      <RiMailLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    </div>
                    <FieldError errors={registerErrors.email ? [{ message: registerErrors.email }] : []} />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="register-password">Password</FieldLabel>
                  <FieldContent>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type={showRegisterPassword ? "text" : "password"}
                        placeholder="Buat password"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        onBlur={() => setRegisterTouched((prev) => ({ ...prev, password: true }))}
                        aria-invalid={!!registerErrors.password}
                        disabled={registerIsLoading}
                        className="pl-10 pr-10"
                      />
                      <RiLockPasswordLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showRegisterPassword ? (
                          <RiEyeOffLine className="size-4" />
                        ) : (
                          <RiEyeLine className="size-4" />
                        )}
                      </button>
                    </div>
                    <FieldError errors={registerErrors.password ? [{ message: registerErrors.password }] : []} />
                    <FieldDescription>
                      Gunakan minimal 4 karakter. Semakin panjang, semakin aman.
                    </FieldDescription>
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="register-confirm-password">Konfirmasi password</FieldLabel>
                  <FieldContent>
                    <div className="relative">
                      <Input
                        id="register-confirm-password"
                        type={showRegisterConfirmPassword ? "text" : "password"}
                        placeholder="Ulangi password"
                        value={registerConfirmPassword}
                        onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                        onBlur={() => setRegisterTouched((prev) => ({ ...prev, confirmPassword: true }))}
                        aria-invalid={!!registerErrors.confirmPassword}
                        disabled={registerIsLoading}
                        className="pl-10 pr-10"
                      />
                      <RiLockPasswordLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <button
                        type="button"
                        onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showRegisterConfirmPassword ? (
                          <RiEyeOffLine className="size-4" />
                        ) : (
                          <RiEyeLine className="size-4" />
                        )}
                      </button>
                    </div>
                    <FieldError
                      errors={registerErrors.confirmPassword ? [{ message: registerErrors.confirmPassword }] : []}
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="register-referral">Kode referral (opsional)</FieldLabel>
                  <FieldContent>
                    <Input
                      id="register-referral"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder="RMS-BUDI-4K8D"
                      disabled={registerIsLoading}
                    />
                    {referralPreview ? (
                      <FieldDescription>Referral aktif: {referralPreview.affiliatorName}</FieldDescription>
                    ) : referralMessage ? (
                      <FieldDescription>{referralMessage}</FieldDescription>
                    ) : null}
                  </FieldContent>
                </Field>
              </FieldGroup>

              {registerServerError && (
                <div className="p-3 rounded-2xl bg-destructive/10 text-destructive text-sm">
                  {registerServerError}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={registerIsLoading}>
                {registerIsLoading ? (
                  <>
                    <RiLoader4Line className="size-4 animate-spin" />
                    Membuat account...
                  </>
                ) : (
                  "Buat Account"
                )}
              </Button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {showGoogleAuth && (
                <>
                <div className="relative my-6">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    atau lanjutkan dengan
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={activeTab === "login" ? loginIsLoading : registerIsLoading}
                >
                  <RiGoogleFill className="size-4" />
                  Lanjutkan dengan Google
                </Button>
              </>
            )}

            <p className="mt-4 text-center text-sm text-muted-foreground">
              {activeTab === "login" ? "Belum punya account?" : "Sudah punya account?"}{" "}
              <button
                type="button"
                onClick={activeTab === "login" ? switchToRegister : switchToLogin}
                className="text-primary hover:underline font-medium"
              >
                {activeTab === "login" ? "Register" : "Login"}
              </button>
            </p>
            </div>
          </motion.div>
        </Tabs>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-xs text-muted-foreground text-center">
          Dengan lanjut, kamu menyetujui Terms of Service dan Privacy Policy RMS
        </p>
      </CardFooter>
      </Card>
    </motion.div>
  );
}

export default AuthCard;
