"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen, MessageSquare, Users, FolderOpen, User, CreditCard,
  Menu, X, LogOut, Moon, Sun, PanelLeftClose, PanelLeft, Copy, Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { applyPreferences, isDark, type Theme, type Density } from "@/lib/preferences";
import NotificationsBell from "./notifications-bell";

const NAV = [
  { href: "/app", label: "Aulas", icon: BookOpen, exact: true },
  { href: "/app/materiais", label: "Materiais", icon: FolderOpen },
  { href: "/app/chat", label: "Mensagens", icon: MessageSquare },
  { href: "/app/contatos", label: "Contatos", icon: Users },
  { href: "/app/perfil", label: "Perfil", icon: User },
];

export default function Sidebar({
  userId, name, role, avatarUrl, teacherCode, theme, density,
}: {
  userId: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  teacherCode: string | null;
  theme: Theme;
  density: Density;
}) {
  const [copied, setCopied] = useState(false);
  function copyCode() {
    if (!teacherCode) return;
    navigator.clipboard?.writeText(teacherCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(() => (typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : isDark(theme)));

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function quickToggleTheme() {
    const next: Theme = dark ? "light" : "dark";
    applyPreferences(next, density);
    setDark(next === "dark");
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) await supabase.from("profiles").update({ theme: next }).eq("id", data.user.id);
  }

  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const nav = [...NAV];
  if (role === "teacher") {
    nav.splice(4, 0, { href: "/app/assinatura", label: "Assinatura", icon: CreditCard });
  }

  const NavList = (
    <nav className="flex-1 px-2 space-y-1">
      {nav.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(href, exact);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            title={collapsed ? label : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-indigo-600 text-white"
                : "text-foreground hover:bg-background"
            } ${collapsed ? "lg:justify-center lg:px-2" : ""}`}
          >
            <Icon size={20} className="shrink-0" />
            <span className={collapsed ? "lg:hidden" : ""}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const Footer = (
    <div className="border-t border-border p-2 space-y-1">
      <Link
        href="/app/perfil"
        onClick={() => setMobileOpen(false)}
        title={collapsed ? name : undefined}
        className={`flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-background transition-colors ${collapsed ? "lg:justify-center" : ""}`}
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt={name} width={36} height={36} className="rounded-full object-cover h-9 w-9 shrink-0" />
        ) : (
          <span className="h-9 w-9 shrink-0 rounded-full bg-indigo-600 text-white grid place-items-center text-sm font-semibold">
            {initials || "?"}
          </span>
        )}
        <span className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
          <span className="block text-sm font-medium truncate">{name}</span>
          <span className="block text-xs text-muted">{role === "teacher" ? "Professor" : "Aluno"}</span>
        </span>
      </Link>

      {role === "teacher" && teacherCode && (
        <button onClick={copyCode} title="Copiar código"
          className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-background transition-colors ${collapsed ? "lg:justify-center" : ""}`}>
          <span className="text-xs text-muted shrink-0">Código</span>
          <span className={`font-mono text-sm tracking-widest text-indigo-600 dark:text-indigo-400 ${collapsed ? "lg:hidden" : ""}`}>{teacherCode}</span>
          <span className={`ml-auto text-muted ${collapsed ? "lg:hidden" : ""}`}>{copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}</span>
        </button>
      )}
      <div className={`flex gap-1 ${collapsed ? "lg:flex-col" : ""}`}>
        <button
          onClick={quickToggleTheme}
          title="Alternar tema"
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-background transition-colors"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
          <span className={collapsed ? "lg:hidden" : ""}>{dark ? "Claro" : "Escuro"}</span>
        </button>
        <button
          onClick={signOut}
          title="Sair"
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-background transition-colors"
        >
          <LogOut size={18} />
          <span className={collapsed ? "lg:hidden" : ""}>Sair</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Topbar mobile */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-surface border-b border-border px-4 py-3">
        <button onClick={() => setMobileOpen(true)} aria-label="Abrir menu" className="text-foreground">
          <Menu size={24} />
        </button>
        <Link href="/app" className="font-semibold text-indigo-600 dark:text-indigo-400 text-lg">Tutoring</Link>
        <NotificationsBell userId={userId} />
      </div>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 z-50 lg:z-auto h-screen lg:h-screen shrink-0 bg-surface border-r border-border flex flex-col transition-all duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${collapsed ? "lg:w-20" : "lg:w-64"} w-64`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <Link href="/app" className={`font-semibold text-indigo-600 dark:text-indigo-400 text-lg ${collapsed ? "lg:hidden" : ""}`}>
            Tutoring
          </Link>
          <div className="flex items-center gap-1">
            {!collapsed && <span className="hidden lg:inline-flex"><NotificationsBell userId={userId} /></span>}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:inline-flex text-muted hover:text-foreground"
              aria-label="Recolher menu"
            >
              {collapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
            </button>
            <button onClick={() => setMobileOpen(false)} className="lg:hidden text-foreground" aria-label="Fechar menu">
              <X size={22} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-3">{NavList}</div>
        {Footer}
      </aside>
    </>
  );
}
