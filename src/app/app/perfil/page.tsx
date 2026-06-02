import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";
import type { Theme, Density } from "@/lib/preferences";

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, bio, email, avatar_url, theme, density")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-lg space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Meu perfil</h1>
        <p className="text-muted">Atualize suas informações e preferências.</p>
      </header>
      <ProfileForm
        initial={{
          full_name: profile?.full_name ?? "",
          bio: profile?.bio ?? "",
          email: profile?.email ?? user.email ?? "",
          role: profile?.role ?? "student",
          avatar_url: profile?.avatar_url ?? null,
          theme: (profile?.theme ?? "system") as Theme,
          density: (profile?.density ?? "medium") as Density,
        }}
      />
    </div>
  );
}
