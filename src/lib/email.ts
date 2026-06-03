// Envio de e-mail via Resend (REST API, sem dependência extra).
const FROM = process.env.RESEND_FROM ?? "Tutoring <onboarding@resend.dev>";

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY ausente" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "erro" };
  }
}

export function emailLayout(title: string, body: string, ctaText?: string, ctaUrl?: string) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
    <h2 style="color:#4f46e5;margin:0 0 12px">${title}</h2>
    <div style="font-size:14px;line-height:1.6;color:#334155">${body}</div>
    ${ctaText && ctaUrl ? `<a href="${ctaUrl}" style="display:inline-block;margin-top:16px;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">${ctaText}</a>` : ""}
    <p style="font-size:12px;color:#94a3b8;margin-top:24px">Tutoring — plataforma de aulas particulares</p>
  </div>`;
}
