import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role_confirmed")
    .eq("id", user.id)
    .single();

  if (profile?.role_confirmed) redirect("/app");

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md bg-surface border border-border rounded-xl p-8 text-center space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Bem-vindo(a){profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}!</h1>
          <p className="text-muted mt-1">Como você vai usar a plataforma?</p>
        </div>
        <OnboardingForm />
      </div>
    </main>
  );
}
