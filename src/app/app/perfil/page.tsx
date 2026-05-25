import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, bio, email")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-lg space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Meu perfil</h1>
        <p className="text-slate-500">Atualize suas informações.</p>
      </header>
      <ProfileForm
        initial={{
          full_name: profile?.full_name ?? "",
          bio: profile?.bio ?? "",
          email: profile?.email ?? user.email ?? "",
          role: profile?.role ?? "student",
        }}
      />
    </div>
  );
}
