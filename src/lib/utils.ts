import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number or string value into German currency standard (e.g. 2.360,07 €)
 */
export function formatCurrency(value: number | string): string {
  const num = typeof value === "number" ? value : parseFloat(String(value)) || 0;
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formats a number into German number standard without currency symbol (e.g. 2.360,07)
 */
export function formatNumberDE(value: number | string): string {
  const num = typeof value === "number" ? value : parseFloat(String(value)) || 0;
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Parses a string in DD.MM.YYYY format into a valid Date object. Returns null if invalid.
 */
export function parseDDMMYYYY(dateStr: string): Date | null {
  if (!dateStr) return null;
  const clean = dateStr.trim();
  const parts = clean.split(".");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed month
    const year = parseInt(parts[2], 10);

    if (
      !isNaN(day) && !isNaN(month) && !isNaN(year) &&
      year >= 1900 && year <= 2100 &&
      month >= 0 && month <= 11 &&
      day >= 1 && day <= 31
    ) {
      const parsed = new Date(year, month, day);
      if (
        parsed.getFullYear() === year &&
        parsed.getMonth() === month &&
        parsed.getDate() === day
      ) {
        return parsed;
      }
    }
  }
  return null;
}

/**
 * Formats a Date or ISO string to DD.MM.YYYY
 */
export function formatDateDDMMYYYY(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return "";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}
