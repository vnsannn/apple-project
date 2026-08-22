function normalizePhone(raw) {
  if (!raw) return { valid: true, value: null };

  let digits = raw.replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("63")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!/^9\d{9}$/.test(digits)) return { valid: false, value: null };

  return {
    valid: true,
    value: `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`,
  };
}
module.exports = normalizePhone;
