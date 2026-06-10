"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCoreRowModel,
  useReactTable,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import {
  UserPlus,
  Shield,
  ShieldAlert,
  Edit,
  Loader2,
  Users,
  Mail,
  Clock,
  KeyRound,
  Copy,
  Check,
  LockKeyhole,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  apiDelete,
  apiGet,
  apiPost,
  apiPatch,
  getLocations,
  type ApiLocation,
} from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  locationId?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  mustChangePassword: boolean;
  createdAt: string;
}

interface UserCredentialResult {
  user: AdminUser;
  temporaryPassword: string;
}

// ── Role config ──────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  LOCATION_MANAGER: "Location Manager",
  KITCHEN_MANAGER: "Kitchen Manager",
  FINANCE_MANAGER: "Finance Manager",
  SALES_MANAGER: "Sales Manager",
  HR_MANAGER: "HR Manager",
  QUALITY_MANAGER: "Quality Manager",
  INVENTORY_MANAGER: "Inventory Manager",
  CUSTOMER_SERVICE: "Customer Service",
  KITCHEN_STAFF: "Kitchen Staff",
  DELIVERY_STAFF: "Delivery Staff",
};

const LOCATION_SCOPED_ROLES = new Set([
  "LOCATION_MANAGER",
  "KITCHEN_MANAGER",
  "KITCHEN_STAFF",
  "DELIVERY_STAFF",
  "CUSTOMER_SERVICE",
]);

function isLocationScopedRole(role: string) {
  return LOCATION_SCOPED_ROLES.has(role);
}

function getLocationLabel(locationId: string | null | undefined, locations: ApiLocation[]) {
  if (!locationId) return "Unassigned";
  return locations.find((location) => location.id === locationId)?.name ?? locationId;
}

function getRoleBadgeClass(role: string): string {
  if (role === "SUPER_ADMIN") return "bg-purple-100 text-purple-700 border-transparent";
  if (role === "ADMIN") return "bg-brand-50 text-brand-700 border-transparent";
  if (role.endsWith("_MANAGER")) return "bg-info-50 text-info-700 border-transparent";
  return "bg-surface-secondary text-text-secondary border-transparent";
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

// ── Role Badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const label = ROLE_LABELS[role] ?? role;
  return (
    <Badge className={cn("text-[11px] font-semibold", getRoleBadgeClass(role))}>
      {label}
    </Badge>
  );
}

// ── Loading skeleton ─────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="border-b border-border bg-surface-secondary px-4 py-3">
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="divide-y divide-border">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Add User Dialog ───────────────────────────────────────────────────────────

interface AddUserForm {
  name: string;
  email: string;
  role: string;
  locationId: string;
}

interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: (user: AdminUser) => void;
}

interface UserDialogCommonProps {
  locations: ApiLocation[];
}

function PasswordRevealCard({
  title,
  description,
  temporaryPassword,
  onClose,
}: {
  title: string;
  description: string;
  temporaryPassword: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await copyText(temporaryPassword);
      setCopied(true);
      toast.success("Temporary password copied");
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Unable to copy password");
    }
  }

  return (
    <div className="space-y-4 pt-1">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Share this password once. The user must change it on first login.
      </div>
      <div className="space-y-1.5">
        <Label>Temporary Password</Label>
        <div className="flex gap-2">
          <Input readOnly value={temporaryPassword} className="font-mono text-sm" />
          <Button type="button" variant="outline" size="icon" onClick={handleCopy} aria-label="Copy temporary password">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <LockKeyhole className="h-3.5 w-3.5 text-amber-600" />
          <span>{description}</span>
        </div>
        <Button type="button" onClick={onClose}>Done</Button>
      </div>
      <p className="text-xs text-text-tertiary">{title}</p>
    </div>
  );
}

