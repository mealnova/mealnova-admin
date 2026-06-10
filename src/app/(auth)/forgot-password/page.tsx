"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requestPasswordReset } from "@/lib/auth";
import { toast } from "sonner";
import { useBrandSettings, siteInitials } from "@/lib/hooks/use-brand-settings";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { data: brand } = useBrandSettings();
  const siteName = brand?.siteName ?? "Admin Portal";
  const initials = siteInitials(siteName);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
      toast.success("Reset instructions requested");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Unable to request reset");
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
          <CardDescription>Request a password reset link</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-sm text-text-secondary">
              <p>If the email exists, reset instructions have been sent.</p>
              <div className="flex items-center justify-between">
                <Link href="/login" className="text-brand-600 hover:text-brand-700 font-medium">
                  Back to login
                </Link>
                <button
                  type="button"
                  onClick={() => router.push("/reset-password")}
                  className="text-brand-600 hover:text-brand-700 font-medium"
                >
                  I have a token
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending…" : "Send reset link"}
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
