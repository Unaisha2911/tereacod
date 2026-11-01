import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * formatAED — single money formatter for the storefront.
 * Renders whole dirhams without decimals ("AED 149") and keeps
 * fractions ("AED 12.50") when a price carries them.
 */
export function formatAED(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return `AED ${rounded.toLocaleString("en-AE", {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
