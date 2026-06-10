"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resetPassword } from "@/lib/auth";
import { toast } from "sonner";
import { useBrandSettings, siteInitials } from "@/lib/hooks/use-brand-settings";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const initialToken = searchParams?.get("token") ?? "";
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const { data: brand } = useBrandSettings();
  const siteName = brand?.siteName ?? "Admin Portal";
  const initials = siteInitials(siteName);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !password || password !== confirmPassword) return;
    setIsLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      toast.success("Password updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Unable to reset password");
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
          <CardDescription>Set a new admin password</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-4 text-sm text-text-secondary">
              <p>Your password has been updated. You can sign in again now.</p>
              <Link href="/login" className="inline-flex font-medium text-brand-600 hover:text-brand-700">
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-text-secondary">
                Use at least 12 characters with uppercase, lowercase, a number, and a special character.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="token">Reset Token</Label>
                <Input
                  id="token"
                  placeholder="Paste token from the reset email"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={12}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={12}
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600">Passwords do not match.</p>
              )}
              <Button type="submit" className="w-full" disabled={isLoading || password !== confirmPassword}>
                {isLoading ? "Resetting…" : "Reset password"}
              </Button>
              <div className="text-center text-xs text-text-secondary">
                <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
          <Card className="w-full max-w-sm">
            <CardContent className="p-6">
              <p className="text-sm text-text-secondary">Loading reset form…</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
