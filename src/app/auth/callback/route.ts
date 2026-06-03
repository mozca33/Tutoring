import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Troca o código (OAuth / confirmação de e-mail) por uma sessão e redireciona.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";
  const intent = searchParams.get("intent");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Login (não signup): se a conta foi recém-criada por este OAuth, descartar.
      if (intent === "login") {
        const { data: { user } } = await supabase.auth.getUser();
        const isNew = user && Date.now() - new Date(user.created_at).getTime() < 20000;
        if (isNew) {
          await supabase.auth.signOut();
          if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
            const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
            try { await admin.auth.admin.deleteUser(user!.id); } catch {}
          }
          return NextResponse.redirect(`${origin}/login?error=nouser`);
        }
      }
      return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/app"}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
