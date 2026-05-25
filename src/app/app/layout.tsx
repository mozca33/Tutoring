import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./sign-out-button";
import MobileMenu from "./mobile-menu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const navLinks = [
    { href: "/app", label: "Aulas" },
    { href: "/app/chat", label: "Mensagens" },
    { href: "/app/contatos", label: "Contatos" },
    { href: "/app/perfil", label: "Perfil" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/app" className="font-semibold text-indigo-700 text-lg">Tutoring</Link>
            <nav className="hidden sm:flex gap-4 text-sm text-slate-700">
              {navLinks.map((l) => (
                <Link key={l.href} href={l.href} className="hover:text-indigo-600 transition-colors">{l.label}</Link>
              ))}
            </nav>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-sm">
            <span className="text-slate-600">
              {profile?.full_name} · <span className="text-indigo-600">{profile?.role === "teacher" ? "Professor" : "Aluno"}</span>
            </span>
            <SignOutButton />
          </div>
          <MobileMenu name={profile?.full_name ?? ""} role={profile?.role ?? "student"} links={navLinks} />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
