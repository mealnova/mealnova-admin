"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { apiPatch, getSettings, patchSettings } from "@/lib/api";
import { useBrandSettings } from "@/lib/hooks/use-brand-settings";
import { toast } from "sonner";
import {
  Building2,
  CreditCard,
  Bell,
  Key,
  Shield,
  Webhook,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Copy,
  Loader2,
  X,
} from "lucide-react";

type SettingsTab = "company" | "billing" | "notifications" | "integrations" | "api" | "security";

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "company", label: "Company", icon: Building2 },
  { id: "billing", label: "Billing & GST", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "integrations", label: "Integrations", icon: Webhook },
  { id: "api", label: "API Keys", icon: Key },
  { id: "security", label: "Security", icon: Shield },
];

// ── Shared primitives ─────────────────────────────────────────────────────────

function FieldRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 sm:gap-6 py-5 border-b border-border last:border-0">
      <div>
        <label className="text-sm font-medium text-text-primary">{label}</label>
        {description && <p className="mt-0.5 text-xs text-text-tertiary">{description}</p>}
      </div>
      <div className="sm:col-span-2">{children}</div>
    </div>
  );
}

function TInput({
  value, onChange, placeholder, type = "text",
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
    />
  );
}

function SecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 pr-10 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none font-mono"
      />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function TSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none">
      {children}
    </select>
  );
}

function TToggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => onChange(!checked)} className={cn("relative h-6 w-11 rounded-full transition-colors", checked ? "bg-brand-500" : "bg-surface-tertiary")}>
        <span className={cn("absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform", checked ? "left-6" : "left-1")} />
      </button>
      {label && <span className="text-sm text-text-secondary">{label}</span>}
    </div>
  );
}

function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-end rounded-xl border border-border bg-surface-secondary p-4 mt-6">
      <button onClick={onClick} disabled={saving} className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

// ── Company Tab ───────────────────────────────────────────────────────────────

function CompanyTab() {
  const { data: brand, isLoading } = useBrandSettings();
  const qc = useQueryClient();
  const [form, setForm] = useState({ siteName: "", tagline: "", address: "", fssaiNumber: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (brand) setForm({ siteName: brand.siteName ?? "", tagline: brand.tagline ?? "", address: brand.address ?? "", fssaiNumber: brand.fssaiNumber ?? "", phone: brand.phone ?? "", email: brand.email ?? "" });
  }, [brand]);

  async function handleSave() {
    setSaving(true);
    try {
      await apiPatch("/content/brand-settings", form);
      qc.invalidateQueries({ queryKey: ["brand-settings"] });
      toast.success("Company settings saved");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  }

  if (isLoading) return <div className="rounded-xl border border-border bg-surface p-6 text-sm text-text-tertiary">Loading…</div>;

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-6">Company Information</h3>
      <FieldRow label="Business Name" description="Legal entity name as registered">
        <TInput value={form.siteName} onChange={(v) => setForm((f) => ({ ...f, siteName: v }))} placeholder="Your Company Name" />
      </FieldRow>
      <FieldRow label="Tagline" description="Shown on invoices and website">
        <TInput value={form.tagline} onChange={(v) => setForm((f) => ({ ...f, tagline: v }))} placeholder="Your tagline" />
      </FieldRow>
      <FieldRow label="Registered Address">
        <textarea value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} rows={3} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none resize-none" />
      </FieldRow>
      <FieldRow label="FSSAI License" description="14-digit license number (mandatory)">
        <TInput value={form.fssaiNumber} onChange={(v) => setForm((f) => ({ ...f, fssaiNumber: v }))} placeholder="14-digit FSSAI number" />
      </FieldRow>
      <FieldRow label="Phone">
        <TInput value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="+91-XXXXX-XXXXX" type="tel" />
      </FieldRow>
      <FieldRow label="Email">
        <TInput value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} placeholder="admin@yourcompany.com" type="email" />
      </FieldRow>
      <SaveButton saving={saving} onClick={handleSave} />
    </div>
  );
}

// ── Billing Tab ───────────────────────────────────────────────────────────────

