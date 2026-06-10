"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { changePasswordAction } from "@/lib/auth";
import { toast } from "sonner";
import { useBrandSettings, siteInitials } from "@/lib/hooks/use-brand-settings";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: brand } = useBrandSettings();
  const siteName = brand?.siteName ?? "Admin Portal";
  const initials = siteInitials(siteName);

  const passwordsMatch = newPassword === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword || !newPassword || !passwordsMatch) return;
    setIsLoading(true);
    try {
      await changePasswordAction(currentPassword, newPassword);
      toast.success("Password updated");
      router.replace("/");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Unable to change password");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white text-xl font-bold">
            {initials}
          </div>
          <CardTitle className="text-xl">{siteName}</CardTitle>
          <CardDescription>Update your password before continuing</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg border border-brand-100 bg-brand-50/60 px-3 py-2 text-sm text-brand-800">
              Your account is using a temporary password. Set a new one now.
            </div>
            <p className="text-xs text-text-secondary">
              Use at least 12 characters with uppercase, lowercase, a number, and a special character.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={12}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={12}
              />
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-red-600">Passwords do not match.</p>
            )}
            <Button type="submit" className="w-full" disabled={isLoading || !passwordsMatch}>
              {isLoading ? "Updating…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
