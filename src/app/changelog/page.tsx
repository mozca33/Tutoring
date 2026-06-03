import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CHANGELOG } from "@/lib/changelog";

// Apenas administradores (lista por e-mail) acessam por enquanto.
const ADMINS = (process.env.ADMIN_EMAILS ?? "rafaelfelipe501@gmail.com")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

export const metadata = { title: "Changelog — Tutoring" };

export default async function ChangelogPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!ADMINS.includes((user.email ?? "").toLowerCase())) notFound();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Changelog</h1>
          <Link href="/app" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Voltar ao app</Link>
        </div>
        <p className="text-muted mb-8 text-sm">Histórico de tudo que foi construído na plataforma. (Acesso restrito.)</p>

        <div className="space-y-8">
          {CHANGELOG.map((entry, i) => (
            <section key={i} className="relative pl-6 border-l-2 border-border">
              <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-indigo-600" />
              <p className="text-xs text-muted">{new Date(entry.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
              <h2 className="text-lg font-semibold mt-0.5 mb-2">{entry.title}</h2>
              <ul className="space-y-1.5">
                {entry.items.map((it, j) => (
                  <li key={j} className="text-sm text-foreground/90 flex gap-2">
                    <span className="text-indigo-500 mt-1.5 h-1 w-1 rounded-full bg-indigo-500 shrink-0" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
