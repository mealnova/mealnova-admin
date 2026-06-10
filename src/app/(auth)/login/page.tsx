"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AuthRateLimitError, getSession, loginAction } from "@/lib/auth";
import { useBrandSettings, siteInitials } from "@/lib/hooks/use-brand-settings";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState<{
    message: string;
    retryAtLabel?: string;
    isRateLimit: boolean;
  } | null>(null);

  const { data: brand } = useBrandSettings();
  const siteName = brand?.siteName ?? "Admin Portal";
  const initials = siteInitials(siteName);

  function formatRetryAtLabel(retryAt?: string) {
    if (!retryAt) return undefined;
    const parsed = new Date(retryAt);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setErrorState(null);
    setIsLoading(true);
    try {
      await loginAction(email, password);
      const session = await getSession();
      router.replace(session?.mustChangePassword ? "/change-password" : "/");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      setErrorState({
        message,
        retryAtLabel: err instanceof AuthRateLimitError ? formatRetryAtLabel(err.retryAt) : undefined,
        isRateLimit: err instanceof AuthRateLimitError,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white text-xl font-bold">
            {initials}
          </div>
          <CardTitle className="text-xl">{siteName}</CardTitle>
          <CardDescription>Admin Portal — sign in to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorState && (
              <div
                role="alert"
                className={
                  errorState.isRateLimit
                    ? "rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                    : "rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                }
              >
                <div className="flex items-start gap-2">
                  {errorState.isRateLimit ? (
                    <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <div className="space-y-1">
                    <p>{errorState.message}</p>
                    {errorState.retryAtLabel && (
                      <p className="text-xs opacity-80">
                        You can try again after {errorState.retryAtLabel}.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorState) setErrorState(null);
                }}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorState) setErrorState(null);
                }}
                required
              />
            </div>
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>Use your admin email and current password.</span>
              <Link href="/forgot-password" className="font-medium text-brand-600 hover:text-brand-700">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
