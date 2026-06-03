import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { egressClient } from "@/lib/egress";

export async function POST(req: Request) {
  const client = egressClient();
  if (!client) return NextResponse.json({ error: "Gravação não configurada." }, { status: 500 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { lessonId } = await req.json().catch(() => ({}));
  if (!lessonId) return NextResponse.json({ error: "lessonId required" }, { status: 400 });

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, teacher_id, recording_egress_id")
    .eq("id", lessonId)
    .single();
  if (!lesson || lesson.teacher_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!lesson.recording_egress_id) return NextResponse.json({ error: "Sem gravação em andamento." }, { status: 400 });

  try {
    await client.stopEgress(lesson.recording_egress_id);
  } catch {
    // mesmo se o egress já tiver parado, marcamos como done
  }
  await supabase.from("lessons").update({ recording_status: "done" }).eq("id", lessonId);
  return NextResponse.json({ ok: true });
}
