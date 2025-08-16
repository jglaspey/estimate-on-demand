/**
 * Number precision utilities for financial and measurement calculations
 *
 * Handles JavaScript floating point precision issues in business calculations
 */

/**
 * Round a number to specified decimal places, eliminating floating point errors
 * @param value - Number to round
 * @param decimals - Number of decimal places (default: 2)
 * @returns Precisely rounded number
 */
export function roundToPrecision(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Safely subtract two numbers with proper precision handling
 * @param a - Minuend
 * @param b - Subtrahend
 * @param decimals - Decimal places for result (default: 2)
 * @returns Precisely calculated difference
 */
export function safeSubtract(
  a: number,
  b: number,
  decimals: number = 2
): number {
  return roundToPrecision(a - b, decimals);
}

/**
 * Safely add two numbers with proper precision handling
 * @param a - First addend
 * @param b - Second addend
 * @param decimals - Decimal places for result (default: 2)
 * @returns Precisely calculated sum
 */
export function safeAdd(a: number, b: number, decimals: number = 2): number {
  return roundToPrecision(a + b, decimals);
}

/**
 * Safely multiply two numbers with proper precision handling
 * @param a - Multiplicand
 * @param b - Multiplier
 * @param decimals - Decimal places for result (default: 2)
 * @returns Precisely calculated product
 */
export function safeMultiply(
  a: number,
  b: number,
  decimals: number = 2
): number {
  return roundToPrecision(a * b, decimals);
}

/**
 * Format a number for display with consistent decimal places
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @param removeTrailingZeros - Whether to remove trailing zeros (default: true)
 * @returns Formatted number string
 */
export function formatNumber(
  value: number,
  decimals: number = 2,
  removeTrailingZeros: boolean = true
): string {
  const formatted = value.toFixed(decimals);
  return removeTrailingZeros ? parseFloat(formatted).toString() : formatted;
}

/**
 * Format a measurement value (e.g., "13.68 LF" instead of "13.680000000000007 LF")
 * @param value - Numeric value
 * @param unit - Unit of measurement
 * @param decimals - Decimal places (default: 2)
 * @returns Formatted measurement string
 */
export function formatMeasurement(
  value: number,
  unit: string,
  decimals: number = 2
): string {
  return `${formatNumber(value, decimals)} ${unit}`;
}

/**
 * Format a currency value with proper precision
 * @param value - Dollar amount
 * @param decimals - Decimal places (default: 2)
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  return `$${formatNumber(value, decimals)}`;
}
