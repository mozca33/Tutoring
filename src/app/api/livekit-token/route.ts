import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lessonId = searchParams.get("lessonId");
  if (!lessonId) return NextResponse.json({ error: "lessonId required" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("id, room_name, teacher_id, student_id, title, scheduled_at, duration_minutes, status")
    .eq("id", lessonId)
    .single();
  if (error || !lesson) return NextResponse.json({ error: "lesson not found" }, { status: 404 });
  if (lesson.teacher_id !== user.id && lesson.student_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Janela de entrada: 10 min antes até 30 min após o término.
  const start = new Date(lesson.scheduled_at).getTime();
  const end = start + lesson.duration_minutes * 60 * 1000;
  const now = Date.now();
  if (lesson.status === "cancelled" || lesson.status === "completed") {
    return NextResponse.json({ error: "Esta aula não está mais disponível." }, { status: 403 });
  }
  if (now < start - 10 * 60 * 1000) {
    return NextResponse.json({ error: "A sala ainda não abriu (abre 10 min antes do horário)." }, { status: 403 });
  }
  if (now > end + 30 * 60 * 1000) {
    return NextResponse.json({ error: "Esta aula já terminou." }, { status: 403 });
  }

  const { data: profile } = await supabase
    .from("profiles").select("full_name").eq("id", user.id).single();

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json({ error: "livekit not configured" }, { status: 500 });
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: profile?.full_name ?? user.email ?? "Convidado",
    ttl: 60 * 60 * 4,
  });
  at.addGrant({
    room: lesson.room_name,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return NextResponse.json({ token: await at.toJwt(), wsUrl, roomName: lesson.room_name });
}
