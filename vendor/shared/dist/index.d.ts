export declare function calculateGST(amount: number, gstRate: 5 | 12 | 18, isInterState?: boolean): {
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
};
export declare function getCateringGSTRate(type: "daily_meal" | "event"): 5 | 18;
export declare function generateInvoiceNumber(prefix: string, financialYear: string, sequence: number): string;
export declare function getFinancialYear(date?: Date): string;
export declare function formatINR(amount: number): string;
export declare function formatDateIST(date: Date | string): string;
export declare function isWeekday(date: Date): boolean;
export type MealSlot = "breakfast" | "lunch" | "snacks" | "dinner";
export declare function getMealSlotTime(slot: MealSlot): {
    start: string;
    end: string;
};
export declare function isValidIndianPhone(phone: string): boolean;
export declare function isValidGSTIN(gstin: string): boolean;
export declare function isValidFSSAI(license: string): boolean;
export * from "./blog-categories";
export * from "./cms-preview-routes";
export * from "./site-page-content";
