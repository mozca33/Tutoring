import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "./sidebar";
import PreferencesProvider from "./preferences-provider";
import MessageNotifier from "./message-notifier";
import type { Theme, Density } from "@/lib/preferences";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, avatar_url, theme, density, role_confirmed, teacher_code")
    .eq("id", user.id)
    .single();

  const theme = (profile?.theme ?? "system") as Theme;
  const density = (profile?.density ?? "medium") as Density;

  return (
    <PreferencesProvider theme={theme} density={density}>
      <a href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-indigo-600 focus:text-white focus:px-4 focus:py-2 focus:text-sm">
        Pular para o conteúdo
      </a>
      <div className="min-h-screen bg-background text-foreground lg:flex">
        <Sidebar
          userId={user.id}
          name={profile?.full_name ?? ""}
          role={profile?.role ?? "student"}
          avatarUrl={profile?.avatar_url ?? null}
          teacherCode={profile?.teacher_code ?? null}
          theme={theme}
          density={density}
        />
        <main id="conteudo" className="flex-1 min-w-0 px-4 sm:px-6 py-8">{children}</main>
      </div>
      <MessageNotifier userId={user.id} />
    </PreferencesProvider>
  );
}
