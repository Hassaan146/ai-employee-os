"use client";

/**
 * Sign-in screen.
 *
 * The backend has a User model with a hashed_password column and a SECRET_KEY /
 * token-expiry config, but no auth endpoints yet. So this screen is the layout
 * and validation only — it does not authenticate, and it says so plainly rather
 * than faking a session.
 */

import { useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Field,
  Input,
} from "@/components/ui/primitives";
import { IconLogo } from "@/components/ui/icons";

export function LoginView() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8;

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
              Sign in to your company workspace
            </p>
          </div>
        </div>

        <Card className="animate-fade-up">
          <CardBody className="space-y-4">
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setTouched(true);
              }}
            >
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
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>

              <Button type="submit" variant="primary" className="w-full" disabled>
                Sign in
              </Button>
            </form>

            <div className="space-y-2 rounded-lg border border-warn/25 bg-warn/[0.06] px-3.5 py-3">
              <Badge tone="warn">Auth not implemented</Badge>
              <p className="text-[11px] leading-relaxed text-ink-muted">
                The backend has no{" "}
                <code className="font-mono text-ink">POST /api/v1/auth/login</code>{" "}
                endpoint yet, so this form cannot sign anyone in. Sign-in is a
                Phase 2 deliverable; the console is open for review in the
                meantime.
              </p>
            </div>

            <Link href="/dashboard" className="block">
              <Button variant="secondary" className="w-full">
                Continue to the console
              </Button>
            </Link>
          </CardBody>
        </Card>

        <p className="text-center text-[11px] text-ink-faint">
          AI Employee OS · Phase 1 build
        </p>
      </div>
    </div>
  );
}
