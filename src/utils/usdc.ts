/**
 * USDC utilities for amount conversion
 * USDC has 6 decimals
 */

const USDC_DECIMALS = 6;

/**
 * Convert human-readable USDC amount to raw amount (smallest unit)
 * Example: "100.50" -> 100500000n
 */
export function parseUSDC(amount: string): bigint {
  try {
    // Remove any whitespace
    const cleaned = amount.trim();

    // Validate format
    if (!/^\d+(\.\d+)?$/.test(cleaned)) {
      throw new Error('Invalid USDC amount format');
    }

    // Split into integer and decimal parts
    const [integerPart, decimalPart = ''] = cleaned.split('.');

    // Validate decimal places
    if (decimalPart.length > USDC_DECIMALS) {
      throw new Error(`USDC supports maximum ${USDC_DECIMALS} decimal places`);
    }

    // Pad decimal part to 6 digits
    const paddedDecimal = decimalPart.padEnd(USDC_DECIMALS, '0');

    // Combine integer and decimal parts
    const rawAmount = integerPart + paddedDecimal;

    return BigInt(rawAmount);
  } catch (error) {
    throw new Error(
      `Failed to parse USDC amount: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Convert raw USDC amount to human-readable format
 * Example: 100500000n -> "100.50"
 */
export function formatUSDC(rawAmount: bigint | string | number, maxDecimals = 6): string {
  try {
    const amount = BigInt(rawAmount);

    // Convert to string and pad with leading zeros if necessary
    const amountStr = amount.toString().padStart(USDC_DECIMALS + 1, '0');

    // Split into integer and decimal parts
    const integerPart = amountStr.slice(0, -USDC_DECIMALS) || '0';
    const decimalPart = amountStr.slice(-USDC_DECIMALS);

    // Trim trailing zeros from decimal part
    const trimmedDecimal = decimalPart.replace(/0+$/, '');

    // Apply max decimals limit
    const limitedDecimal = trimmedDecimal.slice(0, maxDecimals);

    // Return formatted string
    return limitedDecimal ? `${integerPart}.${limitedDecimal}` : integerPart;
  } catch (error) {
    throw new Error(
      `Failed to format USDC amount: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Validate USDC amount string
 */
export function isValidUSDCAmount(amount: string): boolean {
  try {
    if (!amount || amount.trim() === '') return false;

    const cleaned = amount.trim();

    // Check format
    if (!/^\d+(\.\d+)?$/.test(cleaned)) return false;

    // Check decimal places
    const [, decimalPart = ''] = cleaned.split('.');
    if (decimalPart.length > USDC_DECIMALS) return false;

    // Check if amount is positive
    const value = parseFloat(cleaned);
    if (value <= 0) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Format USDC amount for display with thousand separators
 * Example: "1000000.50" -> "1,000,000.50"
 */
export function formatUSDCDisplay(amount: string | bigint, maxDecimals = 2): string {
  try {
    const formatted =
      typeof amount === 'bigint' ? formatUSDC(amount, maxDecimals) : amount;

    const [integerPart, decimalPart] = formatted.split('.');

    // Add thousand separators
    const withSeparators = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    return decimalPart ? `${withSeparators}.${decimalPart}` : withSeparators;
  } catch {
    return '0';
  }
}
