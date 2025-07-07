/**
 * South African VAT Calculation Utilities
 * Handles VAT calculations for orders, invoices, and displays
 */

export interface VATCalculationInput {
  subtotal: number;
  shippingCost: number;
  vatRate: number; // Percentage (e.g., 15 for 15%)
}

export interface VATCalculationResult {
  subtotal: number;
  shippingCost: number;
  vatableAmount: number; // Amount subject to VAT (subtotal + shipping)
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
}

/**
 * Calculate VAT for an order
 * In South Africa, VAT is applied to both products and shipping
 */
export function calculateVAT(input: VATCalculationInput): VATCalculationResult {
  const { subtotal, shippingCost, vatRate } = input;
  
  // VATable amount = subtotal + shipping (both subject to VAT in SA)
  const vatableAmount = subtotal + shippingCost;
  
  // Calculate VAT amount
  const vatAmount = (vatableAmount * vatRate) / 100;
  
  // Total = subtotal + shipping + VAT
  const totalAmount = vatableAmount + vatAmount;
  
  return {
    subtotal,
    shippingCost,
    vatableAmount,
    vatRate,
    vatAmount: Math.round(vatAmount * 100) / 100, // Round to 2 decimal places
    totalAmount: Math.round(totalAmount * 100) / 100, // Round to 2 decimal places
  };
}

/**
 * Format VAT amount for display in South African Rand
 */
export function formatVATAmount(amount: number): string {
  return `R${amount.toFixed(2)}`;
}

/**
 * Format VAT rate for display
 */
export function formatVATRate(rate: number): string {
  return `${rate.toFixed(rate % 1 === 0 ? 0 : 2)}%`;
}

/**
 * Check if VAT should be displayed (even if 0%)
 */
export function shouldDisplayVAT(): boolean {
  // Always display VAT information for transparency
  return true;
}

/**
 * Generate VAT line item text for display
 */
export function getVATLineText(vatRate: number, vatAmount: number): string {
  if (vatRate === 0) {
    return `VAT (0%): ${formatVATAmount(vatAmount)}`;
  }
  return `VAT (${formatVATRate(vatRate)}): ${formatVATAmount(vatAmount)}`;
}

/**
 * Validate VAT registration number format (basic South African format)
 */
export function isValidVATNumber(vatNumber: string): boolean {
  if (!vatNumber || vatNumber.trim() === '') {
    return true; // Empty is valid (not registered)
  }
  
  // South African VAT numbers are typically 10 digits
  const cleaned = vatNumber.replace(/\D/g, '');
  return cleaned.length === 10;
}

/**
 * Get VAT registration display text
 */
export function getVATRegistrationDisplay(
  vatRegistered: boolean, 
  vatRegistrationNumber: string
): string {
  if (!vatRegistered || !vatRegistrationNumber) {
    return "Not VAT registered";
  }
  return `VAT Registration: ${vatRegistrationNumber}`;
}