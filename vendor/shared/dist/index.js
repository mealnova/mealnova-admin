"use strict";
// ============================================
// Mealnova - Shared Utilities
// ============================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateGST = calculateGST;
exports.getCateringGSTRate = getCateringGSTRate;
exports.generateInvoiceNumber = generateInvoiceNumber;
exports.getFinancialYear = getFinancialYear;
exports.formatINR = formatINR;
exports.formatDateIST = formatDateIST;
exports.isWeekday = isWeekday;
exports.getMealSlotTime = getMealSlotTime;
exports.isValidIndianPhone = isValidIndianPhone;
exports.isValidGSTIN = isValidGSTIN;
exports.isValidFSSAI = isValidFSSAI;
// --- GST Calculations ---
function calculateGST(amount, gstRate, isInterState = false) {
    const taxAmount = (amount * gstRate) / 100;
    if (isInterState) {
        return { cgst: 0, sgst: 0, igst: taxAmount, total: taxAmount };
    }
    const halfTax = taxAmount / 2;
    return {
        cgst: Math.round(halfTax * 100) / 100,
        sgst: Math.round(halfTax * 100) / 100,
        igst: 0,
        total: Math.round(taxAmount * 100) / 100,
    };
}
// Daily meals: 5% GST, Event/outdoor catering: 18% GST
function getCateringGSTRate(type) {
    return type === "daily_meal" ? 5 : 18;
}
// --- Invoice Number Generator ---
function generateInvoiceNumber(prefix, financialYear, sequence) {
    return `${prefix}/${financialYear}/${String(sequence).padStart(4, "0")}`;
}
// Get Indian financial year string (e.g., "2025-26")
function getFinancialYear(date = new Date()) {
    const month = date.getMonth();
    const year = date.getFullYear();
    if (month >= 3) {
        return `${year}-${String(year + 1).slice(-2)}`;
    }
    return `${year - 1}-${String(year).slice(-2)}`;
}
// --- Price Formatting ---
function formatINR(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
}
// --- Date Helpers ---
function formatDateIST(date) {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}
function isWeekday(date) {
    const day = date.getDay();
    return day !== 0 && day !== 6;
}
function getMealSlotTime(slot) {
    const slots = {
        breakfast: { start: "08:00", end: "10:00" },
        lunch: { start: "12:00", end: "14:00" },
        snacks: { start: "16:00", end: "17:00" },
        dinner: { start: "19:00", end: "21:00" },
    };
    return slots[slot];
}
// --- Validation ---
function isValidIndianPhone(phone) {
    return /^(\+91)?[6-9]\d{9}$/.test(phone.replace(/\s/g, ""));
}
function isValidGSTIN(gstin) {
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin);
}
function isValidFSSAI(license) {
    return /^\d{14}$/.test(license);
}
__exportStar(require("./blog-categories"), exports);
__exportStar(require("./cms-preview-routes"), exports);
__exportStar(require("./site-page-content"), exports);
