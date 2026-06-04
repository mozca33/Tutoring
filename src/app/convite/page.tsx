"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/theme-toggle";

function Convite() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState(false);

  useEffect(() => {
    const th = params.get("th");
    if (!th) { setError(true); return; }
    const supabase = createClient();
    supabase.auth.verifyOtp({ type: "recovery", token_hash: th }).then(({ error }) => {
      if (error) setError(true);
      else { router.replace("/reset-password"); }
    });
  }, [params, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="w-full max-w-md bg-surface p-8 rounded-xl shadow-sm border border-border text-center space-y-3">
        {error ? (
          <>
            <h1 className="text-xl font-semibold text-foreground">Link inválido ou expirado</h1>
            <p className="text-sm text-muted">Peça ao seu professor um novo link de acesso.</p>
          </>
        ) : (
          <p className="text-sm text-muted flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Validando seu convite…</p>
        )}
      </div>
    </main>
  );
}

export default function ConvitePage() {
  return (
    <Suspense>
      <Convite />
    </Suspense>
  );
}
