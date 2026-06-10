// ── Role & Permission System ─────────────────────────────────────────────────
// 12 roles matching CLAUDE.md spec. Permissions gate every nav item and action.

export type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "LOCATION_MANAGER"
  | "KITCHEN_MANAGER"
  | "FINANCE_MANAGER"
  | "SALES_MANAGER"
  | "HR_MANAGER"
  | "QUALITY_MANAGER"
  | "INVENTORY_MANAGER"
  | "CUSTOMER_SERVICE"
  | "KITCHEN_STAFF"
  | "DELIVERY_STAFF";

export type Module =
  | "dashboard"
  | "orders"
  | "menu"
  | "locations"
  | "schedule"
  | "kitchen"
  | "delivery"
  | "accounts"
  | "invoicing"
  | "inventory"
  | "customers"
  | "feedback"
  | "staff"
  | "reports"
  | "settings";

export type Action = "view" | "create" | "edit" | "delete" | "export";

export type Permission = `${Module}:${Action}`;

// All possible permissions
const ALL: Permission[] = (
  [
    "dashboard","orders","menu","locations","schedule","kitchen","delivery",
    "accounts","invoicing","inventory","customers","feedback","staff","reports","settings",
  ] as Module[]
).flatMap((m) =>
  (["view","create","edit","delete","export"] as Action[]).map(
    (a): Permission => `${m}:${a}`
  )
);

// ── Permission matrix ────────────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: ALL,

  ADMIN: ALL,

  LOCATION_MANAGER: [
    "dashboard:view",
    "orders:view", "orders:edit",
    "menu:view",
    "locations:view", "locations:edit",
    "schedule:view", "schedule:edit",
    "kitchen:view",
    "delivery:view", "delivery:edit",
    "customers:view",
    "feedback:view", "feedback:edit", "feedback:create",
    "staff:view",
    "reports:view",
    "inventory:view",
  ],

  KITCHEN_MANAGER: [
    "dashboard:view",
    "orders:view",
    "menu:view", "menu:create", "menu:edit", "menu:delete",
    "schedule:view", "schedule:create", "schedule:edit", "schedule:delete",
    "kitchen:view", "kitchen:edit",
    "inventory:view", "inventory:create", "inventory:edit",
    "reports:view",
  ],

  FINANCE_MANAGER: [
    "dashboard:view",
    "accounts:view",
    "invoicing:view", "invoicing:create", "invoicing:edit", "invoicing:delete", "invoicing:export",
    "customers:view",
    "reports:view", "reports:export",
    "orders:view",
  ],

  SALES_MANAGER: [
    "dashboard:view",
    "accounts:view", "accounts:create", "accounts:edit",
    "customers:view", "customers:create", "customers:edit",
    "orders:view",
    "invoicing:view",
    "reports:view",
    "feedback:view",
  ],

  HR_MANAGER: [
    "dashboard:view",
    "staff:view", "staff:create", "staff:edit", "staff:delete",
    "locations:view",
    "reports:view", "reports:export",
  ],

  QUALITY_MANAGER: [
    "dashboard:view",
    "feedback:view", "feedback:edit", "feedback:create",
    "orders:view",
    "locations:view",
    "menu:view",
    "reports:view",
    "inventory:view",
  ],

  INVENTORY_MANAGER: [
    "dashboard:view",
    "inventory:view", "inventory:create", "inventory:edit", "inventory:delete", "inventory:export",
    "locations:view",
    "orders:view",
    "reports:view",
  ],

  CUSTOMER_SERVICE: [
    "dashboard:view",
    "feedback:view", "feedback:edit", "feedback:create",
    "customers:view",
    "orders:view",
  ],

  KITCHEN_STAFF: [
    "kitchen:view", "kitchen:edit",
    "orders:view", "orders:edit",
    "schedule:view",
  ],

  DELIVERY_STAFF: [
    "delivery:view", "delivery:edit",
    "orders:view", "orders:edit",
  ],
};

// ── Role metadata (display labels, descriptions) ─────────────────────────────

export interface RoleMeta {
  label: string;
  description: string;
  color: string;
  bg: string;
}

export const ROLE_META: Record<Role, RoleMeta> = {
  SUPER_ADMIN:       { label: "Super Admin",       description: "Full access including system config", color: "text-danger-700",   bg: "bg-danger-50" },
  ADMIN:             { label: "Admin",              description: "Full access except system settings",  color: "text-brand-700",    bg: "bg-brand-50" },
  LOCATION_MANAGER:  { label: "Location Manager",   description: "Own location orders, menu, staff",    color: "text-purple-700",   bg: "bg-purple-50" },
  KITCHEN_MANAGER:   { label: "Kitchen Manager",    description: "Menu, production, recipes, inventory", color: "text-amber-700",   bg: "bg-amber-50" },
  FINANCE_MANAGER:   { label: "Finance Manager",    description: "Billing, invoices, payments, GST",    color: "text-success-700",  bg: "bg-success-50" },
  SALES_MANAGER:     { label: "Sales Manager",      description: "Leads, proposals, corporate accounts", color: "text-info-700",   bg: "bg-info-50" },
  HR_MANAGER:        { label: "HR Manager",         description: "Staff, scheduling, payroll",           color: "text-indigo-700",  bg: "bg-indigo-50" },
  QUALITY_MANAGER:   { label: "Quality Manager",    description: "Inspections, compliance, FSSAI",       color: "text-teal-700",   bg: "bg-teal-50" },
  INVENTORY_MANAGER: { label: "Inventory Manager",  description: "Stock, procurement, suppliers",        color: "text-orange-700",  bg: "bg-orange-50" },
  CUSTOMER_SERVICE:  { label: "Customer Service",   description: "Tickets, feedback, complaints",        color: "text-pink-700",    bg: "bg-pink-50" },
  KITCHEN_STAFF:     { label: "Kitchen Staff",      description: "View production sheets, update status", color: "text-yellow-700", bg: "bg-yellow-50" },
  DELIVERY_STAFF:    { label: "Delivery Staff",     description: "View and update delivery status",      color: "text-cyan-700",    bg: "bg-cyan-50" },
};

// ── Helper ───────────────────────────────────────────────────────────────────

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
