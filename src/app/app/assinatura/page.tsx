import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { trialDaysLeft } from "@/lib/subscription";
import SubscribeButton from "./subscribe-button";
import ManageButton from "./manage-button";

const PLAN_FEATURES = [
  "Agendamento ilimitado de aulas",
  "Sala de vídeo com chat e compartilhamento de tela",
  "Envio de materiais e lição de casa",
  "Histórico e resumos das aulas",
];

export default async function AssinaturaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, subscription_status, trial_ends_at")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "teacher") redirect("/app");

  const status = profile?.subscription_status ?? "none";
  const days = trialDaysLeft(profile?.trial_ends_at ?? null);
  const active = status === "active";

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Assinatura</h1>
        <p className="text-muted">Plano para professores usarem a plataforma.</p>
      </header>

      {active ? (
        <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-emerald-800 dark:text-emerald-200 text-sm">
          ✓ Sua assinatura está <strong>ativa</strong>. Obrigado!
        </div>
      ) : status === "trialing" && days > 0 ? (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/40 p-4 text-indigo-800 dark:text-indigo-200 text-sm">
          Período de teste: <strong>{days} {days === 1 ? "dia restante" : "dias restantes"}</strong>. Assine para não perder o acesso.
        </div>
      ) : (
        <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 text-amber-800 dark:text-amber-200 text-sm">
          Seu período de teste terminou. Assine para reativar o agendamento e o envio de materiais.
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Plano Professor</h2>
          <p className="text-muted text-sm">Acesso completo às ferramentas de ensino.</p>
        </div>
        <ul className="space-y-2">
          {PLAN_FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm">
              <Check size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" /> {f}
            </li>
          ))}
        </ul>
        {active ? <ManageButton /> : <SubscribeButton />}
      </div>
    </div>
  );
}