function BillingTab() {
  const { data: brand, isLoading: brandLoading } = useBrandSettings();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    gstin: "", pan: "", gstRateMeals: "5", gstRateEvents: "18",
    hsnCodeMeals: "9963", hsnCodeEvents: "9963",
    invoicePrefix: "INV-2026-", paymentTermsDays: "30", lateFeePercent: "1.5",
    bankName: "", bankAccount: "", bankIfsc: "", bankUpi: "",
    registeredCity: "", registeredState: "", registeredPincode: "",
    eInvoicingEnabled: "false", eInvoiceProvider: "disabled",
    eInvoiceApiBaseUrl: "https://clientbasic.mastersindia.co", eInvoiceApiToken: "",
    gstFilingProvider: "disabled", gstFilingApiBaseUrl: "https://api-platform.mastersindia.co/api/v1",
    gstFilingUsername: "", gstFilingPassword: "", gstFilingQaUrl: "",
    autoInvoiceEnabled: "true",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (brand) {
      setForm((f) => ({
        ...f,
        gstin: brand.gstin ?? "",
        bankName: brand.bankName ?? "",
        bankAccount: brand.bankAccount ?? "",
        bankIfsc: brand.bankIfsc ?? "",
        bankUpi: brand.bankUpi ?? "",
      }));
    }
  }, [brand]);

  useEffect(() => {
    getSettings().then((s) => {
      setForm((f) => ({
        ...f,
        pan: s["billing.pan"] ?? f.pan,
        gstRateMeals: s["billing.gstRateMeals"] ?? f.gstRateMeals,
        gstRateEvents: s["billing.gstRateEvents"] ?? f.gstRateEvents,
        hsnCodeMeals: s["billing.hsnCodeMeals"] ?? f.hsnCodeMeals,
        hsnCodeEvents: s["billing.hsnCodeEvents"] ?? f.hsnCodeEvents,
        invoicePrefix: s["billing.invoicePrefix"] ?? f.invoicePrefix,
        paymentTermsDays: s["billing.paymentTermsDays"] ?? f.paymentTermsDays,
        lateFeePercent: s["billing.lateFeePercent"] ?? f.lateFeePercent,
        registeredCity: s["billing.registeredCity"] ?? f.registeredCity,
        registeredState: s["billing.registeredState"] ?? f.registeredState,
        registeredPincode: s["billing.registeredPincode"] ?? f.registeredPincode,
        eInvoicingEnabled: s["billing.eInvoicingEnabled"] ?? f.eInvoicingEnabled,
        eInvoiceProvider: s["billing.eInvoiceProvider"] ?? f.eInvoiceProvider,
        eInvoiceApiBaseUrl: s["billing.eInvoiceApiBaseUrl"] ?? f.eInvoiceApiBaseUrl,
        eInvoiceApiToken: s["billing.eInvoiceApiToken"] ?? f.eInvoiceApiToken,
        gstFilingProvider: s["billing.gstFilingProvider"] ?? f.gstFilingProvider,
        gstFilingApiBaseUrl: s["billing.gstFilingApiBaseUrl"] ?? f.gstFilingApiBaseUrl,
        gstFilingUsername: s["billing.gstFilingUsername"] ?? f.gstFilingUsername,
        gstFilingPassword: s["billing.gstFilingPassword"] ?? f.gstFilingPassword,
        gstFilingQaUrl: s["billing.gstFilingQaUrl"] ?? f.gstFilingQaUrl,
        autoInvoiceEnabled: s["billing.autoInvoiceEnabled"] ?? f.autoInvoiceEnabled,
      }));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await apiPatch("/content/brand-settings", {
        gstin: form.gstin,
        bankName: form.bankName,
        bankAccount: form.bankAccount,
        bankIfsc: form.bankIfsc,
        bankUpi: form.bankUpi,
      });
      await patchSettings({
        "billing.pan": form.pan,
        "billing.gstRateMeals": form.gstRateMeals,
        "billing.gstRateEvents": form.gstRateEvents,
        "billing.hsnCodeMeals": form.hsnCodeMeals,
        "billing.hsnCodeEvents": form.hsnCodeEvents,
        "billing.invoicePrefix": form.invoicePrefix,
        "billing.paymentTermsDays": form.paymentTermsDays,
        "billing.lateFeePercent": form.lateFeePercent,
        "billing.registeredCity": form.registeredCity,
        "billing.registeredState": form.registeredState,
        "billing.registeredPincode": form.registeredPincode,
        "billing.eInvoicingEnabled": form.eInvoicingEnabled,
        "billing.eInvoiceProvider": form.eInvoiceProvider,
        "billing.eInvoiceApiBaseUrl": form.eInvoiceApiBaseUrl,
        "billing.eInvoiceApiToken": form.eInvoiceApiToken,
        "billing.gstFilingProvider": form.gstFilingProvider,
        "billing.gstFilingApiBaseUrl": form.gstFilingApiBaseUrl,
        "billing.gstFilingUsername": form.gstFilingUsername,
        "billing.gstFilingPassword": form.gstFilingPassword,
        "billing.gstFilingQaUrl": form.gstFilingQaUrl,
        "billing.autoInvoiceEnabled": form.autoInvoiceEnabled,
      });
      qc.invalidateQueries({ queryKey: ["brand-settings"] });
      toast.success("Billing settings saved");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  }

  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  if (loading || brandLoading) return <div className="rounded-xl border border-border bg-surface p-6 text-sm text-text-tertiary">Loading…</div>;

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-6">Billing & GST Configuration</h3>
      <FieldRow label="GSTIN" description="15-digit GST Identification Number">
        <TInput value={form.gstin} onChange={set("gstin")} placeholder="27AAAAA0000A1Z5" />
      </FieldRow>
      <FieldRow label="PAN Number">
        <TInput value={form.pan} onChange={set("pan")} placeholder="AAAAA0000A" />
      </FieldRow>
      <FieldRow label="Registered City / State / Pincode" description="Used when building IRN payloads for GST e-invoicing">
        <div className="grid gap-2 sm:grid-cols-3">
          <TInput value={form.registeredCity} onChange={set("registeredCity")} placeholder="Pune" />
          <TInput value={form.registeredState} onChange={set("registeredState")} placeholder="Maharashtra" />
          <TInput value={form.registeredPincode} onChange={set("registeredPincode")} placeholder="411001" />
        </div>
      </FieldRow>
      <FieldRow label="Default GST Rate (Daily Meals)" description="HSN 9963 — daily corporate meals">
        <TSelect value={form.gstRateMeals} onChange={set("gstRateMeals")}>
          <option value="5">5% (CGST 2.5% + SGST 2.5%) — Standard</option>
          <option value="0">0% — Exempt</option>
        </TSelect>
      </FieldRow>
      <FieldRow label="GST Rate (Events/Outdoor Catering)">
        <TSelect value={form.gstRateEvents} onChange={set("gstRateEvents")}>
          <option value="18">18% — Standard (outdoor catering with ITC)</option>
          <option value="5">5% — Without ITC</option>
        </TSelect>
      </FieldRow>
      <FieldRow label="HSN / SAC Codes" description="Stored as the tax code source for invoice and billable-ledger generation">
        <div className="grid gap-2 sm:grid-cols-2">
          <TInput value={form.hsnCodeMeals} onChange={set("hsnCodeMeals")} placeholder="9963" />
          <TInput value={form.hsnCodeEvents} onChange={set("hsnCodeEvents")} placeholder="9963" />
        </div>
      </FieldRow>
      <FieldRow label="Invoice Number Prefix" description="e.g. INV-2026- → INV-2026-0001">
        <TInput value={form.invoicePrefix} onChange={set("invoicePrefix")} placeholder="INV-2026-" />
      </FieldRow>
      <FieldRow label="Payment Terms (Default)" description="Days for NET terms">
        <TSelect value={form.paymentTermsDays} onChange={set("paymentTermsDays")}>
          <option value="15">NET 15</option>
          <option value="30">NET 30</option>
          <option value="45">NET 45</option>
          <option value="0">Advance</option>
        </TSelect>
      </FieldRow>
      <FieldRow label="Late Fee" description="Charged after due date">
        <div className="flex gap-3 items-center">
          <TInput value={form.lateFeePercent} onChange={set("lateFeePercent")} type="number" placeholder="1.5" />
          <span className="text-sm text-text-secondary whitespace-nowrap">% per month</span>
        </div>
      </FieldRow>
      <FieldRow label="Bank Details" description="Shown on all invoices">
        <div className="space-y-2">
          <TInput value={form.bankName} onChange={set("bankName")} placeholder="Bank name" />
          <TInput value={form.bankAccount} onChange={set("bankAccount")} placeholder="Account number" />
          <TInput value={form.bankIfsc} onChange={set("bankIfsc")} placeholder="IFSC code" />
          <TInput value={form.bankUpi} onChange={set("bankUpi")} placeholder="UPI ID" />
        </div>
      </FieldRow>
      <FieldRow label="E-Invoicing" description="Auto-generate IRN via GSTN IRP">
        <TToggle checked={form.eInvoicingEnabled === "true"} onChange={(v) => set("eInvoicingEnabled")(String(v))} label="Enable e-invoicing (mandatory if turnover > ₹5 crore)" />
      </FieldRow>
      <FieldRow label="E-Invoice Provider" description="Choose provider for IRN generation and GST portal sync">
        <TSelect value={form.eInvoiceProvider} onChange={set("eInvoiceProvider")}>
          <option value="disabled">Disabled</option>
          <option value="mock">Mock / local testing</option>
          <option value="masters_india">Masters India</option>
        </TSelect>
      </FieldRow>
      <FieldRow label="E-Invoice API Base URL" description="Used only when a live provider is selected">
        <TInput value={form.eInvoiceApiBaseUrl} onChange={set("eInvoiceApiBaseUrl")} placeholder="https://clientbasic.mastersindia.co" />
      </FieldRow>
      <FieldRow label="E-Invoice API Token" description="Provider access token used for IRN generation requests">
        <SecretInput value={form.eInvoiceApiToken} onChange={set("eInvoiceApiToken")} placeholder="Paste provider token" />
      </FieldRow>
      <FieldRow label="GST Filing Provider" description="Used for provider-backed GSTR-1 upload, EVC OTP, and filing submit">
        <TSelect value={form.gstFilingProvider} onChange={set("gstFilingProvider")}>
          <option value="disabled">Disabled</option>
          <option value="mock">Mock / local testing</option>
          <option value="masters_india">Masters India</option>
        </TSelect>
      </FieldRow>
      <FieldRow label="GST Filing API Base URL" description="Base URL for GST filing auth and batch submission APIs">
        <TInput value={form.gstFilingApiBaseUrl} onChange={set("gstFilingApiBaseUrl")} placeholder="https://api-platform.mastersindia.co/api/v1" />
      </FieldRow>
      <FieldRow label="GST Filing Username / Password" description="Provider credentials used to fetch JWT tokens for GST return APIs">
        <div className="space-y-2">
          <TInput value={form.gstFilingUsername} onChange={set("gstFilingUsername")} placeholder="Provider username" />
          <SecretInput value={form.gstFilingPassword} onChange={set("gstFilingPassword")} placeholder="Provider password" />
        </div>
      </FieldRow>
      <FieldRow label="GST Filing QA Header" description="Optional provider QA header value for environments that require it">
        <TInput value={form.gstFilingQaUrl} onChange={set("gstFilingQaUrl")} placeholder="https://qa-enterprise.mastersindia.co" />
      </FieldRow>
      <FieldRow label="Auto-Invoice Generation" description="Auto-generate draft invoices on 1st of each month">
        <TToggle checked={form.autoInvoiceEnabled === "true"} onChange={(v) => set("autoInvoiceEnabled")(String(v))} label="Generate monthly corporate invoices automatically" />
      </FieldRow>
      <SaveButton saving={saving} onClick={handleSave} />
    </div>
  );
}

// ── Notifications Tab ─────────────────────────────────────────────────────────

const DEFAULT_CHANNELS = [
  { event: "New Order Received", email: true, sms: true, whatsapp: true, push: true },
  { event: "Order Delivered", email: true, sms: false, whatsapp: true, push: false },
  { event: "Low Stock Alert", email: true, sms: false, whatsapp: true, push: true },
  { event: "Invoice Generated", email: true, sms: false, whatsapp: true, push: false },
  { event: "Payment Received", email: true, sms: true, whatsapp: true, push: false },
  { event: "Overdue Invoice (7d)", email: true, sms: true, whatsapp: true, push: false },
  { event: "Overdue Invoice (30d)", email: true, sms: true, whatsapp: true, push: true },
  { event: "Critical Complaint", email: true, sms: true, whatsapp: true, push: true },
  { event: "FSSAI Expiry (60d)", email: true, sms: false, whatsapp: true, push: true },
  { event: "Staff Absent", email: false, sms: false, whatsapp: true, push: false },
  { event: "Daily Operations Briefing (7 AM)", email: false, sms: false, whatsapp: true, push: false },
];

type NotifRow = typeof DEFAULT_CHANNELS[number];

function NotificationsTab() {
  const [channels, setChannels] = useState<NotifRow[]>(DEFAULT_CHANNELS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      if (s["notifications.channels"]) {
        try { setChannels(JSON.parse(s["notifications.channels"])); } catch { /* keep defaults */ }
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function toggle(event: string, channel: keyof Omit<NotifRow, "event">) {
    setChannels((rows) => rows.map((r) => r.event === event ? { ...r, [channel]: !r[channel as keyof NotifRow] } : r));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await patchSettings({ "notifications.channels": JSON.stringify(channels) });
      toast.success("Notification settings saved");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="rounded-xl border border-border bg-surface p-6 text-sm text-text-tertiary">Loading…</div>;

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-2">Notification Preferences</h3>
      <p className="mb-6 text-sm text-text-secondary">Configure which events trigger notifications and through which channels.</p>
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-secondary">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-text-tertiary">Event</th>
              {(["email", "sms", "whatsapp", "push"] as const).map((ch) => (
                <th key={ch} className="px-4 py-3 text-center text-xs font-semibold uppercase text-text-tertiary">{ch === "whatsapp" ? "WhatsApp" : ch.charAt(0).toUpperCase() + ch.slice(1)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {channels.map((row) => (
              <tr key={row.event} className="hover:bg-surface-secondary">
                <td className="px-4 py-3 text-sm text-text-primary">{row.event}</td>
                {(["email", "sms", "whatsapp", "push"] as const).map((ch) => (
                  <td key={ch} className="px-4 py-3 text-center">
                    <TToggle checked={row[ch]} onChange={() => toggle(row.event, ch)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SaveButton saving={saving} onClick={handleSave} />
    </div>
  );
}

// ── Integrations Tab ──────────────────────────────────────────────────────────

const INTEGRATIONS = [
  {
    id: "razorpay",
    name: "Razorpay",
    description: "Stored in admin settings only; the live payment service still uses deployed env vars",
    icon: "💳",
    fields: [
      { label: "Key ID", key: "integration.razorpay.keyId", secret: false, placeholder: "rzp_live_XXXXXXXXXXXXXXXX" },
      { label: "Key Secret", key: "integration.razorpay.keySecret", secret: true, placeholder: "Enter secret key" },
      { label: "Webhook Secret", key: "integration.razorpay.webhookSecret", secret: true, placeholder: "Enter webhook secret" },
    ],
    toggleKey: "integration.razorpay.testMode",
    toggleLabel: "Test mode (use rzp_test_ keys)",
  },
  {
    id: "msg91",
    name: "MSG91 (SMS & OTP)",
    description: "Stored in admin settings for future SMS wiring; notifications are not reading this yet",
    icon: "📱",
    fields: [
      { label: "Auth Key", key: "integration.msg91.authKey", secret: true, placeholder: "Enter MSG91 auth key" },
      { label: "Sender ID", key: "integration.msg91.senderId", secret: false, placeholder: "HANCAT" },
    ],
  },
  {
    id: "googlemaps",
    name: "Google Maps",
    description: "Stored for future location and routing integration",
    icon: "🗺️",
    fields: [
      { label: "API Key", key: "integration.googlemaps.apiKey", secret: true, placeholder: "AIzaSy..." },
    ],
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business API",
    description: "Stored for future outbound messaging integration",
    icon: "💬",
    fields: [
      { label: "Access Token", key: "integration.whatsapp.accessToken", secret: true, placeholder: "Enter access token" },
      { label: "Phone Number ID", key: "integration.whatsapp.phoneNumberId", secret: false, placeholder: "1234567890" },
    ],
  },
];

function IntegrationsTab() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    getSettings().then(setValues).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function saveIntegration(id: string, keys: string[]) {
    setSaving(id);
    try {
      const data: Record<string, string> = {};
      keys.forEach((k) => { data[k] = values[k] ?? ""; });
      await patchSettings(data);
      toast.success("Integration saved");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(null); }
  }

  if (loading) return <div className="space-y-4"><div className="rounded-xl border border-border bg-surface p-6 text-sm text-text-tertiary">Loading…</div></div>;

  return (
    <div className="space-y-4">
      {INTEGRATIONS.map((integration) => {
        const allKeys = integration.fields.map((f) => f.key).concat(integration.toggleKey ? [integration.toggleKey] : []);
        const isConnected = integration.fields.some((f) => !!values[f.key]);
        return (
          <div key={integration.id} className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{integration.icon}</span>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">{integration.name}</h3>
                  <p className="text-xs text-text-tertiary">{integration.description}</p>
                </div>
              </div>
              <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold", isConnected ? "bg-success-50 text-success-700" : "bg-surface-tertiary text-text-tertiary")}>
                {isConnected ? <><CheckCircle2 className="h-3 w-3" /> Saved</> : <><AlertCircle className="h-3 w-3" /> Not saved</>}
              </span>
            </div>
            <div className="space-y-3">
              {integration.fields.map((field) => (
                <div key={field.key} className="grid gap-2 sm:grid-cols-3 sm:items-center">
                  <label className="text-sm text-text-secondary">{field.label}</label>
                  <div className="sm:col-span-2">
                    {field.secret
                      ? <SecretInput value={values[field.key] ?? ""} onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))} placeholder={field.placeholder} />
                      : <TInput value={values[field.key] ?? ""} onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))} placeholder={field.placeholder} />}
                  </div>
                </div>
              ))}
              {integration.toggleKey && (
                <div className="pt-1">
                  <TToggle
                    checked={values[integration.toggleKey] === "true"}
                    onChange={(v) => setValues((prev) => ({ ...prev, [integration.toggleKey!]: String(v) }))}
                    label={integration.toggleLabel}
                  />
                </div>
              )}
            </div>
            <div className="mt-4">
              <button
                onClick={() => saveIntegration(integration.id, allKeys)}
                disabled={saving === integration.id}
                className="flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {saving === integration.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Save settings
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── API Keys Tab ──────────────────────────────────────────────────────────────

interface ApiKeyEntry {
  id: string;
  name: string;
  prefix: string;
  key: string;
  permissions: string[];
  createdAt: string;
  lastUsedAt: string;
  isActive: boolean;
}

function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyModal, setNewKeyModal] = useState<{ name: string; key: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showGenForm, setShowGenForm] = useState(false);

  async function loadKeys() {
    getSettings().then((s) => {
      if (s["api.keys"]) {
        try { setKeys(JSON.parse(s["api.keys"])); } catch { setKeys([]); }
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { loadKeys(); }, []);

  async function generateKey() {
    if (!newName.trim()) return;
    setGenerating(true);
    try {
      const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, "0")).join("");
      const fullKey = `mn_live_${randomPart}`;
      const entry: ApiKeyEntry = {
        id: crypto.randomUUID(),
        name: newName.trim(),
        prefix: fullKey.slice(0, 12),
        key: fullKey,
        permissions: ["orders:read", "menu:read"],
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        isActive: true,
      };
      const updated = [...keys, entry];
      await patchSettings({ "api.keys": JSON.stringify(updated) });
      setKeys(updated);
      setNewKeyModal({ name: entry.name, key: fullKey });
      setNewName("");
      setShowGenForm(false);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to generate key"); }
    finally { setGenerating(false); }
  }

  async function revokeKey(id: string) {
    try {
      const updated = keys.map((k) => k.id === id ? { ...k, isActive: false } : k);
      await patchSettings({ "api.keys": JSON.stringify(updated) });
      setKeys(updated);
      toast.success("Key revoked");
    } catch { toast.error("Failed to revoke key"); }
  }

  if (loading) return <div className="rounded-xl border border-border bg-surface p-6 text-sm text-text-tertiary">Loading…</div>;

  return (
    <div className="space-y-4">
      {newKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setNewKeyModal(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">API Key Record Created</h3>
              <button onClick={() => setNewKeyModal(null)}><X className="h-4 w-4 text-text-secondary" /></button>
            </div>
            <div className="rounded-xl border border-warning-200 bg-warning-50 p-3 mb-4 flex items-start gap-2 text-xs text-warning-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Copy this key now if you need to reference the record later. It is stored only in the admin UI.
            </div>
            <p className="text-sm font-medium text-text-primary mb-2">{newKeyModal.name}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-border bg-surface-secondary px-3 py-2 text-xs font-mono text-text-primary break-all">{newKeyModal.key}</code>
              <button onClick={() => { navigator.clipboard.writeText(newKeyModal.key); toast.success("Copied!"); }} className="shrink-0 rounded-lg border border-border p-2 hover:bg-surface-secondary">
                <Copy className="h-4 w-4 text-text-secondary" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">API keys are stored in the admin database. They are not enforced by the API yet.</p>
        <button onClick={() => setShowGenForm(true)} className="flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 whitespace-nowrap">
          <Key className="h-4 w-4" />
          Create Record
        </button>
      </div>

      {showGenForm && (
        <div className="rounded-xl border border-border bg-surface p-4 flex items-center gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Key name (e.g. Production Website)"
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && generateKey()}
          />
          <button onClick={generateKey} disabled={generating || !newName.trim()} className="flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 whitespace-nowrap">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {generating ? "Generating…" : "Create"}
          </button>
          <button onClick={() => setShowGenForm(false)} className="p-2 rounded-lg hover:bg-surface-secondary">
            <X className="h-4 w-4 text-text-secondary" />
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-secondary">
              {["Name", "Key Prefix", "Permissions", "Created", "Status", ""].map((col) => (
                <th key={col} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {keys.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-text-tertiary">No API keys yet. Generate one above.</td></tr>
            ) : keys.map((k) => (
              <tr key={k.id} className="hover:bg-surface-secondary">
                <td className="px-4 py-3 font-medium text-text-primary">{k.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-text-secondary">{k.prefix}••••</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {k.permissions.map((p) => (
                      <span key={p} className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-600">{p}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-text-secondary">{new Date(k.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                <td className="px-4 py-3">
                  <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", k.isActive ? "bg-success-50 text-success-700" : "bg-surface-tertiary text-text-tertiary")}>
                    {k.isActive ? "Active" : "Revoked"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {k.isActive && <button onClick={() => revokeKey(k.id)} className="text-xs font-medium text-danger-600 hover:text-danger-700">Revoke</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-warning-200 bg-warning-50 p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-warning-600 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-warning-700">Stored, not enforced</p>
          <p className="text-warning-600 mt-0.5">These records do not authorize live API access yet. Do not treat them as production credentials.</p>
        </div>
      </div>
    </div>
  );
}

// ── Security Tab ──────────────────────────────────────────────────────────────

function SecurityTab() {
  const [form, setForm] = useState({
    require2FA: "true", sessionTimeoutMinutes: "60", ipAllowlist: "",
    auditRetentionYears: "1", backupEnabled: "true",
    passwordMinChars: "8", passwordRequireUppercase: "true",
    passwordRequireNumber: "true", passwordRequireSpecial: "false", lockoutAttempts: "5",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setForm((f) => ({
        require2FA: s["security.require2FA"] ?? f.require2FA,
        sessionTimeoutMinutes: s["security.sessionTimeoutMinutes"] ?? f.sessionTimeoutMinutes,
        ipAllowlist: s["security.ipAllowlist"] ?? f.ipAllowlist,
        auditRetentionYears: s["security.auditRetentionYears"] ?? f.auditRetentionYears,
        backupEnabled: s["security.backupEnabled"] ?? f.backupEnabled,
        passwordMinChars: s["security.passwordMinChars"] ?? f.passwordMinChars,
        passwordRequireUppercase: s["security.passwordRequireUppercase"] ?? f.passwordRequireUppercase,
        passwordRequireNumber: s["security.passwordRequireNumber"] ?? f.passwordRequireNumber,
        passwordRequireSpecial: s["security.passwordRequireSpecial"] ?? f.passwordRequireSpecial,
        lockoutAttempts: s["security.lockoutAttempts"] ?? f.lockoutAttempts,
      }));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await patchSettings({
        "security.require2FA": form.require2FA,
        "security.sessionTimeoutMinutes": form.sessionTimeoutMinutes,
        "security.ipAllowlist": form.ipAllowlist,
        "security.auditRetentionYears": form.auditRetentionYears,
        "security.backupEnabled": form.backupEnabled,
        "security.passwordMinChars": form.passwordMinChars,
        "security.passwordRequireUppercase": form.passwordRequireUppercase,
        "security.passwordRequireNumber": form.passwordRequireNumber,
        "security.passwordRequireSpecial": form.passwordRequireSpecial,
        "security.lockoutAttempts": form.lockoutAttempts,
      });
      toast.success("Security settings saved");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  }

  const bool = (key: keyof typeof form) => form[key] === "true";
  const setBool = (key: keyof typeof form) => (v: boolean) => setForm((f) => ({ ...f, [key]: String(v) }));
  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  if (loading) return <div className="rounded-xl border border-border bg-surface p-6 text-sm text-text-tertiary">Loading…</div>;

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-6">Security Settings</h3>
      <FieldRow label="Two-Factor Authentication" description="Require 2FA for all admin logins">
        <TToggle checked={bool("require2FA")} onChange={setBool("require2FA")} label="Enforce 2FA for all admin users" />
      </FieldRow>
      <FieldRow label="Session Timeout" description="Auto-logout inactive sessions">
        <TSelect value={form.sessionTimeoutMinutes} onChange={set("sessionTimeoutMinutes")}>
          <option value="30">30 minutes</option>
          <option value="60">1 hour</option>
          <option value="240">4 hours</option>
          <option value="480">8 hours</option>
        </TSelect>
      </FieldRow>
      <FieldRow label="IP Allowlist" description="Restrict admin access to specific IPs (leave blank to allow all)">
        <textarea
          value={form.ipAllowlist}
          onChange={(e) => setForm((f) => ({ ...f, ipAllowlist: e.target.value }))}
          placeholder="Enter one IP or CIDR per line, e.g. 192.168.1.0/24"
          rows={3}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none resize-none font-mono"
        />
      </FieldRow>
      <FieldRow label="Audit Log Retention" description="How long to keep audit trail records">
        <TSelect value={form.auditRetentionYears} onChange={set("auditRetentionYears")}>
          <option value="1">1 year</option>
          <option value="3">3 years</option>
          <option value="7">7 years</option>
        </TSelect>
      </FieldRow>
      <FieldRow label="Data Backup" description="Automatic daily backup of all data">
        <TToggle checked={bool("backupEnabled")} onChange={setBool("backupEnabled")} label="Enable automatic daily backups" />
      </FieldRow>
      <FieldRow label="Password Policy" description="Minimum requirements for admin passwords">
        <div className="space-y-2">
          <TToggle checked={bool("passwordRequireUppercase")} onChange={setBool("passwordRequireUppercase")} label="At least one uppercase letter" />
          <TToggle checked={bool("passwordRequireNumber")} onChange={setBool("passwordRequireNumber")} label="At least one number" />
          <TToggle checked={bool("passwordRequireSpecial")} onChange={setBool("passwordRequireSpecial")} label="At least one special character" />
        </div>
      </FieldRow>
      <FieldRow label="Failed Login Lockout" description="Lock account after repeated failed attempts">
        <div className="flex items-center gap-3">
          <TSelect value={form.lockoutAttempts} onChange={set("lockoutAttempts")}>
            <option value="3">3 attempts</option>
            <option value="5">5 attempts</option>
            <option value="10">10 attempts</option>
          </TSelect>
          <span className="text-sm text-text-secondary whitespace-nowrap">then lock for 30 minutes</span>
        </div>
      </FieldRow>
      <SaveButton saving={saving} onClick={handleSave} />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("company");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="mt-0.5 text-sm text-text-secondary">Manage system configuration, integrations, and security</p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                tab === t.id ? "bg-brand-500 text-white" : "text-text-secondary hover:bg-surface-secondary"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "company" && <CompanyTab />}
      {tab === "billing" && <BillingTab />}
      {tab === "notifications" && <NotificationsTab />}
      {tab === "integrations" && <IntegrationsTab />}
      {tab === "api" && <ApiKeysTab />}
      {tab === "security" && <SecurityTab />}
    </div>
  );
}
