// ── Base configuration ──────────────────────────────────────────────────────

const BASE_URL = "/api/admin";
const REQUEST_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS || 20000);

function buildRequestSignal(signal?: AbortSignal | null): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || "location";
}

// NestJS wraps all responses in { success, data, timestamp }
// Paginated responses have shape: { data: T[], total, page, pageSize, totalPages }
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    cache: "no-store",
    credentials: "include",
    signal: buildRequestSignal(),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  const json = await res.json();
  return json.data as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    credentials: "include",
    body: JSON.stringify(body),
    signal: buildRequestSignal(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || `API error ${res.status}`);
  }
  const json = await res.json();
  return json.data as T;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    credentials: "include",
    body: JSON.stringify(body),
    signal: buildRequestSignal(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || `API error ${res.status}`);
  }
  const json = await res.json();
  return json.data as T;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    credentials: "include",
    body: JSON.stringify(body),
    signal: buildRequestSignal(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || `API error ${res.status}`);
  }
  const json = await res.json();
  return json.data as T;
}

export async function apiPostFormData<T>(path: string, body: FormData): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    body,
    signal: buildRequestSignal(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || `API error ${res.status}`);
  }
  const json = await res.json();
  return json.data as T;
}

export async function apiDelete<T = void>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    credentials: "include",
    signal: buildRequestSignal(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || `Delete failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface ApiPage<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Corporate Accounts ──────────────────────────────────────────────────────

export interface ApiCorporateAccount {
  id: string;
  companyName: string;
  gstin?: string;
  contactPerson?: string;
  contactPhone?: string;
  billingEmail: string;
  billingAddress: string;
  billingCity: string;
  billingPincode: string;
  billingState: string;
  stateCode: string;
  paymentTermsDays: number;
  subsidyPerMeal: number;
  maxMealsPerDay: number;
  ratePerBreakfast?: number;
  ratePerLunch?: number;
  ratePerSnacks?: number;
  ratePerDinner?: number;
  monthlyBudgetCap?: number;
  maxMealsPerMonth?: number;
  contractStart: string;
  contractEnd: string;
  isActive: boolean;
  createdAt: string;
  _count: { customers: number };
  outstandingAmount: number;
}

export function getCorporateAccounts(): Promise<ApiPage<ApiCorporateAccount>> {
  return apiGet<ApiPage<ApiCorporateAccount>>("/corporate?pageSize=100");
}

export function getCorporateAccount(id: string): Promise<ApiCorporateAccount> {
  return apiGet<ApiCorporateAccount>(`/corporate/${id}`);
}

export type ReviewStatus =
  | "PENDING"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED";

export interface ApiCorporateOnboardingRequest {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  city?: string | null;
  locationsCount?: number | null;
  estimatedDailyMeals?: number | null;
  mealSlots: string[];
  serviceDays: string[];
  goLiveDate?: string | null;
  budgetBand?: string | null;
  billingModel?: string | null;
  notes?: string | null;
  reviewStatus: ReviewStatus;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  accessTokenExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiReviewedCorporateOnboardingRequest extends ApiCorporateOnboardingRequest {
  accessToken?: string | null;
}

export function getCorporateOnboardingRequests(params?: {
  reviewStatus?: ReviewStatus;
  page?: number;
  pageSize?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.reviewStatus) qs.set("reviewStatus", params.reviewStatus);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiGet<ApiPage<ApiCorporateOnboardingRequest>>(`/leads/corporate-requests${suffix}`);
}

export function reviewCorporateOnboardingRequest(
  id: string,
  data: {
    reviewStatus: ReviewStatus;
    notes?: string;
    issueAccessToken?: boolean;
    regenerateAccessToken?: boolean;
  },
) {
  return apiPatch<ApiReviewedCorporateOnboardingRequest>(`/leads/corporate-requests/${id}/review`, data);
}

// ── Volume Pricing Slabs ────────────────────────────────────────────────────

export interface VolumePricingSlab {
  id: string;
  corporateAccountId: string;
  mealSlot: string | null;
  fromQuantity: number;
  toQuantity: number | null;
  ratePerMeal: number;
  sortOrder: number;
}

export function getCorporateSlabs(accountId: string): Promise<VolumePricingSlab[]> {
  return apiGet<VolumePricingSlab[]>(`/corporate/${accountId}/pricing-slabs`);
}

export function saveCorporateSlabs(
  accountId: string,
  slabs: Omit<VolumePricingSlab, "id" | "corporateAccountId" | "sortOrder">[],
): Promise<VolumePricingSlab[]> {
  return apiPatch<VolumePricingSlab[]>(`/corporate/${accountId}/pricing-slabs`, { slabs });
}

// ── Invoices ────────────────────────────────────────────────────────────────

export interface ApiInvoiceItem {
  id: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  taxableValue: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface ApiInvoicePayment {
  id: string;
  amount: number;
  entryType: string;
  method: string;
  reference?: string;
  paidAt: string;
  createdAt: string;
}

export interface ApiEInvoiceSubmission {
  id: string;
  action?: string;
  provider: string;
  status: string;
  errorMessage?: string;
  submittedAt: string;
  completedAt?: string;
}

export interface ApiInvoice {
  id: string;
  invoiceNumber: string;
  corporateAccountId?: string;
  billingRunId?: string;
  originalInvoiceId?: string;
  corporateAccount?: {
    companyName: string;
    gstin?: string;
    billingCity?: string;
    billingState?: string;
  };
  originalInvoice?: {
    id: string;
    invoiceNumber: string;
  };
  creditNotes?: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    total: number;
  }>;
  billingRun?: {
    id: string;
    billingPeriodId: string;
  };
  type: string;
  status: string;
  issueDate: string;
  postedAt?: string;
  dueDate: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  total: number;
  amountPaid: number;
  creditedAmount: number;
  balanceDue: number;
  hsnCode: string;
  placeOfSupply: string;
  irn?: string;
  eInvoiceStatus: string;
  eInvoiceProvider: string;
  eInvoiceError?: string;
  eInvoiceAckNo?: string;
  eInvoiceAckDate?: string;
  eInvoiceSubmittedAt?: string;
  eInvoiceCancelledAt?: string;
  eInvoiceCancelReason?: string;
  eInvoiceCancelRemarks?: string;
  buyerNameSnapshot: string;
  buyerGstinSnapshot?: string;
  gstAdjustmentRequired?: boolean;
  sourceFiledGstMonth?: string | null;
  creditNoteReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items: ApiInvoiceItem[];
  paymentRecords?: ApiInvoicePayment[];
  adjustmentRequests?: ApiInvoiceAdjustmentRequest[];
  eInvoiceSubmissions?: ApiEInvoiceSubmission[];
  billableConsumptions?: Array<{
    id: string;
    orderNumber?: string;
    deliveryDate: string;
    quantity: number;
    total: number;
    status: string;
  }>;
}

export interface ApiInvoiceAdjustmentRequest {
  id: string;
  invoiceId: string;
  type: string;
  status: string;
  amount: number;
  reason?: string;
  method?: string;
  reference?: string;
  effectiveDate?: string;
  releaseConsumptions: boolean;
  sourceFiledMonth: string;
  sourceBatchId?: string;
  requestedByUserId?: string;
  requestedByName?: string;
  reviewedByUserId?: string;
  reviewedByName?: string;
  reviewNotes?: string;
  appliedCreditNoteId?: string;
  appliedCreditNoteNo?: string;
  appliedPaymentId?: string;
  requestedAt: string;
  reviewedAt?: string;
  appliedAt?: string;
  createdAt: string;
  updatedAt: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    postedAt?: string;
    status: string;
    total?: number;
    corporateAccount?: {
      companyName: string;
      gstin?: string;
    };
  };
}

export interface CreateInvoicePayload {
  corporateAccountId?: string;
  buyerName?: string;
  buyerGstin?: string;
  buyerAddress?: string;
  placeOfSupply?: string;
  serviceCategory?: "MEAL" | "EVENT";
  paymentTermsDays?: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  lines: { description: string; quantity: number; unitPrice: number }[];
  subsidyPerMeal?: number;
  notes?: string;
}

export function getInvoices(params?: {
  status?: string;
  corporateAccountId?: string;
  type?: string;
}): Promise<ApiPage<ApiInvoice>> {
  const qs = new URLSearchParams({ pageSize: "100" });
  if (params?.status) qs.set("status", params.status);
  if (params?.corporateAccountId) qs.set("corporateAccountId", params.corporateAccountId);
  if (params?.type) qs.set("type", params.type);
  return apiGet<ApiPage<ApiInvoice>>(`/invoices?${qs}`);
}

export function getCreditNotes(params?: {
  corporateAccountId?: string;
  status?: string;
}): Promise<ApiPage<ApiInvoice>> {
  return getInvoices({ ...params, type: "CREDIT_NOTE" });
}

export function getInvoice(id: string): Promise<ApiInvoice> {
  return apiGet<ApiInvoice>(`/invoices/${id}`);
}

export function createInvoice(payload: CreateInvoicePayload): Promise<ApiInvoice> {
  return apiPost<ApiInvoice>("/invoices", payload);
}

export function updateInvoiceStatus(id: string, status: string): Promise<ApiInvoice> {
  return apiPatch<ApiInvoice>(`/invoices/${id}/status`, { status });
}

export function issueInvoice(id: string): Promise<ApiInvoice> {
  return apiPost<ApiInvoice>(`/invoices/${id}/issue`, {});
}

export interface InvoiceCheckoutOrderResponse {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  paymentId: string;
  reusedExistingOrder: boolean;
  supersededPendingOrders: number;
}

export interface VerifyRazorpayPaymentPayload {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export function createInvoicePaymentOrder(
  invoiceId: string,
): Promise<InvoiceCheckoutOrderResponse> {
  return apiPost<InvoiceCheckoutOrderResponse>("/payments/create-invoice-order", {
    invoiceId,
  });
}

export function verifyRazorpayPayment(
  payload: VerifyRazorpayPaymentPayload,
): Promise<{ verified: boolean; invoiceId?: string; orderId?: string }> {
  return apiPost<{ verified: boolean; invoiceId?: string; orderId?: string }>(
    "/payments/verify",
    {
      razorpay_order_id: payload.razorpayOrderId,
      razorpay_payment_id: payload.razorpayPaymentId,
      razorpay_signature: payload.razorpaySignature,
    },
  );
}

export function submitInvoiceEInvoice(id: string): Promise<ApiInvoice> {
  return apiPost<ApiInvoice>(`/invoices/${id}/e-invoice/submit`, {});
}

export interface CancelInvoiceEInvoicePayload {
  cancelReason?: string;
  remarks?: string;
}

export function cancelInvoiceEInvoice(
  id: string,
  payload?: CancelInvoiceEInvoicePayload,
): Promise<ApiInvoice> {
  return apiPost<ApiInvoice>(`/invoices/${id}/e-invoice/cancel`, payload ?? {});
}

export function syncInvoiceEInvoice(id: string): Promise<ApiInvoice> {
  return apiPost<ApiInvoice>(`/invoices/${id}/e-invoice/sync`, {});
}

export function markInvoicePaid(id: string): Promise<ApiInvoice> {
  return apiPost<ApiInvoice>(`/invoices/${id}/mark-paid`, {});
}

export interface RecordInvoicePaymentPayload {
  amount: number;
  method: string;
  reference?: string;
  paidAt?: string;
}

export function recordInvoicePayment(
  id: string,
  payload: RecordInvoicePaymentPayload,
): Promise<ApiInvoice> {
  return apiPost<ApiInvoice>(`/invoices/${id}/payments`, payload);
}

export interface RecordInvoiceRefundPayload {
  amount: number;
  method: string;
  reference?: string;
  refundedAt?: string;
}

export function recordInvoiceRefund(
  id: string,
  payload: RecordInvoiceRefundPayload,
): Promise<ApiInvoice> {
  return apiPost<ApiInvoice>(`/invoices/${id}/refunds`, payload);
}

export function cancelInvoice(id: string): Promise<ApiInvoice> {
  return apiPost<ApiInvoice>(`/invoices/${id}/cancel`, {});
}

// ── Receivables Aging ──────────────────────────────────────────────────────

export interface AgingBucket {
  current: number;
  bucket1to30: number;
  bucket31to60: number;
  bucket61to90: number;
  bucket90plus: number;
  total: number;
}

export interface ApiAgingRow {
  corporateAccountId: string;
  companyName: string;
  billingEmail: string;
  contactPerson: string | null;
  contactPhone: string | null;
  buckets: AgingBucket;
  invoiceCount: number;
}

export interface ApiAgingReport {
  rows: ApiAgingRow[];
  totals: AgingBucket;
  asOf: string;
}

export function getAgingReport(): Promise<ApiAgingReport> {
  return apiGet<ApiAgingReport>("/invoices/receivables/aging");
}

export interface CreateCreditNotePayload {
  reason: string;
  amount?: number;
  issueDate?: string;
  releaseConsumptions?: boolean;
}

export interface ApiCreditNoteResult {
  creditNote: ApiInvoice;
  originalInvoice: ApiInvoice;
}

export function createCreditNote(
  id: string,
  payload: CreateCreditNotePayload,
): Promise<ApiCreditNoteResult> {
  return apiPost<ApiCreditNoteResult>(`/invoices/${id}/credit-note`, payload);
}

export interface CreateCreditNoteAdjustmentRequestPayload {
  reason: string;
  amount?: number;
  effectiveDate?: string;
  releaseConsumptions?: boolean;
}

export function createCreditNoteAdjustmentRequest(
  id: string,
  payload: CreateCreditNoteAdjustmentRequestPayload,
): Promise<ApiInvoiceAdjustmentRequest> {
  return apiPost<ApiInvoiceAdjustmentRequest>(
    `/invoices/${id}/adjustment-requests/credit-note`,
    payload,
  );
}

export interface CreateRefundAdjustmentRequestPayload {
  amount: number;
  method: string;
  reference?: string;
  effectiveDate?: string;
  reason?: string;
}

export function createRefundAdjustmentRequest(
  id: string,
  payload: CreateRefundAdjustmentRequestPayload,
): Promise<ApiInvoiceAdjustmentRequest> {
  return apiPost<ApiInvoiceAdjustmentRequest>(
    `/invoices/${id}/adjustment-requests/refund`,
    payload,
  );
}

export function getInvoiceAdjustmentRequests(params?: {
  status?: string;
  month?: string;
  invoiceId?: string;
}): Promise<ApiInvoiceAdjustmentRequest[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.month) qs.set("month", params.month);
  if (params?.invoiceId) qs.set("invoiceId", params.invoiceId);
  const suffix = qs.toString() ? `?${qs}` : "";
  return apiGet<ApiInvoiceAdjustmentRequest[]>(`/invoices/adjustment-requests${suffix}`);
}

export function applyInvoiceAdjustmentRequest(
  requestId: string,
  reviewNotes?: string,
): Promise<ApiInvoiceAdjustmentRequest> {
  return apiPost<ApiInvoiceAdjustmentRequest>(
    `/invoices/adjustment-requests/${requestId}/apply`,
    reviewNotes ? { reviewNotes } : {},
  );
}

export function rejectInvoiceAdjustmentRequest(
  requestId: string,
  reviewNotes?: string,
): Promise<ApiInvoiceAdjustmentRequest> {
  return apiPost<ApiInvoiceAdjustmentRequest>(
    `/invoices/adjustment-requests/${requestId}/reject`,
    reviewNotes ? { reviewNotes } : {},
  );
}

export interface ApiBillingRun {
  id: string;
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
  totalConsumptions: number;
  totalTaxableAmount: number;
  totalAmount: number;
  errorMessage?: string | null;
  corporateAccount: {
    id: string;
    companyName: string;
    billingCity?: string;
    billingState?: string;
  };
  invoice?: {
    id: string;
    invoiceNumber: string;
    total: number;
    status: string;
  } | null;
}

export interface ApiGstFilingBatchItem {
  id: string;
  invoiceId: string;
  documentType: string;
  invoiceNumber: string;
  postedAt: string;
  counterpartyName: string;
  counterpartyGstin?: string;
  placeOfSupply: string;
  taxableAmount: number;
  totalTaxAmount: number;
  totalInvoiceAmount: number;
  irn?: string;
  eInvoiceStatus: string;
  originalInvoiceNumber?: string;
}

export interface ApiGstFilingSubmission {
  id: string;
  revision?: number;
  action: string;
  provider: string;
  status: string;
  errorMessage?: string | null;
  submittedAt: string;
  completedAt?: string | null;
}

export interface ApiGstFilingBatch {
  id: string;
  month: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  revision: number;
  lastUploadedRevision?: number | null;
  hasDriftSinceLastUpload?: boolean;
  filingProvider: string;
  providerStatus?: string | null;
  filingReference?: string | null;
  filingError?: string | null;
  totalDocuments: number;
  totalTaxableAmount: number;
  totalTaxAmount: number;
  totalInvoiceAmount: number;
  generatedAt?: string;
  lastSubmittedAt?: string | null;
  lastSyncedAt?: string | null;
  evcRequestedAt?: string | null;
  filedAt?: string;
  items: ApiGstFilingBatchItem[];
  submissions?: ApiGstFilingSubmission[];
}

export interface ApiGstPeriodSummary {
  month: string;
  periodStart: string;
  periodEnd: string;
  stats: {
    totalDocuments: number;
    taxInvoices: number;
    creditNotes: number;
    b2bDocuments: number;
    b2cDocuments: number;
    eInvoiced: number;
    irnPending: number;
    irnFailed: number;
    totalTaxableAmount: number;
    totalTaxAmount: number;
    totalInvoiceAmount: number;
  };
  gstr1: {
    totalDocuments: number;
    taxInvoices: number;
    creditNotes: number;
    netTaxableAmount: number;
    netTaxAmount: number;
    netDocumentValue: number;
    b2bParties: number;
    b2bInvoices: number;
    b2csBuckets: number;
    registeredCreditNotes: number;
    unregisteredCreditNotes: number;
    hsnRows: number;
    appliedAdjustments: number;
  };
  batch: ApiGstFilingBatch | null;
  documents: ApiInvoice[];
}

export interface ApiBillingPeriod {
  id: string | null;
  month: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  startedAt?: string | null;
  invoicedAt?: string | null;
  closedAt?: string | null;
  totalActiveAccounts: number;
  completedRuns: number;
  failedRuns: number;
  pendingAccounts: number;
  runs: ApiBillingRun[];
}

export function getBillingPeriod(month: string): Promise<ApiBillingPeriod> {
  const qs = new URLSearchParams({ month });
  return apiGet<ApiBillingPeriod>(`/billing/period?${qs}`);
}

export function closeBillingPeriod(month: string): Promise<ApiBillingPeriod> {
  return apiPost<ApiBillingPeriod>("/billing/period/close", { month });
}

// ── Customers ───────────────────────────────────────────────────────────────

export interface ApiCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  corporateAccountId?: string;
  corporateAccount?: { id: string; companyName: string };
  dietaryPreference: string;
  spicePreference: number;
  allergens: string[];
  mealCardId?: string;
  isActive: boolean;
  createdAt: string;
  _count: { orders: number };
}

export function getCustomers(params?: {
  corporateAccountId?: string;
  search?: string;
  pageSize?: number;
}): Promise<ApiPage<ApiCustomer>> {
  const qs = new URLSearchParams({ pageSize: String(params?.pageSize ?? 100) });
  if (params?.corporateAccountId) qs.set("corporateAccountId", params.corporateAccountId);
  if (params?.search) qs.set("search", params.search);
  return apiGet<ApiPage<ApiCustomer>>(`/customers?${qs}`);
}

// ── Employees (internal staff) ──────────────────────────────────────────────

export interface ApiEmployee {
  id: string;
  employeeId: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  locationId?: string;
  dateOfJoining: string;
  salary: number;
  pfNumber?: string;
  esiNumber?: string;
  isActive: boolean;
  createdAt: string;
}

export function getEmployees(params?: {
  locationId?: string;
  search?: string;
  isActive?: boolean;
}): Promise<ApiPage<ApiEmployee>> {
  const qs = new URLSearchParams({ pageSize: "200" });
  if (params?.locationId) qs.set("locationId", params.locationId);
  if (params?.search) qs.set("search", params.search);
  if (params?.isActive !== undefined) qs.set("isActive", String(params.isActive));
  return apiGet<ApiPage<ApiEmployee>>(`/employees?${qs}`);
}

// ── Inventory ────────────────────────────────────────────────────────────────

export interface ApiInventoryItem {
  id: string;
  ingredientId: string;
  ingredient: {
    id: string;
    name: string;
    unit: string;
    costPerUnit: number;
    isPerishable: boolean;
    supplier?: { id: string; name: string };
  };
  locationId: string;
  location: { id: string; name: string };
  currentStock: number;
  reorderPoint: number;
  maxStock: number;
  unit: string;
  lastRestocked?: string;
  expiryDate?: string;
}

export interface ApiIngredient {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  isPerishable: boolean;
  supplier?: { id: string; name: string };
}

export function getInventory(params?: {
  locationId?: string;
  search?: string;
  lowStockOnly?: boolean;
}): Promise<ApiPage<ApiInventoryItem>> {
  const qs = new URLSearchParams({ pageSize: "200" });
  if (params?.locationId) qs.set("locationId", params.locationId);
  if (params?.search) qs.set("search", params.search);
  if (params?.lowStockOnly) qs.set("lowStockOnly", "true");
  return apiGet<ApiPage<ApiInventoryItem>>(`/inventory?${qs}`);
}

export function getIngredients(search?: string): Promise<ApiPage<ApiIngredient>> {
  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  const suffix = qs.toString() ? `?${qs}` : "";
  return apiGet<ApiPage<ApiIngredient>>(`/inventory/ingredients${suffix}`);
}

// ── Feedback ─────────────────────────────────────────────────────────────────

export interface ApiFeedback {
  id: string;
  rating: number;
  comment?: string;
  category?: string;
  sentiment?: string;
  status: string;
  createdAt: string;
  customer: { id: string; name: string; phone: string };
  order: {
    orderNumber: string;
    location: { id: string; name: string };
  };
}

export function getFeedback(params?: {
  status?: string;
  sentiment?: string;
  locationId?: string;
}): Promise<ApiPage<ApiFeedback>> {
  const qs = new URLSearchParams({ pageSize: "100" });
  if (params?.status) qs.set("status", params.status);
  if (params?.sentiment) qs.set("sentiment", params.sentiment);
  if (params?.locationId) qs.set("locationId", params.locationId);
  return apiGet<ApiPage<ApiFeedback>>(`/feedback?${qs}`);
}

export function updateFeedbackStatus(id: string, status: string): Promise<ApiFeedback> {
  return apiPatch<ApiFeedback>(`/feedback/${id}/status`, { status });
}

// ── Orders ───────────────────────────────────────────────────────────────────

export interface ApiOrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  gstRate?: number;
  total: number;
  menuItem?: {
    id: string;
    name: string;
    slug?: string;
  } | null;
}

export interface ApiOrderCustomerAddress {
  id: string;
  label: string;
  address: string;
  landmark?: string | null;
  city: string;
  pincode: string;
  isDefault: boolean;
}

export interface ApiOrderCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  dietaryPreference?: string;
  spicePreference?: number;
  allergens?: string[];
  corporateAccount?: { id: string; companyName: string } | null;
  addresses?: ApiOrderCustomerAddress[];
}

export interface ApiOrderLocation {
  id: string;
  name: string;
  address?: string;
  city?: string;
  pincode?: string;
  contactPerson?: string | null;
  contactPhone?: string | null;
  corporateAccount?: { id: string; companyName: string } | null;
}

export interface ApiOrderPayment {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  razorpayPaymentId?: string | null;
  razorpayOrderId?: string | null;
  paidAt?: string | null;
  refundId?: string | null;
  refundedAt?: string | null;
  createdAt: string;
}

export interface ApiOrderDelivery {
  id: string;
  status: string;
  pickupTime?: string | null;
  deliveryTime?: string | null;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ApiOrderFeedback {
  id: string;
  rating: number;
  comment?: string | null;
  status?: string;
  createdAt: string;
}

export interface ApiOrder {
  id: string;
  orderNumber: string;
  status: string;
  type: string;
  mealSlot: string;
  deliveryDate: string;
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  total: number;
  paymentStatus: string;
  paymentMethod?: string | null;
  specialInstructions?: string;
  cancelReason?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  customer: ApiOrderCustomer;
  location: ApiOrderLocation;
  items: ApiOrderItem[];
}

export interface ApiOrderDetail extends ApiOrder {
  payments: ApiOrderPayment[];
  delivery?: ApiOrderDelivery | null;
  feedback?: ApiOrderFeedback | null;
}

export function getOrders(params?: {
  status?: string;
  locationId?: string;
  dateFrom?: string;
  dateTo?: string;
  pageSize?: number;
}): Promise<ApiPage<ApiOrder>> {
  const qs = new URLSearchParams({ pageSize: String(params?.pageSize ?? 100) });
  if (params?.status) qs.set("status", params.status);
  if (params?.locationId) qs.set("locationId", params.locationId);
  if (params?.dateFrom) qs.set("dateFrom", params.dateFrom);
  if (params?.dateTo) qs.set("dateTo", params.dateTo);
  return apiGet<ApiPage<ApiOrder>>(`/orders?${qs}`);
}

export function getOrder(id: string): Promise<ApiOrderDetail> {
  return apiGet<ApiOrderDetail>(`/orders/${id}`);
}

export function updateOrder(id: string, data: {
  deliveryDate?: string;
  mealSlot?: string;
  specialInstructions?: string;
}): Promise<ApiOrderDetail> {
  return apiPatch<ApiOrderDetail>(`/orders/${id}`, data);
}

export function updateOrderStatus(id: string, status: string): Promise<ApiOrder> {
  return apiPatch<ApiOrder>(`/orders/${id}/status`, { status });
}

export function cancelOrder(id: string, reason: string): Promise<ApiOrderDetail> {
  return apiPatch<ApiOrderDetail>(`/orders/${id}/cancel`, { reason });
}

// ── Locations ─────────────────────────────────────────────────────────────────

export interface ApiLocation {
  id: string;
  name: string;
  slug: string;
  type: ApiLocationType;
  address: string;
  city?: string;
  pincode?: string;
  contactPerson?: string;
  contactPhone?: string;
  fssaiLicense?: string;
  isActive: boolean;
  isRestricted: boolean;
  corporateAccountId: string | null;
  dailyCapacity: number;
  openTime: string;
  closeTime: string;
}

export type ApiLocationType =
  | "CORPORATE_CAFETERIA"
  | "HOSTEL"
  | "EVENT_VENUE"
  | "CLOUD_KITCHEN"
  | "CENTRAL_KITCHEN";

export function getLocations(): Promise<ApiLocation[]> {
  return apiGet<ApiLocation[]>("/locations/admin/all").catch(() =>
    apiGet<ApiLocation[]>("/locations"),
  );
}

export function updateLocation(
  id: string,
  data: Partial<Pick<ApiLocation,
    "name" | "type" | "address" | "city" | "pincode" | "contactPerson" | "contactPhone" |
    "fssaiLicense" | "isActive" | "isRestricted" | "dailyCapacity" | "openTime" | "closeTime"
  >>
): Promise<ApiLocation> {
  return apiPatch<ApiLocation>(`/locations/${id}`, data);
}

// ── Menu Categories ───────────────────────────────────────────────────────────

export interface ApiMenuCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

export function getMenuCategories(): Promise<ApiMenuCategory[]> {
  return apiGet<ApiMenuCategory[]>("/menu/admin/categories").catch(() =>
    apiGet<ApiMenuCategory[]>("/menu/categories"),
  );
}

export function createMenuCategory(data: {
  name: string;
  slug?: string;
  sortOrder?: number;
}): Promise<ApiMenuCategory> {
  return apiPost<ApiMenuCategory>("/menu/categories", data);
}

export function updateMenuCategory(
  id: string,
  data: Partial<{ name: string; slug: string; sortOrder: number; isActive: boolean }>,
): Promise<ApiMenuCategory> {
  return apiPatch<ApiMenuCategory>(`/menu/categories/${id}`, data);
}

export function deleteMenuCategory(id: string): Promise<void> {
  return apiDelete(`/menu/categories/${id}`);
}

// ── Menu Items (location-aware) ───────────────────────────────────────────────

export interface ApiMenuItem {
  id: string;
  name: string;
  nameHi: string | null;
  slug: string;
  description: string | null;
  basePrice: number;
  isAvailable: boolean;
  isJain: boolean;
  isVegan: boolean;
  sortOrder: number;
  category: { id: string; name: string; slug: string } | null;
  // Nutrition fields (per 100g, populated via Edamam or manual entry)
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sodium: number | null;
  sugar: number | null;
  saturatedFat: number | null;
  nutritionSource: string | null;
}

export function getMenuItem(idOrSlug: string): Promise<ApiMenuItem> {
  return apiGet<ApiMenuItem>(`/menu/items/${idOrSlug}`);
}

export function getMenuItems(params?: {
  locationId?: string;
  categoryId?: string;
  search?: string;
}): Promise<ApiPage<ApiMenuItem>> {
  const qs = new URLSearchParams({ pageSize: "200" });
  if (params?.locationId) qs.set("locationId", params.locationId);
  if (params?.categoryId) qs.set("categoryId", params.categoryId);
  if (params?.search) qs.set("search", params.search);
  return apiGet<ApiPage<ApiMenuItem>>(`/menu/items?${qs}`);
}

export interface CreateMenuItemPayload {
  name: string;
  nameHi?: string;
  description?: string;
  basePrice: number;
  categoryId?: string;
  locationId?: string;
  isJain?: boolean;
  isVegan?: boolean;
  isAvailable?: boolean;
  sortOrder?: number;
  // Nutrition (per 100g)
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sodium?: number;
  sugar?: number;
  saturatedFat?: number;
}

export function createMenuItem(payload: CreateMenuItemPayload): Promise<ApiMenuItem> {
  return apiPost<ApiMenuItem>("/menu/items", payload);
}

export function updateMenuItem(id: string, payload: Partial<CreateMenuItemPayload>): Promise<ApiMenuItem> {
  return apiPatch<ApiMenuItem>(`/menu/items/${id}`, payload);
}

export function toggleMenuItemAvailability(id: string, isAvailable: boolean): Promise<ApiMenuItem> {
  return apiPatch<ApiMenuItem>(`/menu/items/${id}`, { isAvailable });
}

export function enrichMenuItemNutrition(id: string): Promise<ApiMenuItem & { enriched: boolean; message?: string }> {
  return apiPost(`/nutrition/enrich/${id}`, {});
}

export function enrichAllMenuItemsNutrition(): Promise<{ total: number; enriched: number; noMatch: number; skipped: number }> {
  return apiPost("/nutrition/enrich-all", {});
}

// ── Corporate Accounts CRUD ──────────────────────────────────────────────────

export interface CreateCorporateAccountPayload {
  companyName: string;
  gstin?: string;
  contactPerson?: string;
  contactPhone?: string;
  billingEmail: string;
  billingAddress: string;
  billingCity: string;
  billingPincode: string;
  billingState: string;
  stateCode: string;
  paymentTermsDays: number;
  subsidyPerMeal: number;
  maxMealsPerDay: number;
  ratePerBreakfast?: number;
  ratePerLunch?: number;
  ratePerSnacks?: number;
  ratePerDinner?: number;
  monthlyBudgetCap?: number;
  maxMealsPerMonth?: number;
  contractStart: string;
  contractEnd: string;
}

export function createCorporateAccount(payload: CreateCorporateAccountPayload): Promise<ApiCorporateAccount> {
  return apiPost<ApiCorporateAccount>("/corporate", payload);
}

export function updateCorporateAccount(id: string, payload: Partial<CreateCorporateAccountPayload & { isActive: boolean }>): Promise<ApiCorporateAccount> {
  return apiPatch<ApiCorporateAccount>(`/corporate/${id}`, payload);
}

// ── Customers CRUD ───────────────────────────────────────────────────────────

export interface CreateCustomerPayload {
  name: string;
  phone: string;
  email?: string;
  corporateAccountId?: string;
  dietaryPreference?: string;
  spicePreference?: number;
  allergens?: string[];
  mealCardId?: string;
}

export function createCustomer(payload: CreateCustomerPayload): Promise<ApiCustomer> {
  return apiPost<ApiCustomer>("/customers", payload);
}

export function updateCustomer(id: string, payload: Partial<CreateCustomerPayload & { isActive: boolean }>): Promise<ApiCustomer> {
  return apiPatch<ApiCustomer>(`/customers/${id}`, payload);
}

// ── Employees CRUD ───────────────────────────────────────────────────────────

export interface CreateEmployeePayload {
  name: string;
  phone: string;
  email?: string;
  role: string;
  locationId?: string;
  salary: number;
  pfNumber?: string;
  esiNumber?: string;
  dateOfJoining: string;
}

export function createEmployee(payload: CreateEmployeePayload): Promise<ApiEmployee> {
  return apiPost<ApiEmployee>("/employees", payload);
}

export function updateEmployee(id: string, payload: Partial<CreateEmployeePayload & { isActive: boolean }>): Promise<ApiEmployee> {
  return apiPatch<ApiEmployee>(`/employees/${id}`, payload);
}

// ── Inventory CRUD ───────────────────────────────────────────────────────────

export interface CreateInventoryItemPayload {
  ingredientName: string;
  unit: string;
  locationId: string;
  currentStock: number;
  reorderPoint: number;
  maxStock: number;
  costPerUnit: number;
  isPerishable?: boolean;
  supplierName?: string;
}

async function createIngredient(payload: {
  name: string;
  unit: string;
  costPerUnit: number;
  isPerishable?: boolean;
  supplierName?: string;
}): Promise<ApiIngredient> {
  return apiPost<ApiIngredient>("/inventory/ingredients", payload);
}

export async function createInventoryItem(payload: CreateInventoryItemPayload): Promise<ApiInventoryItem> {
  const normalizedName = payload.ingredientName.trim();
  if (!normalizedName) {
    throw new Error("Ingredient name is required");
  }

  const ingredients = await getIngredients(normalizedName).catch(() => ({
    data: [] as ApiIngredient[],
    total: 0,
    page: 1,
    pageSize: 0,
    totalPages: 0,
  }));

  const existingIngredient = ingredients.data.find(
    (ingredient) =>
      ingredient.name.trim().toLowerCase() === normalizedName.toLowerCase(),
  );

  const ingredient =
    existingIngredient ??
    (await createIngredient({
      name: normalizedName,
      unit: payload.unit,
      costPerUnit: payload.costPerUnit,
      isPerishable: payload.isPerishable,
      supplierName: payload.supplierName,
    }));

  return apiPost<ApiInventoryItem>("/inventory", {
    ingredientId: ingredient.id,
    unit: payload.unit,
    locationId: payload.locationId,
    currentStock: payload.currentStock,
    reorderPoint: payload.reorderPoint,
    maxStock: payload.maxStock,
  });
}

// ── Stock movements ──────────────────────────────────────────────────────────

export type StockMovementType =
  | "PURCHASE_RECEIPT"
  | "MANUAL_ADJUSTMENT"
  | "CONSUMPTION"
  | "WASTE"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "OPENING_BALANCE"
  | "RECONCILIATION_CORRECTION";

export interface ApiStockMovement {
  id: string;
  inventoryItemId: string;
  movementType: StockMovementType;
  quantity: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string | null;
  referenceId: string | null;
  referenceType: string | null;
  createdAt: string;
  user?: { id: string; name: string } | null;
}

export interface ApiStockReconciliationLog {
  id: string;
  inventoryItemId: string;
  runAt: string;
  expectedStock: number;
  actualStock: number;
  drift: number;
  resolved: boolean;
  resolvedAt: string | null;
  notes: string | null;
  inventoryItem?: { ingredient?: { name: string } };
}

const REASON_TO_MOVEMENT_TYPE: Record<string, StockMovementType> = {
  "Purchase":               "PURCHASE_RECEIPT",
  "Transfer In":            "TRANSFER_IN",
  "Return from Kitchen":    "MANUAL_ADJUSTMENT",
  "Adjustment":             "MANUAL_ADJUSTMENT",
  "Cooking Use":            "CONSUMPTION",
  "Wastage":                "WASTE",
  "Spoilage":               "WASTE",
  "Transfer Out":           "TRANSFER_OUT",
};

export function adjustInventoryStock(
  id: string,
  adjustment: number,
  reason: string,
  movementType?: StockMovementType,
): Promise<ApiInventoryItem> {
  const resolvedType = movementType ?? REASON_TO_MOVEMENT_TYPE[reason] ?? "MANUAL_ADJUSTMENT";
  return apiPatch<ApiInventoryItem>(`/inventory/${id}/adjust`, {
    adjustment,
    reason,
    movementType: resolvedType,
  });
}

export function adjustStock(id: string, delta: number): Promise<ApiInventoryItem> {
  return adjustInventoryStock(id, delta, "manual adjustment");
}

export function getStockMovements(
  itemId: string,
  params?: { page?: number; pageSize?: number; from?: string; to?: string },
): Promise<ApiPage<ApiStockMovement>> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  return apiGet<ApiPage<ApiStockMovement>>(`/inventory/${itemId}/movements?${qs}`);
}

export function getReconciliationLogs(params?: {
  resolved?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<ApiPage<ApiStockReconciliationLog>> {
  const qs = new URLSearchParams();
  if (params?.resolved !== undefined) qs.set("resolved", String(params.resolved));
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  return apiGet<ApiPage<ApiStockReconciliationLog>>(`/inventory/reconciliation-logs?${qs}`);
}

export function triggerReconciliation(): Promise<{ started: boolean }> {
  return apiPost(`/inventory/reconcile`, {});
}

export function updateInventoryItem(
  id: string,
  payload: Partial<{ reorderPoint: number; maxStock: number; costPerUnit: number }>,
): Promise<ApiInventoryItem> {
  return apiPatch<ApiInventoryItem>(`/inventory/${id}`, payload);
}

// ── Locations CRUD ───────────────────────────────────────────────────────────

export interface CreateLocationPayload {
  name: string;
  slug?: string;
  type: ApiLocationType;
  address: string;
  city?: string;
  pincode: string;
  contactPerson?: string;
  contactPhone?: string;
  fssaiLicense?: string;
  dailyCapacity: number;
  openTime: string;
  closeTime: string;
}

export function createLocation(payload: CreateLocationPayload): Promise<ApiLocation> {
  return apiPost<ApiLocation>("/locations", {
    ...payload,
    slug: payload.slug?.trim() || slugify(payload.name),
  });
}

// ── System Settings ───────────────────────────────────────────────────────────

export function getSettings(): Promise<Record<string, string>> {
  return apiGet<Record<string, string>>("/settings");
}

export function patchSettings(data: Record<string, string>): Promise<void> {
  return apiPatch<void>("/settings", data);
}

export type CmsReadSource = "legacy" | "platform";
export type CmsPlatformCollection =
  | "pages"
  | "blog"
  | "faqs"
  | "testimonials"
  | "gallery"
  | "careers"
  | "clientLogos"
  | "services"
  | "eventTypes"
  | "cuisines"
  | "pricing";

export interface CmsPlatformCollectionRollout {
  collection: CmsPlatformCollection;
  forceLegacy: boolean;
  shadowRead: boolean;
  dualWrite: boolean;
  legacyProjectionWrite: boolean;
  readSource: CmsReadSource;
}

export interface CmsPlatformRolloutState {
  forceLegacy: boolean;
  collections: Record<CmsPlatformCollection, CmsPlatformCollectionRollout>;
}

export function getCmsPlatformRollout(): Promise<CmsPlatformRolloutState> {
  return apiGet<CmsPlatformRolloutState>("/cms-platform/rollout");
}

export function updateCmsPlatformRollout(
  payload: CmsPlatformRolloutState,
): Promise<CmsPlatformRolloutState> {
  return apiPatch<CmsPlatformRolloutState>("/cms-platform/rollout", payload);
}

export interface CmsPlatformCollectionSummary {
  collection: CmsPlatformCollection;
  legacyCount: number;
  platformCount: number;
  revisionCount: number;
  missingCount: number;
  staleCount: number;
  orphanCount: number;
  readyForPlatformRead: boolean;
}

export interface CmsPlatformSummary {
  pages: CmsPlatformCollectionSummary;
  blog: CmsPlatformCollectionSummary;
  faqs: CmsPlatformCollectionSummary;
  testimonials: CmsPlatformCollectionSummary;
  gallery: CmsPlatformCollectionSummary;
  careers: CmsPlatformCollectionSummary;
  clientLogos: CmsPlatformCollectionSummary;
  services: CmsPlatformCollectionSummary;
  eventTypes: CmsPlatformCollectionSummary;
  cuisines: CmsPlatformCollectionSummary;
  pricing: CmsPlatformCollectionSummary;
}

export interface CmsPlatformSyncResult {
  collection: CmsPlatformCollection;
  syncedCount: number;
  legacyCount: number;
}

export function getCmsPlatformSummary(): Promise<CmsPlatformSummary> {
  return apiGet<CmsPlatformSummary>("/cms-platform/summary");
}

export function syncCmsPlatformCollection(
  collection: CmsPlatformCollection,
): Promise<CmsPlatformSyncResult> {
  return apiPost<CmsPlatformSyncResult>(`/cms-platform/sync/${collection}`, {});
}

// ── Schedule ──────────────────────────────────────────────────────────────────

export interface ScheduledItem {
  id: string;
  name: string;
  category: string;
  isJain: boolean;
  isVegan: boolean;
}

export function saveScheduleDay(
  date: string,
  locationId: string,
  items: Record<string, ScheduledItem[]>,
): Promise<void> {
  return apiPost<void>("/menu/schedule", { date, locationId, items });
}

export function loadScheduleDay(
  date: string,
  locationId: string,
): Promise<Record<string, ScheduledItem[]>> {
  return apiGet<Record<string, ScheduledItem[]>>(
    `/menu/schedule?date=${date}&locationId=${locationId}`,
  );
}

export function loadScheduleDayStatus(
  date: string,
  locationId: string,
): Promise<{ published: boolean }> {
  return apiGet<{ published: boolean }>(
    `/menu/schedule/status?date=${date}&locationId=${locationId}`,
  );
}

export function publishScheduleDay(date: string, locationId: string): Promise<void> {
  return apiPost<void>("/menu/schedule/publish", { date, locationId });
}

// ── Delete helpers ──────────────────────────────────────────────────────────

export function deleteEmployee(id: string): Promise<void> {
  return apiDelete(`/employees/${id}`);
}
export function deleteInventoryItem(id: string): Promise<void> {
  return apiDelete(`/inventory/${id}`);
}
export function deleteCorporateAccount(id: string): Promise<void> {
  return apiDelete(`/corporate/${id}`);
}
export function deleteCustomer(id: string): Promise<void> {
  return apiDelete(`/customers/${id}`);
}
export function deleteLocation(id: string): Promise<void> {
  return apiDelete(`/locations/${id}`);
}
export function deleteFeedback(id: string): Promise<void> {
  return apiDelete(`/feedback/${id}`);
}
export function deleteOrder(id: string): Promise<void> {
  return apiDelete(`/orders/${id}`);
}

// ── Content Pages ───────────────────────────────────────────────────────────

export interface ApiContentPage {
  id: string;
  slug: string;
  titleEn: string;
  titleHi?: string | null;
  titleMr?: string | null;
  contentEn: string;
  contentHi?: string | null;
  contentMr?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  isPublished: boolean;
  status?: CmsWorkflowStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentPagePayload {
  slug: string;
  titleEn: string;
  titleHi?: string | null;
  titleMr?: string | null;
  contentEn: string;
  contentHi?: string | null;
  contentMr?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  isPublished?: boolean;
  publishedAt?: string | null;
}

export function getContentPages(): Promise<ApiContentPage[]> {
  return apiGet<ApiContentPage[]>("/cms-platform/admin/pages");
}

export function createContentPage(data: ContentPagePayload): Promise<ApiContentPage> {
  return apiPost<ApiContentPage>("/cms-platform/admin/pages", data);
}

export function updateContentPage(
  id: string,
  data: Partial<ContentPagePayload>,
): Promise<ApiContentPage> {
  return apiPatch<ApiContentPage>(`/cms-platform/admin/pages/${id}`, data);
}

export function deleteContentPage(id: string): Promise<void> {
  return apiDelete(`/cms-platform/admin/pages/${id}`);
}

export type CmsFoundationCollection =
  | "pages"
  | "blog"
  | "gallery"
  | "faqs"
  | "testimonials"
  | "careers"
  | "clientLogos"
  | "services"
  | "eventTypes"
  | "cuisines"
  | "pricing";

export type CmsWorkflowStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "SCHEDULED"
  | "PUBLISHED"
  | "ARCHIVED";

export interface CmsSchemaField {
  name: string;
  type: string;
  required?: boolean;
  localized?: boolean;
  taxonomyKey?: string;
}

export interface CmsCollectionSchema {
  collection: CmsFoundationCollection;
  title: string;
  localized: boolean;
  supportsWorkflow: boolean;
  fields: CmsSchemaField[];
}

export interface CmsTaxonomyTerm {
  id: string;
  taxonomyId: string;
  slug: string;
  label: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CmsTaxonomy {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  terms: CmsTaxonomyTerm[];
}

export interface CmsAssetUsage {
  id: string;
  field: string;
  entry: {
    id: string;
    collection: string;
    slug: string;
  };
}

export interface CmsAsset {
  id: string;
  storageKey?: string | null;
  publicUrl: string;
  filename?: string | null;
  title?: string | null;
  altText?: string | null;
  mimeType?: string | null;
  size?: number | null;
  source: "UPLOAD" | "EXTERNAL";
  usages: CmsAssetUsage[];
  createdAt: string;
  updatedAt: string;
}

export interface CmsRevision {
  id: string;
  entryId: string;
  revisionNumber: number;
  status: CmsWorkflowStatus;
  publishedAt?: string | null;
  snapshot: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface CmsReviewEvent {
  id: string;
  entryId: string;
  collection: string;
  fromStatus?: CmsWorkflowStatus | null;
  toStatus: CmsWorkflowStatus;
  note?: string | null;
  actorUserId: string;
  actorName?: string | null;
  createdAt: string;
  actorUser?: {
    id: string;
    name?: string | null;
    email: string;
    role: string;
  };
}

export interface CmsPreviewRouteCandidate {
  id: string;
  label: string;
  routePath: string;
}

export interface CmsPreviewLink {
  id: string;
  routeKey: string;
  routePath: string;
  locale: string;
  targetCollection?: string | null;
  targetEntryId?: string | null;
  expiresAt: string;
  revokedAt?: string | null;
  createdAt: string;
  isActive: boolean;
  token?: string;
  createdByUser?: {
    id: string;
    name?: string | null;
    email: string;
    role: string;
  };
}

export function getCmsCollectionSchemas(): Promise<CmsCollectionSchema[]> {
  return apiGet<CmsCollectionSchema[]>("/cms-platform/schema");
}

export function getCmsCollectionSchema(
  collection: CmsFoundationCollection,
): Promise<CmsCollectionSchema> {
  return apiGet<CmsCollectionSchema>(`/cms-platform/schema/${collection}`);
}

export function getCmsTaxonomies(): Promise<CmsTaxonomy[]> {
  return apiGet<CmsTaxonomy[]>("/cms-platform/taxonomies");
}

export function getCmsTaxonomyTerms(taxonomyKey: string): Promise<CmsTaxonomyTerm[]> {
  return apiGet<CmsTaxonomyTerm[]>(`/cms-platform/taxonomies/${taxonomyKey}/terms`);
}

export function createCmsTaxonomyTerm(
  taxonomyKey: string,
  body: {
    slug?: string;
    label?: string;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  },
): Promise<CmsTaxonomyTerm> {
  return apiPost<CmsTaxonomyTerm>(`/cms-platform/taxonomies/${taxonomyKey}/terms`, body);
}

export function updateCmsTaxonomyTerm(
  termId: string,
  body: {
    slug?: string;
    label?: string;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  },
): Promise<CmsTaxonomyTerm> {
  return apiPatch<CmsTaxonomyTerm>(`/cms-platform/taxonomy-terms/${termId}`, body);
}

export function getCmsAssets(options?: {
  limit?: number;
  q?: string;
  source?: "UPLOAD" | "EXTERNAL";
}): Promise<CmsAsset[]> {
  const qs = new URLSearchParams();
  qs.set("limit", String(options?.limit ?? 200));
  if (options?.q?.trim()) qs.set("q", options.q.trim());
  if (options?.source) qs.set("source", options.source);
  return apiGet<CmsAsset[]>(`/cms-platform/assets?${qs.toString()}`);
}

export function createExternalCmsAsset(body: {
  publicUrl: string;
  title?: string | null;
  altText?: string | null;
}): Promise<CmsAsset> {
  return apiPost<CmsAsset>("/cms-platform/assets/external", body);
}

export function updateCmsAsset(
  id: string,
  body: {
    publicUrl?: string;
    title?: string | null;
    altText?: string | null;
  },
): Promise<CmsAsset> {
  return apiPatch<CmsAsset>(`/cms-platform/assets/${id}`, body);
}

export function uploadCmsAsset(body: {
  file: File;
  title?: string | null;
  altText?: string | null;
}): Promise<CmsAsset> {
  const formData = new FormData();
  formData.append("file", body.file);
  if (body.title) formData.append("title", body.title);
  if (body.altText) formData.append("altText", body.altText);
  return apiPostFormData<CmsAsset>("/cms-platform/assets/upload", formData);
}

export function getCmsEntryRevisions(
  collection: CmsFoundationCollection,
  id: string,
): Promise<CmsRevision[]> {
  return apiGet<CmsRevision[]>(`/cms-platform/entries/${collection}/${id}/revisions`);
}

export function getCmsEntryRevision(
  collection: CmsFoundationCollection,
  id: string,
  revisionId: string,
): Promise<CmsRevision> {
  return apiGet<CmsRevision>(`/cms-platform/entries/${collection}/${id}/revisions/${revisionId}`);
}

export function getCmsEntryReviewEvents(
  collection: CmsFoundationCollection,
  id: string,
): Promise<CmsReviewEvent[]> {
  return apiGet<CmsReviewEvent[]>(`/cms-platform/entries/${collection}/${id}/review-events`);
}

export function getCmsEntryPreviewRoutes(
  collection: CmsFoundationCollection,
  id: string,
  locale = "en",
): Promise<CmsPreviewRouteCandidate[]> {
  return apiGet<CmsPreviewRouteCandidate[]>(
    `/cms-platform/entries/${collection}/${id}/preview-routes?locale=${encodeURIComponent(locale)}`,
  );
}

export function getCmsEntryPreviewLinks(
  collection: CmsFoundationCollection,
  id: string,
): Promise<CmsPreviewLink[]> {
  return apiGet<CmsPreviewLink[]>(
    `/cms-platform/preview-links?collection=${encodeURIComponent(collection)}&id=${encodeURIComponent(id)}`,
  );
}

export function createCmsEntryPreviewLink(
  collection: CmsFoundationCollection,
  id: string,
  body?: {
    routePath?: string;
    locale?: string;
    expiresInHours?: number;
  },
): Promise<CmsPreviewLink> {
  return apiPost<CmsPreviewLink>(`/cms-platform/entries/${collection}/${id}/preview-links`, body ?? {});
}

export function revokeCmsPreviewLink(id: string): Promise<CmsPreviewLink> {
  return apiPost<CmsPreviewLink>(`/cms-platform/preview-links/${id}/revoke`, {});
}

export function restoreCmsEntryRevision(
  collection: CmsFoundationCollection,
  id: string,
  revisionId: string,
): Promise<unknown> {
  return apiPost(`/cms-platform/entries/${collection}/${id}/revisions/${revisionId}/restore`, {});
}

export function updateCmsEntryStatus(
  collection: CmsFoundationCollection,
  id: string,
  body: {
    status: CmsWorkflowStatus;
    publishedAt?: string | null;
    note?: string | null;
  },
): Promise<unknown> {
  return apiPost(`/cms-platform/entries/${collection}/${id}/status`, body);
}

export function initiateRefund(
  paymentId: string,
  amount?: number,
): Promise<{ refundId: string; status: string }> {
  return apiPost<{ refundId: string; status: string }>(`/payments/${paymentId}/refund`, {
    ...(amount !== undefined ? { amount } : {}),
  });
}
export function deleteMenuItem(id: string): Promise<void> {
  return apiDelete(`/menu/items/${id}`);
}

// ── Menu Item Pricing Slabs ─────────────────────────────────────────────────

export interface MenuItemPricingSlab {
  id: string;
  menuItemId: string;
  fromQty: number;
  toQty: number | null;
  price: number;
  sortOrder: number;
}

export function getMenuItemSlabs(itemId: string): Promise<MenuItemPricingSlab[]> {
  return apiGet<MenuItemPricingSlab[]>(`/menu/items/${itemId}/pricing-slabs`);
}

export function saveMenuItemSlabs(itemId: string, slabs: Array<{ fromQty: number; toQty?: number | null; price: number }>): Promise<MenuItemPricingSlab[]> {
  return apiPatch<MenuItemPricingSlab[]>(`/menu/items/${itemId}/pricing-slabs`, { slabs });
}

// ── Meal Packages (Thali Builder) ───────────────────────────────────────────

export interface MealPackageItem {
  id: string;
  menuItemId: string;
  quantity: number;
  sortOrder: number;
  menuItem: {
    id: string;
    name: string;
    price: number;
    categoryId: string;
    imageUrl: string | null;
    isJain: boolean;
    isVegan: boolean;
  };
}

export interface MealPackage {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  mealSlot: string | null;
  imageUrl: string | null;
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  items: MealPackageItem[];
  calculatedPrice: number;
}

export function getMealPackages(): Promise<MealPackage[]> {
  return apiGet<MealPackage[]>("/menu/packages");
}

export function getMealPackage(id: string): Promise<MealPackage> {
  return apiGet<MealPackage>(`/menu/packages/${id}`);
}

export function createMealPackage(data: {
  name: string;
  description?: string;
  mealSlot?: string;
  isPopular?: boolean;
  items: Array<{ menuItemId: string; quantity: number }>;
}): Promise<MealPackage> {
  return apiPost<MealPackage>("/menu/packages", data);
}

export function updateMealPackage(
  id: string,
  data: {
    name?: string;
    description?: string;
    mealSlot?: string;
    isPopular?: boolean;
    isActive?: boolean;
    items?: Array<{ menuItemId: string; quantity: number }>;
  },
): Promise<MealPackage> {
  return apiPatch<MealPackage>(`/menu/packages/${id}`, data);
}

export function deleteMealPackage(id: string): Promise<void> {
  return apiDelete(`/menu/packages/${id}`);
}

// ── Billing / Invoice Wizard ─────────────────────────────────────────

export interface MealSummary {
  corporateAccountId: string;
  month: string;
  companyName: string;
  totalMeals: number;
  totalCost: number;
  subsidyPerMeal: number;
  totalSubsidy: number;
  netPayable: number;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
  orderCount: number;
  employeeSummary: {
    customerId: string;
    name: string;
    meals: number;
    totalCost: number;
  }[];
}

export interface GeneratedInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  grandTotal: number;
  createdAt: string;
}

export async function getMealSummary(
  corporateAccountId: string,
  month: string // "YYYY-MM"
): Promise<MealSummary> {
  return apiGet<MealSummary>(
    `/billing/summary/${corporateAccountId}?month=${month}`
  );
}

export async function generateMonthlyInvoice(
  corporateAccountId: string,
  month: string // "YYYY-MM"
): Promise<GeneratedInvoice | null> {
  return apiPost<GeneratedInvoice | null>(
    `/billing/generate-invoice/${corporateAccountId}`,
    { month }
  );
}

export function getInvoicePdfUrl(invoiceId: string): string {
  return `/api/admin/invoices/${invoiceId}/pdf`;
}

export function getGstPeriod(month: string): Promise<ApiGstPeriodSummary> {
  const qs = new URLSearchParams({ month });
  return apiGet<ApiGstPeriodSummary>(`/gst/period?${qs}`);
}

export function generateGstFilingBatch(month: string): Promise<ApiGstFilingBatch> {
  return apiPost<ApiGstFilingBatch>("/gst/batches/generate", { month });
}

export function markGstFilingBatchFiled(id: string): Promise<ApiGstFilingBatch> {
  return apiPost<ApiGstFilingBatch>(`/gst/batches/${id}/filed`, {});
}

export function submitGstFilingBatch(id: string): Promise<ApiGstFilingBatch> {
  return apiPost<ApiGstFilingBatch>(`/gst/batches/${id}/submit`, {});
}

export function requestGstFilingOtp(id: string): Promise<ApiGstFilingBatch> {
  return apiPost<ApiGstFilingBatch>(`/gst/batches/${id}/request-otp`, {});
}

export function finalizeGstFilingBatch(
  id: string,
  payload?: { otp?: string; mode?: string },
): Promise<ApiGstFilingBatch> {
  return apiPost<ApiGstFilingBatch>(`/gst/batches/${id}/finalize`, payload ?? {});
}

export function syncGstFilingBatch(id: string): Promise<ApiGstFilingBatch> {
  return apiPost<ApiGstFilingBatch>(`/gst/batches/${id}/sync`, {});
}

export function getGstFilingBatchExportUrl(id: string): string {
  return `/api/admin/gst/batches/${id}/export.csv`;
}

export function getGstFilingBatchGstr1ExportUrl(id: string): string {
  return `/api/admin/gst/batches/${id}/export.gstr1.json`;
}

// ── Themes ──────────────────────────────────────────────────────────────────

export interface ApiTheme {
  id: string; name: string; slug: string; description: string | null;
  colorPrimary50: string; colorPrimary100: string; colorPrimary400: string;
  colorPrimary500: string; colorPrimary600: string;
  colorSecondary50: string; colorSecondary100: string;
  colorSecondary500: string; colorSecondary600: string;
  colorDarkPanelFrom: string; colorDarkPanelTo: string; colorFooterBg: string;
  colorSurface: string; colorSurfaceCard: string;
  colorTextPrimary: string; colorTextSecondary: string; colorTextMuted: string;
  fontDisplay: string; fontBody: string;
  borderRadiusSm: string; borderRadiusMd: string; borderRadiusLg: string; borderRadiusXl: string;
  isDefault: boolean; isPreset: boolean; sortOrder: number; createdAt: string;
}

export interface ApiExperiment {
  id: string; name: string; slug: string; description: string | null;
  controlThemeId: string; variantThemeId: string;
  controlTheme: { id: string; name: string };
  variantTheme: { id: string; name: string };
  trafficSplit: number; status: string;
  startDate: string | null; endDate: string | null;
  stoppedAt: string | null; createdAt: string;
  _count?: { assignments: number };
}

export const getThemes = () => apiGet<ApiTheme[]>("/themes");
export const createTheme = (data: Record<string, unknown>) => apiPost<ApiTheme>("/themes", data);
export const updateTheme = (id: string, data: Record<string, unknown>) => apiPatch<ApiTheme>(`/themes/${id}`, data);
export const deleteTheme = (id: string) => apiDelete(`/themes/${id}`);
export const activateTheme = (id: string) => apiPost<void>(`/themes/${id}/activate`, {});
export const getExperiments = () => apiGet<ApiExperiment[]>("/themes/experiments");
export const createExperiment = (data: Record<string, unknown>) => apiPost<ApiExperiment>("/themes/experiments", data);
export const updateExperiment = (id: string, data: Record<string, unknown>) => apiPatch<ApiExperiment>(`/themes/experiments/${id}`, data);
export const startExperiment = (id: string) => apiPost<ApiExperiment>(`/themes/experiments/${id}/start`, {});
export const stopExperiment = (id: string) => apiPost<ApiExperiment>(`/themes/experiments/${id}/stop`, {});
export const deleteExperiment = (id: string) => apiDelete(`/themes/experiments/${id}`);

// ── Sprint 2 — Demand Forecasting ────────────────────────────────────────────

export type MealSlot = "BREAKFAST" | "LUNCH" | "SNACKS" | "DINNER";

export interface ApiIngredientDemand {
  id: string;
  forecastId: string;
  ingredientId: string;
  quantityNeeded: number;
  unit: string;
  currentStock: number;
  gap: number;
  menuItemId: string | null;
  ingredient: { id: string; name: string; unit: string };
}

export interface ApiDemandForecast {
  id: string;
  locationId: string;
  date: string;
  mealSlot: MealSlot;
  expectedCovers: number;
  confidence: number;
  basisType: string;
  actualCovers: number | null;
  variancePercent: number | null;
  ingredientDemands: ApiIngredientDemand[];
}

export interface ApiProcurementSuggestion {
  id: string;
  ingredientId: string;
  locationId: string;
  quantityToOrder: number;
  unit: string;
  estimatedCost: number | null;
  neededByDate: string;
  status: "PENDING" | "APPROVED" | "CONVERTED_TO_PO" | "DISMISSED";
  reason: string;
  ingredient: { id: string; name: string; unit: string };
  suggestedSupplier: { id: string; name: string } | null;
}

export interface ApiPrepTask {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unit: string;
}

export interface ApiPrepSheet {
  locationId: string;
  date: string;
  slots: {
    mealSlot: MealSlot;
    expectedCovers: number;
    stations: { station: string; items: ApiPrepTask[] }[];
  }[];
}

export const generateForecast = (locationId: string, days = 3) =>
  apiPost<{ generated: number; forecasts: string[] }>("/forecasting/generate", { locationId, days });

export const getDemandForDate = (locationId: string, date: string) =>
  apiGet<ApiDemandForecast[]>(`/forecasting/demand?locationId=${encodeURIComponent(locationId)}&date=${encodeURIComponent(date)}`);

export const getProcurementGap = (locationId: string) =>
  apiGet<ApiProcurementSuggestion[]>(`/forecasting/procurement-gap?locationId=${encodeURIComponent(locationId)}`);

export const getPrepSheet = (locationId: string, date: string) =>
  apiGet<ApiPrepSheet>(`/forecasting/prep-sheet?locationId=${encodeURIComponent(locationId)}&date=${encodeURIComponent(date)}`);

export const recordActuals = (data: {
  locationId: string;
  date: string;
  mealSlot: MealSlot;
  actualCovers: number;
}) => apiPost<ApiDemandForecast>("/forecasting/actuals", data);

export const updateSuggestionStatus = (id: string, status: ApiProcurementSuggestion["status"]) =>
  apiPatch<ApiProcurementSuggestion>(`/forecasting/suggestions/${id}/status`, { status });

// ── Sprint 2 — Recipe/BOM ─────────────────────────────────────────────────────

export interface ApiRecipeIngredient {
  id: string;
  recipeId: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  ingredient: { id: string; name: string; unit: string };
}

export interface ApiRecipe {
  id: string;
  menuItemId: string;
  servings: number;
  instructions: string | null;
  ingredients: ApiRecipeIngredient[];
}

export const getMenuItemRecipe = (menuItemId: string) =>
  apiGet<ApiRecipe | null>(`/menu/${menuItemId}/recipe`);

export const saveMenuItemRecipe = (
  menuItemId: string,
  data: { servings: number; lines: { ingredientId: string; quantity: number; unit: string }[] },
) => apiPut<ApiRecipe>(`/menu/${menuItemId}/recipe`, data);

// ── Sprint 3 — Procurement ────────────────────────────────────────────────────

export type PurchaseOrderStatus =
  | "DRAFT"
  | "APPROVED"
  | "SENT"
  | "PARTIALLY_RECEIVED"
  | "FULLY_RECEIVED"
  | "CLOSED"
  | "CANCELLED";

export type GRNStatusType = "PENDING_QC" | "QC_PASSED" | "PARTIAL_ACCEPT" | "QC_FAILED";

export interface ApiPurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  ingredientId: string | null;
  ingredientName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  receivedQty: number;
}

export interface ApiPurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  locationId: string | null;
  status: PurchaseOrderStatus;
  totalAmount: number;
  expectedDate: string;
  receivedDate: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  sentAt: string | null;
  notes: string | null;
  createdAt: string;
  supplier: { id: string; name: string; phone?: string; email?: string };
  location: { id: string; name: string } | null;
  approvedBy: { id: string; name: string } | null;
  items: ApiPurchaseOrderItem[];
  goodsReceipts?: ApiGoodsReceipt[];
  _count?: { items: number; goodsReceipts: number };
}

export interface ApiGoodsReceiptItem {
  id: string;
  goodsReceiptId: string;
  purchaseOrderItemId: string;
  ingredientId: string;
  orderedQuantity: number;
  receivedQuantity: number;
  rejectedQuantity: number;
  rejectionReason: string | null;
  batchNumber: string | null;
  expiryDate: string | null;
  unitCost: number;
  totalCost: number;
  stockMovementId: string | null;
  ingredient?: { id: string; name: string };
}

export interface ApiGoodsReceipt {
  id: string;
  receiptNumber: string;
  purchaseOrderId: string;
  locationId: string;
  receivedById: string;
  receivedAt: string;
  deliveryNote: string | null;
  status: GRNStatusType;
  qualityNotes: string | null;
  createdAt: string;
  items: ApiGoodsReceiptItem[];
  receivedBy?: { id: string; name: string };
}

export interface ApiMatchReportLine {
  poItemId: string;
  ingredientId: string | null;
  ingredientName: string;
  orderedQuantity: number;
  unit: string;
  unitPrice: number;
  orderedValue: number;
  receivedQuantity: number;
  rejectedQuantity: number;
  acceptedQuantity: number;
  gapQuantity: number;
  fillRate: number;
  status: "COMPLETE" | "PARTIAL" | "NOT_RECEIVED";
}

export interface ApiMatchReport {
  po: { id: string; poNumber: string; supplier: { id: string; name: string }; status: PurchaseOrderStatus; expectedDate: string };
  lines: ApiMatchReportLine[];
  summary: { totalOrderedValue: number; totalAcceptedValue: number; overallFillRate: number; grnCount: number };
}

// Purchase Order functions
export const getPurchaseOrders = (params?: {
  status?: PurchaseOrderStatus;
  supplierId?: string;
  locationId?: string;
  page?: number;
  pageSize?: number;
}) => {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.supplierId) qs.set("supplierId", params.supplierId);
  if (params?.locationId) qs.set("locationId", params.locationId);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  return apiGet<ApiPage<ApiPurchaseOrder>>(`/procurement/purchase-orders?${qs}`);
};

export const getPurchaseOrder = (id: string) =>
  apiGet<ApiPurchaseOrder>(`/procurement/purchase-orders/${id}`);

export const createPurchaseOrder = (data: {
  supplierId: string;
  locationId?: string;
  expectedDate: string;
  notes?: string;
  items: { ingredientName: string; ingredientId?: string; quantity: number; unit: string; unitPrice: number }[];
}) => apiPost<ApiPurchaseOrder>("/procurement/purchase-orders", data);

export const createPOFromSuggestions = (data: {
  suggestionIds: string[];
  expectedDate: string;
}) => apiPost<ApiPurchaseOrder[]>("/procurement/purchase-orders/from-suggestions", data);

export const approvePurchaseOrder = (id: string) =>
  apiPatch<ApiPurchaseOrder>(`/procurement/purchase-orders/${id}/approve`, {});

export const cancelPurchaseOrder = (id: string) =>
  apiPatch<ApiPurchaseOrder>(`/procurement/purchase-orders/${id}/cancel`, {});

export const getMatchReport = (poId: string) =>
  apiGet<ApiMatchReport>(`/procurement/purchase-orders/${poId}/match-report`);

export const receiveGoods = (data: {
  purchaseOrderId: string;
  locationId: string;
  deliveryNote?: string;
  qualityNotes?: string;
  status?: GRNStatusType;
  items: {
    purchaseOrderItemId: string;
    ingredientId: string;
    orderedQuantity: number;
    receivedQuantity: number;
    rejectedQuantity?: number;
    rejectionReason?: string;
    batchNumber?: string;
    expiryDate?: string;
    unitCost: number;
  }[];
}) => apiPost<ApiGoodsReceipt>("/procurement/goods-receipts", data);

// ── Event Pipeline ──────────────────────────────────────────────────────────

export type EventStage =
  | "INQUIRY"
  | "SITE_VISIT_SCHEDULED"
  | "PROPOSAL_SENT"
  | "NEGOTIATING"
  | "CONFIRMED"
  | "COMPLETED"
  | "INVOICED"
  | "LOST";

export interface ApiEvent {
  id: string;
  name: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  eventType: string;
  eventDate: string;
  venueAddress: string;
  guestCount: number;
  menuType: string;
  perPlatePrice: number;
  estimatedTotal: number;
  negotiatedPrice?: number;
  advanceAmount?: number;
  advancePaidAt?: string;
  siteVisitDate?: string;
  proposalUrl?: string;
  lostReason?: string;
  stage: EventStage;
  status: string;
  notes?: string;
  reviewStatus: ReviewStatus;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface ApiPipelineSummary {
  byStage: Record<EventStage, ApiEvent[]>;
  totalPipelineValue: number;
  totalEvents: number;
}

export const getEventPipeline = () =>
  apiGet<ApiPipelineSummary>("/leads/events/pipeline");

export const getEvents = (params?: {
  stage?: EventStage;
  reviewStatus?: ReviewStatus;
  page?: number;
  pageSize?: number;
}) => {
  const qs = new URLSearchParams();
  if (params?.stage) qs.set("stage", params.stage);
  if (params?.reviewStatus) qs.set("reviewStatus", params.reviewStatus);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  return apiGet<ApiPage<ApiEvent>>(`/leads/events?${qs}`);
};

export const advanceEventStage = (
  id: string,
  data: {
    stage: EventStage;
    siteVisitDate?: string;
    proposalUrl?: string;
    negotiatedPrice?: number;
    advanceAmount?: number;
    advancePaidAt?: string;
    lostReason?: string;
    notes?: string;
  },
) => apiPatch<ApiEvent>(`/leads/events/${id}/stage`, data);

export const reviewEventRequest = (
  id: string,
  data: {
    reviewStatus: ReviewStatus;
    notes?: string;
  },
) => apiPatch<ApiEvent>(`/leads/events/${id}/review`, data);

export interface ApiEventProposal {
  event: {
    id: string;
    name: string;
    clientName: string;
    clientPhone: string;
    clientEmail?: string;
    eventType: string;
    eventDate: string;
    venueAddress: string;
    guestCount: number;
    menuType: string;
  };
  menuItems: { name: string; category: string; quantity?: number | null }[];
  pricing: {
    perPlatePrice: number;
    guestCount: number;
    subtotal: number;
    cgst: number;
    sgst: number;
    total: number;
    gstRate: number;
    hsnCode: string;
  };
  advance: {
    advancePercent: number;
    advanceAmount: number;
    balanceDue: number;
  };
  generatedAt: string;
}

export const generateEventProposal = (id: string) =>
  apiGet<ApiEventProposal>(`/leads/events/${id}/proposal`);

// ── Physical Count Sessions ─────────────────────────────────────────────────

export interface ApiCountLine {
  id: string;
  sessionId: string;
  inventoryItemId: string;
  systemStock: number;
  countedStock?: number;
  variance?: number;
  varianceReason?: string;
  resolved: boolean;
  stockMovementId?: string;
  inventoryItem?: {
    ingredient: { name: string; unit: string };
    currentStock: number;
  };
}

export interface ApiCountSession {
  id: string;
  locationId: string;
  conductedById: string;
  date: string;
  status: string;
  notes?: string;
  totalItemsCount: number;
  driftItemsCount: number;
  createdAt: string;
  location?: { id: string; name: string };
  lines?: ApiCountLine[];
}

export const listCountSessions = (locationId?: string) => {
  const qs = new URLSearchParams();
  if (locationId) qs.set("locationId", locationId);
  return apiGet<ApiCountSession[]>(`/inventory/count-sessions?${qs}`);
};

export const openCountSession = (locationId: string) =>
  apiPost<ApiCountSession>("/inventory/count-sessions", { locationId });

export const getCountSession = (id: string) =>
  apiGet<ApiCountSession>(`/inventory/count-sessions/${id}`);

export const submitCountSession = (
  id: string,
  lines: { inventoryItemId: string; countedStock: number; varianceReason?: string }[],
) => apiPatch<ApiCountSession>(`/inventory/count-sessions/${id}/submit`, { lines });

export const acceptCountVariances = (id: string, lineIds: string[]) =>
  apiPatch<ApiCountSession>(`/inventory/count-sessions/${id}/accept`, { lineIds });

// ── Supplier Scorecard ──────────────────────────────────────────────────────

export interface ApiSupplierScorecard {
  id: string;
  name: string;
  phone: string;
  email?: string;
  isActive: boolean;
  fillRate: number;
  rejectionRate: number;
  onTimeDeliveryRate: number;
  lastScoredAt?: string;
  fillRatePct: number;
  rejectionRatePct: number;
  onTimeDeliveryRatePct: number;
  overallScore: number;
}

export const getAllScorecards = () =>
  apiGet<ApiSupplierScorecard[]>("/inventory/suppliers/scorecards");

export const getSupplierScorecard = (id: string) =>
  apiGet<ApiSupplierScorecard>(`/inventory/suppliers/${id}/scorecard`);

export const computeSupplierScorecard = (id: string) =>
  apiPost<ApiSupplierScorecard>(`/inventory/suppliers/${id}/scorecard/compute`, {});

// ── Waste Report ────────────────────────────────────────────────────────────

export interface ApiWasteLog {
  id: string;
  locationId: string;
  itemName: string;
  quantity: number;
  unit: string;
  reason: string;
  costImpact: number;
  date: string;
  ingredientId?: string;
  stockMovementId?: string;
  ingredient?: { name: string; unit: string };
}

export const getWasteLogs = (params?: {
  locationId?: string;
  reason?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) => {
  const qs = new URLSearchParams({ pageSize: "200" });
  if (params?.locationId) qs.set("locationId", params.locationId);
  if (params?.reason) qs.set("reason", params.reason);
  if (params?.dateFrom) qs.set("dateFrom", params.dateFrom);
  if (params?.dateTo) qs.set("dateTo", params.dateTo);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  return apiGet<ApiPage<ApiWasteLog>>(`/quality/waste-logs?${qs}`);
};

export const createWasteLog = (data: {
  locationId: string;
  itemName: string;
  quantity: number;
  unit: string;
  reason: string;
  costImpact: number;
  date: string;
  ingredientId?: string;
}) => apiPost<ApiWasteLog>("/quality/waste-logs", data);
