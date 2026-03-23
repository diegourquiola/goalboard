/**
 * Returns true if the string is a valid YYYY-MM-DD date.
 */
export function isValidDate(dateStr) {
  if (!dateStr) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const d = new Date(dateStr);
  return d instanceof Date && !isNaN(d);
}

/**
 * Returns true if date_from <= date_to (both YYYY-MM-DD strings).
 */
export function isDateRangeValid(dateFrom, dateTo) {
  if (!isValidDate(dateFrom) || !isValidDate(dateTo)) return false;
  return dateFrom <= dateTo;
}

/**
 * Returns true if matchday is an integer between 1 and 38 inclusive.
 */
export function isValidMatchday(matchday) {
  const n = Number(matchday);
  return Number.isInteger(n) && n >= 1 && n <= 38;
}
