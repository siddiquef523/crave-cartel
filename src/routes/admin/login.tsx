import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { adminExists, useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin Login — Crave Cartel" },
      {
        name: "description",
        content: "Secure admin sign-in for the Crave Cartel cloud kitchen console.",
      },
      { property: "og:title", content: "Admin Login — Crave Cartel" },
      { property: "og:description", content: "Sign in to the Crave Cartel admin console." },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstRun, setFirstRun] = useState<boolean | null>(null);

  const { signIn, signUp, session, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    void adminExists().then((exists) => setFirstRun(!exists));
  }, []);

  useEffect(() => {
    if (!loading && session && isAdmin) {
      void navigate({ to: "/admin" });
    }
  }, [loading, session, isAdmin, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || password.length < 6) {
      setError("Enter a valid email and a password of at least 6 characters.");
      return;
    }

    setSubmitting(true);
    const result = firstRun
      ? await signUp(email.trim(), password)
      : await signIn(email.trim(), password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (firstRun) {
      toast.success("Admin account created. You're signed in.");
    }
    void navigate({ to: "/admin" });
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError("Enter your email above first, then tap Forgot password.");
      return;
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/admin/login`,
    });
    if (resetError) {
      toast.error(resetError.message);
    } else {
      toast.success("Password reset link sent to your email.");
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-16">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="ember-orb absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/25" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="glass w-full max-w-md rounded-3xl p-7 shadow-[var(--shadow-lift)] sm:p-9"
      >
        <div className="flex justify-center">
          <Logo />
        </div>

        <h1 className="mt-8 text-center font-display text-2xl font-extrabold">
          {firstRun ? "Create admin account" : "Admin sign in"}
        </h1>
        <p className="mt-1.5 text-center text-sm text-muted-foreground">
          {firstRun
            ? "No admin exists yet — the first account created here becomes the admin."
            : "Secure console access for Crave Cartel administrators."}
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@cravecartel.in"
                autoComplete="email"
                className="h-12 rounded-xl border-border bg-surface pl-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={firstRun ? "new-password" : "current-password"}
                className="h-12 rounded-xl border-border bg-surface px-11"
              />
              <button
                type="button"
                aria-label={show ? "Hide password" : "Show password"}
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm font-medium text-primary">{error}</p>}

          <div className="flex items-center justify-between gap-3 pt-1">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
              Remember me
            </label>
            {!firstRun && (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Forgot password?
              </button>
            )}
          </div>

          <Button type="submit" variant="ember" size="lg" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {firstRun ? "Create account & sign in" : "Sign In"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            ← Back to Crave Cartel
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
