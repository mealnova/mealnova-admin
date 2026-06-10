export interface MenuItem {
    id: string;
    name: string;
    nameHi: string;
    nameMr: string;
    description?: string;
    category: MenuCategory;
    subCategory?: string;
    price: number;
    gstRate: 5 | 12 | 18;
    isAvailable: boolean;
    isVegan: boolean;
    isJain: boolean;
    isSwaminarayan: boolean;
    spiceLevel: 1 | 2 | 3;
    allergens: Allergen[];
    nutritionPer100g?: NutritionInfo;
    imageUrl?: string;
    preparationTime: number;
}
export type MenuCategory = "thali" | "sabzi" | "roti" | "rice" | "dal" | "sweet" | "snack" | "beverage" | "raita" | "papad" | "pickle";
export type Allergen = "milk" | "nuts" | "peanuts" | "wheat" | "soy" | "sesame" | "celery" | "sulphites";
export interface NutritionInfo {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sodium?: number;
    sugar?: number;
}
export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "dispatched" | "delivered" | "cancelled";
export type OrderType = "daily_meal" | "event" | "subscription" | "one_time";
export interface Order {
    id: string;
    customerId: string;
    locationId: string;
    type: OrderType;
    status: OrderStatus;
    items: OrderItem[];
    subtotal: number;
    gstAmount: number;
    total: number;
    paymentStatus: PaymentStatus;
    deliveryDate: string;
    deliverySlot: "breakfast" | "lunch" | "snacks" | "dinner";
    specialInstructions?: string;
    createdAt: string;
    updatedAt: string;
}
export interface OrderItem {
    menuItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    gstRate: number;
    total: number;
}
export type PaymentStatus = "pending" | "paid" | "partial" | "refunded" | "failed";
export type PaymentMethod = "upi" | "card" | "netbanking" | "wallet" | "sodexo" | "meal_card" | "cash";
export interface Payment {
    id: string;
    orderId: string;
    amount: number;
    method: PaymentMethod;
    status: PaymentStatus;
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
    createdAt: string;
}
export interface Location {
    id: string;
    name: string;
    nameHi: string;
    nameMr: string;
    type: "corporate_cafeteria" | "hostel" | "event_venue" | "cloud_kitchen";
    address: string;
    city: string;
    pincode: string;
    latitude: number;
    longitude: number;
    contactPerson: string;
    contactPhone: string;
    isActive: boolean;
    dailyCapacity: number;
    operatingHours: {
        open: string;
        close: string;
    };
}
export interface Customer {
    id: string;
    name: string;
    phone: string;
    email?: string;
    corporateId?: string;
    mealCardId?: string;
    preferredLocation?: string;
    dietaryPreferences: string[];
    allergens: Allergen[];
}
export interface Invoice {
    id: string;
    invoiceNumber: string;
    customerId: string;
    corporateId?: string;
    type: "tax_invoice" | "credit_note" | "debit_note";
    items: InvoiceItem[];
    subtotal: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
    total: number;
    hsnCode: string;
    placeOfSupply: string;
    irn?: string;
    qrCode?: string;
    status: "draft" | "issued" | "paid" | "overdue" | "cancelled";
    dueDate: string;
    createdAt: string;
}
export interface InvoiceItem {
    description: string;
    hsnCode: string;
    quantity: number;
    unitPrice: number;
    taxableValue: number;
    gstRate: 5 | 12 | 18;
    cgst: number;
    sgst: number;
    total: number;
}
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}
export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