function AddUserDialog({ open, onClose, onSaved, locations }: AddUserDialogProps & UserDialogCommonProps) {
  const [form, setForm] = useState<AddUserForm>({
    name: "",
    email: "",
    role: "ADMIN",
    locationId: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AddUserForm, string>>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [issuedCredential, setIssuedCredential] = useState<UserCredentialResult | null>(null);

  function resetState() {
    setForm({ name: "", email: "", role: "ADMIN", locationId: "" });
    setErrors({});
    setApiError(null);
    setSaving(false);
    setIssuedCredential(null);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function validate(): boolean {
    const next: Partial<Record<keyof AddUserForm, string>> = {};
    if (!form.name.trim()) next.name = "Full name is required";
    if (!form.email.trim()) {
      next.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "Enter a valid email address";
    }
    if (isLocationScopedRole(form.role) && !form.locationId) {
      next.locationId = "Location is required for this role";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setApiError(null);
    try {
      const created = await apiPost<UserCredentialResult>("/auth/admin/users", {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        locationId: isLocationScopedRole(form.role) ? form.locationId : undefined,
      });
      toast.success(`${created.user.name} added as ${ROLE_LABELS[created.user.role] ?? created.user.role}`);
      onSaved(created.user);
      setIssuedCredential(created);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create user";
      setApiError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(event) => {
          if (issuedCredential) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (issuedCredential) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-brand-600" />
            {issuedCredential ? "Temporary Password" : "Add Admin User"}
          </DialogTitle>
          <DialogDescription>
            {issuedCredential
              ? `${issuedCredential.user.name} was created successfully. Copy the temporary password once and share it securely.`
              : "Create a new admin portal account. A temporary password will be generated and the user must change it on first login."}
          </DialogDescription>
        </DialogHeader>

        {issuedCredential ? (
          <PasswordRevealCard
            title={`${issuedCredential.user.email} must rotate the password on first login`}
            description="This password will not be shown again."
            temporaryPassword={issuedCredential.temporaryPassword}
            onClose={handleClose}
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="add-name">Full Name</Label>
              <Input
                id="add-name"
                placeholder="Enter full name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className={errors.name ? "border-red-400 focus-visible:ring-red-400" : ""}
              />
              {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                <Input
                  id="add-email"
                  type="email"
                  placeholder="name@company.com"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className={cn("pl-9", errors.email ? "border-red-400 focus-visible:ring-red-400" : "")}
                />
              </div>
              {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-role">Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    role: v,
                    locationId: isLocationScopedRole(v) ? p.locationId : "",
                  }))
                }
              >
                <SelectTrigger id="add-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLocationScopedRole(form.role) && (
              <div className="space-y-1.5">
                <Label htmlFor="add-location">Location</Label>
                <Select
                  value={form.locationId}
                  onValueChange={(v) => setForm((p) => ({ ...p, locationId: v }))}
                >
                  <SelectTrigger id="add-location" className={errors.locationId ? "border-red-400 focus-visible:ring-red-400" : ""}>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.locationId && <p className="text-xs text-red-600">{errors.locationId}</p>}
              </div>
            )}

            {apiError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {apiError}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Add User
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Edit User Dialog ──────────────────────────────────────────────────────────

interface EditUserForm {
  name: string;
  email: string;
  role: string;
  locationId: string;
  isActive: boolean;
}

interface EditUserDialogProps {
  user: AdminUser | null;
  open: boolean;
  onClose: () => void;
  onSaved: (user: AdminUser) => void;
}

function EditUserDialog({ user, open, onClose, onSaved, locations }: EditUserDialogProps & UserDialogCommonProps) {
  const [form, setForm] = useState<EditUserForm>({
    name: user?.name ?? "",
    email: user?.email ?? "",
    role: user?.role ?? "ADMIN",
    locationId: user?.locationId ?? "",
    isActive: user?.isActive ?? true,
  });
  const [errors, setErrors] = useState<Partial<Record<"name" | "email" | "locationId", string>>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Sync form when user prop changes (dialog re-opened with different user)
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name,
        email: user.email,
        role: user.role,
        locationId: user.locationId ?? "",
        isActive: user.isActive,
      });
      setErrors({});
      setApiError(null);
    }
  }, [user]);

  function handleClose() {
    setErrors({});
    setApiError(null);
    onClose();
  }

  function validate() {
    const next: Partial<Record<"name" | "email" | "locationId", string>> = {};
    if (!form.name.trim()) {
      next.name = "Full name is required";
    }
    if (!form.email.trim()) {
      next.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "Enter a valid email address";
    }
    if (isLocationScopedRole(form.role) && !form.locationId) {
      next.locationId = "Location is required for this role";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!validate()) return;
    setSaving(true);
    setApiError(null);
    try {
      const updated = await apiPatch<AdminUser>(`/auth/admin/users/${user.id}`, {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        locationId: isLocationScopedRole(form.role) ? form.locationId : null,
        isActive: form.isActive,
      });
      toast.success(`${updated.name} updated`);
      onSaved(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update user";
      setApiError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-brand-600" />
            Edit User — {user.name}
          </DialogTitle>
          <DialogDescription>
            Update the user's profile details, role assignment, and account status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => {
                  setForm((p) => ({ ...p, name: e.target.value }));
                  if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
                }}
                className={errors.name ? "border-red-400 focus-visible:ring-red-400" : ""}
              />
              {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={form.email}
                onChange={(e) => {
                  setForm((p) => ({ ...p, email: e.target.value }));
                  if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                }}
                className={errors.email ? "border-red-400 focus-visible:ring-red-400" : ""}
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface-secondary px-3 py-2.5">
            <p className="text-xs uppercase tracking-wide text-text-tertiary">Assigned Location</p>
            <p className="mt-1 text-sm font-medium text-text-primary">
              {isLocationScopedRole(form.role)
                ? getLocationLabel(form.locationId || user.locationId, locations)
                : "Not required for this role"}
            </p>
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-role">Role</Label>
            <Select
              value={form.role}
              onValueChange={(v) =>
                setForm((p) => ({
                  ...p,
                  role: v,
                  locationId: isLocationScopedRole(v) ? p.locationId : "",
                }))
              }
            >
              <SelectTrigger id="edit-role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLocationScopedRole(form.role) && (
            <div className="space-y-1.5">
              <Label htmlFor="edit-location">Location</Label>
              <Select
                value={form.locationId}
                onValueChange={(v) => {
                  setForm((p) => ({ ...p, locationId: v }));
                  if (errors.locationId) setErrors((p) => ({ ...p, locationId: undefined }));
                }}
              >
                <SelectTrigger id="edit-location" className={errors.locationId ? "border-red-400 focus-visible:ring-red-400" : ""}>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.locationId && <p className="text-xs text-red-600">{errors.locationId}</p>}
            </div>
          )}

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-3">
            <div>
              <p className="text-sm font-medium text-text-primary">Account Active</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Inactive users cannot log in to the admin portal
              </p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) => setForm((p) => ({ ...p, isActive: checked }))}
            />
          </div>

          {/* API error */}
          {apiError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {apiError}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Reset Password Dialog ────────────────────────────────────────────────────

interface ResetPasswordDialogProps {
  user: AdminUser | null;
  open: boolean;
  onClose: () => void;
  onSaved: (user: AdminUser) => void;
}

function ResetPasswordDialog({ user, open, onClose, onSaved }: ResetPasswordDialogProps) {
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [issuedCredential, setIssuedCredential] = useState<UserCredentialResult | null>(null);

  function resetState() {
    setSaving(false);
    setApiError(null);
    setIssuedCredential(null);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  async function handleReset() {
    if (!user) return;
    setSaving(true);
    setApiError(null);
    try {
      const result = await apiPost<UserCredentialResult>(`/auth/admin/users/${user.id}/reset-password`, {});
      onSaved(result.user);
      setIssuedCredential(result);
      toast.success(`Temporary password generated for ${result.user.name}`);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-brand-600" />
            {issuedCredential ? "Temporary Password" : `Reset Password — ${user.name}`}
          </DialogTitle>
          <DialogDescription>
            {issuedCredential
              ? `${issuedCredential.user.name} must use this temporary password on next login.`
              : "Generate a new temporary password for this account. The previous password will stop working."}
          </DialogDescription>
        </DialogHeader>

        {issuedCredential ? (
          <PasswordRevealCard
            title={`${issuedCredential.user.email} requires a first-login password change`}
            description="This password will not be shown again."
            temporaryPassword={issuedCredential.temporaryPassword}
            onClose={handleClose}
          />
        ) : (
          <div className="space-y-4 pt-1">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              This will invalidate the user&apos;s current password and force a password change at next sign-in.
            </div>
            {apiError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {apiError}
              </div>
            )}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={handleReset} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Resetting…
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    Reset Password
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface DeleteUserDialogProps {
  user: AdminUser | null;
  open: boolean;
  deleting: boolean;
  apiError: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteUserDialog({
  user,
  open,
  deleting,
  apiError,
  onClose,
  onConfirm,
}: DeleteUserDialogProps) {
  if (!user) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !deleting) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <Trash2 className="h-5 w-5" />
            Delete User
          </DialogTitle>
          <DialogDescription>
            Permanently delete {user.name}&apos;s admin account. Existing audit and inventory history will be retained, but the user will lose all admin access.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          This action cannot be undone.
        </div>

        {apiError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {apiError}
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete User
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { user: currentUser, refreshSession } = useAuth();
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiGet<AdminUser[]>("/auth/admin/users");
      setUsers(data);
    } catch {
      toast.error("Failed to load users");
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    getLocations().then(setLocations).catch(() => setLocations([]));
  }, []);

  function handleUserAdded(created: AdminUser) {
    setUsers((prev) => [created, ...prev]);
  }

  async function handleUserUpdated(updated: AdminUser) {
    setUsers((prev) =>
      prev.map((u) => (u.id === updated.id ? updated : u))
    );
    setEditTarget(null);
    if (currentUser?.id === updated.id) {
      try {
        await refreshSession();
      } catch {
        // Leave the page state intact; a manual refresh will still pick up the change.
      }
    }
  }

  function handlePasswordReset(updated: AdminUser) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }

  function handleDeleteDialogClose() {
    if (isDeleting) return;
    setDeleteTarget(null);
    setDeleteError(null);
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await apiDelete(`/auth/admin/users/${deleteTarget.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  }

  const activeCount = users.filter((u) => u.isActive).length;
  const superAdminCount = users.filter((u) => u.role === "SUPER_ADMIN").length;
  const activeSuperAdminCount = users.filter(
    (u) => u.role === "SUPER_ADMIN" && u.isActive,
  ).length;

  // ── TanStack Table columns ──────────────────────────────────────────────────

  const columns: ColumnDef<AdminUser>[] = [
    {
      id: "name",
      header: "Name",
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
              {u.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-text-primary truncate">{u.name}</p>
              <p className="flex items-center gap-1 text-xs text-text-secondary mt-0.5 truncate">
                <Mail className="h-3 w-3 shrink-0" />
                {u.email}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "role",
      header: "Role",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          {row.original.role === "SUPER_ADMIN" ? (
            <ShieldAlert className="h-3.5 w-3.5 text-purple-600 shrink-0" />
          ) : (
            <Shield className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
          )}
          <RoleBadge role={row.original.role} />
        </div>
      ),
    },
    {
      id: "location",
      header: "Location",
      cell: ({ row }) => (
        <span className="text-sm text-text-secondary">
          {getLocationLabel(row.original.locationId, locations)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const active = row.original.isActive;
        return (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
              active
                ? "bg-success-50 text-success-700"
                : "bg-surface-secondary text-text-secondary"
            )}
          >
            {active ? "Active" : "Inactive"}
          </span>
        );
      },
    },
    {
      id: "passwordState",
      header: "Password",
      cell: ({ row }) => {
        const needsReset = row.original.mustChangePassword;
        return needsReset ? (
          <Badge variant="warning" className="gap-1.5 text-[11px] font-semibold">
            <LockKeyhole className="h-3 w-3" />
            Temporary required
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[11px] font-semibold">
            Current
          </Badge>
        );
      },
    },
    {
      id: "lastLogin",
      header: "Last Login",
      cell: ({ row }) => {
        const ts = row.original.lastLoginAt;
        if (!ts) {
          return <span className="text-xs text-text-tertiary">Never</span>;
        }
        return (
          <span className="flex items-center gap-1 text-xs text-text-secondary">
            <Clock className="h-3 w-3 shrink-0" />
            {formatDistanceToNow(new Date(ts), { addSuffix: true })}
          </span>
        );
      },
    },
    ...(isSuperAdmin
      ? [
          {
            id: "actions",
            header: "",
            cell: ({ row }: { row: { original: AdminUser } }) => (
              <div className="flex items-center gap-1">
                {(() => {
                  const isCurrentUser = currentUser?.id === row.original.id;
                  const isOnlyActiveSuperAdmin =
                    row.original.role === "SUPER_ADMIN" &&
                    row.original.isActive &&
                    activeSuperAdminCount <= 1;
                  const deleteDisabled = isCurrentUser || isOnlyActiveSuperAdmin;
                  return (
                    <>
                      <button
                        onClick={() => setEditTarget(row.original)}
                        className="rounded-lg border border-border p-1.5 text-text-secondary transition-colors hover:bg-surface-secondary hover:text-brand-600"
                        aria-label={`Edit ${row.original.name}`}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setResetTarget(row.original)}
                        disabled={isCurrentUser}
                        className={cn(
                          "rounded-lg border border-border p-1.5 text-text-secondary transition-colors",
                          isCurrentUser
                            ? "cursor-not-allowed opacity-50"
                            : "hover:bg-surface-secondary hover:text-amber-700",
                        )}
                        aria-label={`Reset password for ${row.original.name}`}
                        title={isCurrentUser ? "Use Change Password for your own account" : "Reset password"}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget(row.original);
                        }}
                        disabled={deleteDisabled}
                        className={cn(
                          "rounded-lg border border-border p-1.5 text-text-secondary transition-colors",
                          deleteDisabled
                            ? "cursor-not-allowed opacity-50"
                            : "hover:bg-surface-secondary hover:text-red-600",
                        )}
                        aria-label={`Delete ${row.original.name}`}
                        title={
                          isCurrentUser
                            ? "You cannot delete your own account"
                            : isOnlyActiveSuperAdmin
                              ? "At least one active super admin is required"
                              : `Delete ${row.original.name}`
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  );
                })()}
              </div>
            ),
          } satisfies ColumnDef<AdminUser>,
        ]
      : []),
  ];

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Users</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {isLoading
              ? "Loading…"
              : `${users.length} total · ${activeCount} active · ${superAdminCount} super admin`}
          </p>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => setAddOpen(true)} className="shrink-0">
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total Users",
            value: isLoading ? "…" : users.length.toString(),
            icon: Users,
            color: "text-brand-600",
            bg: "bg-brand-50",
          },
          {
            label: "Active",
            value: isLoading ? "…" : activeCount.toString(),
            icon: Shield,
            color: "text-success-600",
            bg: "bg-success-50",
          },
          {
            label: "Super Admins",
            value: isLoading ? "…" : superAdminCount.toString(),
            icon: ShieldAlert,
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4"
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  kpi.bg
                )}
              >
                <Icon className={cn("h-5 w-5", kpi.color)} />
              </div>
              <div>
                <p className="text-xl font-bold text-text-primary">{kpi.value}</p>
                <p className="text-xs text-text-secondary">{kpi.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton />
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-20 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-text-tertiary" />
          <p className="text-sm font-medium text-text-secondary">No users found.</p>
          {isSuperAdmin && (
            <Button
              onClick={() => setAddOpen(true)}
              className="mt-4"
            >
              <UserPlus className="h-4 w-4" />
              Add First User
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                {table.getHeaderGroups().map((hg) =>
                  hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="transition-colors hover:bg-surface-secondary"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-border px-4 py-2.5 text-xs text-text-tertiary">
            {users.length} {users.length === 1 ? "user" : "users"}
          </div>
        </div>
      )}

      {/* Add User Dialog */}
      <AddUserDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={handleUserAdded}
        locations={locations}
      />

      {/* Edit User Dialog */}
      <EditUserDialog
        user={editTarget}
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        onSaved={handleUserUpdated}
        locations={locations}
      />

      <ResetPasswordDialog
        user={resetTarget}
        open={resetTarget !== null}
        onClose={() => setResetTarget(null)}
        onSaved={handlePasswordReset}
      />

      <DeleteUserDialog
        user={deleteTarget}
        open={deleteTarget !== null}
        deleting={isDeleting}
        apiError={deleteError}
        onClose={handleDeleteDialogClose}
        onConfirm={handleDeleteUser}
      />
    </div>
  );
}
