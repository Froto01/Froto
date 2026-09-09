export type BillingEvent = {
  action: "INVOICED" | "PAID";
  reference: string;
  date: string;
  amount: string;
  actorUserId: string;
  recordedAt: string;
};

export function billingEvent(input: {
  action: string;
  status: string;
  reference: string;
  date: string;
  amount: string;
  feeIncGst: string;
  earliestDate: string;
  actorUserId: string;
  confirmed: boolean;
}, now = new Date()): BillingEvent {
  if (input.action !== "INVOICED" && input.action !== "PAID") throw new Error("Choose an invoice or payment action.");
  if (input.status !== (input.action === "INVOICED" ? "EARNED" : "INVOICED")) {
    throw new Error("This fee has changed or is not ready for that action. Refresh the page.");
  }
  const reference = input.reference.trim();
  if (!reference || reference.length > 120) throw new Error("Enter a reference of 1–120 characters.");
  const date = new Date(`${input.date}T00:00:00.000Z`);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Brisbane" }).format(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input.date || input.date > today || input.date < input.earliestDate) {
    throw new Error("Enter a valid date between the previous billing stage and today.");
  }
  const cents = (value: string) => {
    if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error("Enter an amount with no more than two decimal places.");
    const [dollars, fraction = ""] = value.split(".");
    return BigInt(dollars) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  };
  if (cents(input.amount) !== cents(input.feeIncGst)) throw new Error("The amount must match the full fee including GST. Partial payments are not supported here.");
  if (!input.confirmed) throw new Error("Confirm the invoice was issued or the payment was received.");
  return { action: input.action, reference, date: input.date, amount: input.feeIncGst, actorUserId: input.actorUserId, recordedAt: now.toISOString() };
}
