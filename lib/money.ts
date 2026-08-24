export function decimalToMinorUnits(value: { toString(): string } | string | number): bigint {
  const raw = typeof value === "string" ? value : value.toString();
  const match = raw.trim().match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/);

  if (!match) {
    throw new Error(`Invalid monetary value: ${raw}`);
  }

  const [, sign, whole, fraction = ""] = match;
  const cents = `${fraction}00`.slice(0, 2);
  const minor = BigInt(whole) * BigInt(100) + BigInt(cents);

  return sign === "-" ? -minor : minor;
}
