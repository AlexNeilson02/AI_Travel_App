
import currency from 'currency.js';

export interface ExchangeRate {
  code: string;
  rate: number;
}

export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string, rates: Record<string, number>): number {
  if (fromCurrency === toCurrency) return amount;
  
  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];
  
  if (!fromRate || !toRate) {
    throw new Error(`Exchange rate not found for ${fromCurrency} or ${toCurrency}`);
  }

  // Convert to USD first (base currency), then to target currency
  const usdAmount = currency(amount).divide(fromRate).value;
  return currency(usdAmount).multiply(toRate).value;
}

export function formatCurrency(amount: number, currencyCode: string): string {
  return currency(amount, { symbol: getCurrencySymbol(currencyCode), precision: 2 }).format();
}

function getCurrencySymbol(code: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    // Add more as needed
  };
  return symbols[code] || code;
}
