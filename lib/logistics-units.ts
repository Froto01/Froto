export const LOGISTICS_UNITS = [
  { value: "pallets", label: "Pallets" },
  { value: "parcels", label: "Parcels" },
  { value: "slots", label: "Slots" },
  { value: "tonnes", label: "Tonnes" },
  { value: "sqm", label: "Square metres (m²)" },
  { value: "cbm", label: "Cubic metres (m³)" },
] as const;

export type LogisticsUnit = typeof LOGISTICS_UNITS[number]["value"];

export function isLogisticsUnit(value: unknown): value is LogisticsUnit {
  return LOGISTICS_UNITS.some(unit => unit.value === value);
}
