type OpportunityEmailInput = {
  to: string;
  recipientName?: string | null;
  alertName: string;
  opportunityTitle: string;
  opportunityType: string;
  locations: string[];
  href: string;
};

type OpportunityEmailResult =
  | { status: "sent"; id?: string }
  | { status: "skipped"; reason: "not-configured" | "missing-recipient" }
  | { status: "failed"; reason: string };

function absoluteUrl(href: string) {
  if (/^https?:\/\//i.test(href)) return href;

  const configuredBase =
    process.env.FROTO_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  if (!configuredBase) return href;
  return new URL(href, configuredBase).toString();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendOpportunityEmail(
  input: OpportunityEmailInput
): Promise<OpportunityEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROTO_EMAIL_FROM;

  if (!apiKey || !from) {
    return { status: "skipped", reason: "not-configured" };
  }

  if (!input.to.trim()) {
    return { status: "skipped", reason: "missing-recipient" };
  }

  const locations = input.locations.filter(Boolean);
  const locationText = locations.length > 0 ? locations.join(" → ") : "your saved area";
  const openUrl = absoluteUrl(input.href);
  const greeting = input.recipientName?.trim()
    ? `Hi ${input.recipientName.trim()},`
    : "Hi,";

  const text = `${greeting}\n\nFroto found a new opportunity matching your alert “${input.alertName}”.\n\n${input.opportunityTitle}\n${locationText}\n\nOpen opportunity: ${openUrl}\n\nYou are receiving this because email alerts are enabled for this saved Froto opportunity alert.`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#0f172a;line-height:1.6">
      <p>${escapeHtml(greeting)}</p>
      <p>Froto found a new opportunity matching your alert <strong>“${escapeHtml(input.alertName)}”</strong>.</p>
      <div style="border:1px solid #dbeafe;border-radius:16px;padding:20px;margin:20px 0;background:#f8fbff">
        <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#2563eb">${escapeHtml(input.opportunityType.replaceAll("_", " "))}</p>
        <h2 style="margin:0 0 8px;font-size:20px;color:#0b2f63">${escapeHtml(input.opportunityTitle)}</h2>
        <p style="margin:0;color:#475569">${escapeHtml(locationText)}</p>
      </div>
      <p><a href="${escapeHtml(openUrl)}" style="display:inline-block;background:#0b2f63;color:#ffffff;text-decoration:none;padding:11px 16px;border-radius:10px;font-weight:600">Open opportunity</a></p>
      <p style="margin-top:28px;font-size:12px;color:#64748b">You are receiving this because email alerts are enabled for this saved Froto opportunity alert.</p>
    </div>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: `Froto opportunity match · ${input.opportunityTitle}`,
        text,
        html,
        ...(process.env.RESEND_REPLY_TO
          ? { reply_to: process.env.RESEND_REPLY_TO }
          : {}),
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { id?: string; message?: string; name?: string }
      | null;

    if (!response.ok) {
      return {
        status: "failed",
        reason: payload?.message || payload?.name || `Resend returned ${response.status}`,
      };
    }

    return { status: "sent", id: payload?.id };
  } catch (error) {
    return {
      status: "failed",
      reason: error instanceof Error ? error.message : "Unknown email delivery error",
    };
  }
}
