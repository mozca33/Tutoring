import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "./sidebar";
import PreferencesProvider from "./preferences-provider";
import type { Theme, Density } from "@/lib/preferences";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, avatar_url, theme, density")
    .eq("id", user.id)
    .single();

  const theme = (profile?.theme ?? "system") as Theme;
  const density = (profile?.density ?? "medium") as Density;

  return (
    <PreferencesProvider theme={theme} density={density}>
      <div className="min-h-screen bg-background text-foreground lg:flex">
        <Sidebar
          name={profile?.full_name ?? ""}
          role={profile?.role ?? "student"}
          avatarUrl={profile?.avatar_url ?? null}
          theme={theme}
          density={density}
        />
        <main className="flex-1 min-w-0">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">{children}</div>
        </main>
      </div>
    </PreferencesProvider>
  );
}
