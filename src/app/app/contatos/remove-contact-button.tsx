"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RemoveContactButton({ relationshipId }: { relationshipId: string }) {
  const router = useRouter();
  async function remove() {
    if (!confirm("Remover esse vínculo? As aulas existentes continuarão.")) return;
    const supabase = createClient();
    await supabase.from("relationships").delete().eq("id", relationshipId);
    router.refresh();
  }
  return (
    <button onClick={remove} className="text-sm text-red-600 hover:text-red-700">
      Remover
    </button>
  );
}
