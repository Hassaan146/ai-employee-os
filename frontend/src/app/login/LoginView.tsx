"use client";

/**
 * Sign-in / sign-up.
 *
 * Both modes are live against backend/app/api/auth.py. Registering also
 * creates the company and makes the first user its ADMIN, which is why the
 * sign-up form asks for a company name.
 */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Card,
  CardBody,
  Field,
  Input,
  cn,
} from "@/components/ui/primitives";
import { IconLogo } from "@/components/ui/icons";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthProvider";

type Mode = "signin" | "signup";

function LoginForm() {
  const { user, loading, signIn, signUp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  // Already signed in — don't show a login form.
  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, user, next, router]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8;
  const canSubmit = emailValid && passwordValid && !submitting;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      if (mode === "signin") {
        await signIn({ email, password });
      } else {
        await signUp({
          email,
          password,
          full_name: fullName.trim() || null,
          company_name: companyName.trim() || null,
        });
      }
      router.replace(next);
    } catch (err) {
      setError(describeAuthError(err, mode));
      setSubmitting(false);
    }
  }

  function switchMode(to: Mode) {
    setMode(to);
    setError(null);
    setTouched(false);
  }

  return (
    <div className="relative z-10 grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <IconLogo className="size-11" />
          <div className="space-y-1">
            <h1 className="text-lg font-semibold tracking-tight text-ink">
              AI Employee OS
            </h1>
            <p className="text-xs text-ink-muted">
              {mode === "signin"
                ? "Sign in to your company workspace"
                : "Create your company workspace"}
            </p>
          </div>
        </div>

        <Card className="animate-fade-up">
          <div className="flex gap-1 border-b border-line-soft p-1.5">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                aria-pressed={mode === m}
                className={cn(
                  "flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  mode === m
                    ? "bg-accent/10 text-accent"
                    : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <CardBody>
            <form className="space-y-4" onSubmit={submit} noValidate>
              {mode === "signup" ? (
                <>
                  <Field label="Your name" htmlFor="full-name">
                    <Input
                      id="full-name"
                      autoComplete="name"
                      placeholder="Amara Osei"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Company name"
                    htmlFor="company-name"
                    hint="Optional — we'll name it after you if left blank."
                  >
                    <Input
                      id="company-name"
                      autoComplete="organization"
                      placeholder="Northwind Trading Co."
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </Field>
                </>
              ) : null}

              <Field
                label="Work email"
                htmlFor="login-email"
                hint={touched && !emailValid ? "Enter a valid email address." : undefined}
              >
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={touched && !emailValid}
                />
              </Field>

              <Field
                label="Password"
                htmlFor="login-password"
                hint={
                  touched && !passwordValid
                    ? "Passwords are at least 8 characters."
                    : undefined
                }
              >
                <Input
                  id="login-password"
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={touched && !passwordValid}
                />
              </Field>

              {error ? (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="rounded-lg border border-danger/25 bg-danger/[0.06] px-3.5 py-2.5"
                >
                  <p className="text-[11px] leading-relaxed text-danger">{error}</p>
                </div>
              ) : null}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={!canSubmit}
              >
                {submitting
                  ? mode === "signin"
                    ? "Signing in…"
                    : "Creating workspace…"
                  : mode === "signin"
                    ? "Sign in"
                    : "Create account"}
              </Button>
            </form>
          </CardBody>
        </Card>

        <p className="text-center text-[11px] text-ink-faint">
          AI Employee OS · Phase 2
        </p>
      </div>
    </div>
  );
}

/** Turn an ApiError into something a person can act on. */
function describeAuthError(err: unknown, mode: Mode): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Incorrect email or password.";
    if (err.status === 400) {
      return mode === "signup"
        ? "An account with this email already exists. Try signing in instead."
        : "This account is inactive. Contact your workspace admin.";
    }
    if (err.status === 422) return "Please check the details you entered.";
    if (err.status === 0) {
      return "Cannot reach the backend. Is it running on port 8000?";
    }
    return `Sign-in failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}

export function LoginView() {
  // useSearchParams needs a Suspense boundary during prerender.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
