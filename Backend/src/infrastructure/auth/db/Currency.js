import { mongoose } from '../connection.js';


export const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY || 'ZAR';


export const SUPPORTED_CURRENCIES = [DEFAULT_CURRENCY];


export const MONEY_DECIMAL_PLACES = 2;

/**
 * Converts a Mongoose Decimal128 (or numeric/string) value to a JS number
 * for comparison/arithmetic in application code. Decimal128 preserves exact
 * storage in MongoDB, but Node has no native arbitrary-precision decimal.
 **/

export function decimal128ToNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  return parseFloat(value.toString());
}

/**
 * Mongoose custom validator: rejects non-positive or non-finite monetary
 * amounts. Used on any Decimal128 field that represents a charge, price, or
 * payout - zero/negative amounts are a modelling error, not a valid state,
 * for every schema in this project.
 */
export function isPositiveDecimal(value) {
  const num = decimal128ToNumber(value);
  return typeof num === 'number' && Number.isFinite(num) && num > 0;
}

export function toDecimal128(value) {
  return mongoose.Types.Decimal128.fromString(Number(value).toFixed(MONEY_DECIMAL_PLACES));
}