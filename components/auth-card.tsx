"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldDescription, FieldError, FieldGroup, FieldContent } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { RiGoogleFill, RiMailLine, RiLockPasswordLine, RiUserLine, RiEyeLine, RiEyeOffLine, RiLoader4Line } from "@remixicon/react";

// Validation utilities
interface ValidationErrors {
  email?: string;
  password?: string;
  name?: string;
  confirmPassword?: string;
}

function validateEmail(email: string): string | undefined {
  if (!email.trim()) {
    return "Email is required";
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address";
  }
  return undefined;
}

function validatePassword(password: string): string | undefined {
  if (!password) {
    return "Password is required";
  }
  if (password.length < 4) {
    return "Password must be at least 4 characters";
  }
  return undefined;
}

function validateName(name: string): string | undefined {
  if (!name.trim()) {
    return "Name is required";
  }
  if (name.trim().length < 2) {
    return "Name must be at least 2 characters";
  }
  return undefined;
}

function validateConfirmPassword(password: string, confirmPassword: string): string | undefined {
  if (!confirmPassword) {
    return "Please confirm your password";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match";
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
  redirectAfterLogin = "/dashboard",
  redirectAfterRegister = "/dashboard",
  showGoogleAuth = true,
  className,
}: AuthCardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  
  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginErrors, setLoginErrors] = useState<ValidationErrors>({});
  const [loginServerError, setLoginServerError] = useState<string | undefined>();
  const [loginIsLoading, setLoginIsLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  // Register state
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerErrors, setRegisterErrors] = useState<ValidationErrors>({});
  const [registerServerError, setRegisterServerError] = useState<string | undefined>();
  const [registerIsLoading, setRegisterIsLoading] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);

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

  // Real-time validation for login
  React.useEffect(() => {
    if (loginTouched.email) {
      setLoginErrors((prev) => ({ ...prev, email: validateEmail(loginEmail) }));
    }
  }, [loginEmail, loginTouched.email]);

  React.useEffect(() => {
    if (loginTouched.password) {
      setLoginErrors((prev) => ({ ...prev, password: validatePassword(loginPassword) }));
    }
  }, [loginPassword, loginTouched.password]);

  // Real-time validation for register
  React.useEffect(() => {
    if (registerTouched.name) {
      setRegisterErrors((prev) => ({ ...prev, name: validateName(registerName) }));
    }
  }, [registerName, registerTouched.name]);

  React.useEffect(() => {
    if (registerTouched.email) {
      setRegisterErrors((prev) => ({ ...prev, email: validateEmail(registerEmail) }));
    }
  }, [registerEmail, registerTouched.email]);

  React.useEffect(() => {
    if (registerTouched.password) {
      setRegisterErrors((prev) => ({ ...prev, password: validatePassword(registerPassword) }));
    }
  }, [registerPassword, registerTouched.password]);

  React.useEffect(() => {
    if (registerTouched.confirmPassword) {
      setRegisterErrors((prev) => ({
        ...prev,
        confirmPassword: validateConfirmPassword(registerPassword, registerConfirmPassword),
      }));
    }
  }, [registerPassword, registerConfirmPassword, registerTouched.confirmPassword]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginServerError(undefined);
    
    // Validate all fields
    const errors: ValidationErrors = {
      email: validateEmail(loginEmail),
      password: validatePassword(loginPassword),
    };
    setLoginErrors(errors);
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
        setLoginServerError(result.error.message || "Login failed. Please try again.");
        return;
      }

      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        // Use full page reload to ensure session state is properly refreshed
        window.location.href = redirectAfterLogin;
      }
    } catch (error) {
      setLoginServerError("An unexpected error occurred. Please try again.");
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
    setRegisterErrors(errors);
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
        setRegisterServerError(result.error.message || "Registration failed. Please try again.");
        return;
      }

      if (onRegisterSuccess) {
        onRegisterSuccess();
      } else {
        // Use full page reload to ensure session state is properly refreshed
        window.location.href = redirectAfterRegister;
      }
    } catch (error) {
      setRegisterServerError("An unexpected error occurred. Please try again.");
    } finally {
      setRegisterIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signIn.social({
        provider: "google",
        callbackURL: redirectAfterLogin,
      });

      if (result.error) {
        setLoginServerError(result.error.message || "Google sign in failed.");
      }
    } catch (error) {
      setLoginServerError("An unexpected error occurred with Google sign in.");
    }
  };

  const switchToRegister = () => {
    setActiveTab("register");
    setLoginErrors({});
    setLoginServerError(undefined);
    setLoginTouched({ email: false, password: false });
  };

  const switchToLogin = () => {
    setActiveTab("login");
    setRegisterErrors({});
    setRegisterServerError(undefined);
    setRegisterTouched({ name: false, email: false, password: false, confirmPassword: false });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-center text-xl">Welcome</CardTitle>
        <CardDescription className="text-center">
          Sign in to your account or create a new one
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Sign Up</TabsTrigger>
          </TabsList>

          {/* Login Form */}
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-8">
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
                        placeholder="Enter your password"
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
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            {showGoogleAuth && (
              <>
                <div className="relative my-6">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    or continue with
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={loginIsLoading}
                >
                  <RiGoogleFill className="size-4" />
                  Continue with Google
                </Button>
              </>
            )}

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={switchToRegister}
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </button>
            </p>
          </TabsContent>

          {/* Register Form */}
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="register-name">Full Name</FieldLabel>
                  <FieldContent>
                    <div className="relative">
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="John Doe"
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
                        placeholder="Create a strong password"
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
                      Must be at least 8 characters with uppercase, lowercase, and a number
                    </FieldDescription>
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="register-confirm-password">Confirm Password</FieldLabel>
                  <FieldContent>
                    <div className="relative">
                      <Input
                        id="register-confirm-password"
                        type={showRegisterConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
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
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            {showGoogleAuth && (
              <>
                <div className="relative my-6">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    or continue with
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={registerIsLoading}
                >
                  <RiGoogleFill className="size-4" />
                  Continue with Google
                </Button>
              </>
            )}

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                onClick={switchToLogin}
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </button>
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-xs text-muted-foreground text-center">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </CardFooter>
    </Card>
  );
}

export default AuthCard;