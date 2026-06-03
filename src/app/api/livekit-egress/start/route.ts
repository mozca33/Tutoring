import { NextResponse } from "next/server";
import { EncodedFileOutput, EncodedFileType, S3Upload } from "livekit-server-sdk";
import { createClient } from "@/lib/supabase/server";
import { egressClient, s3Configured } from "@/lib/egress";

export async function POST(req: Request) {
  const client = egressClient();
  if (!client || !s3Configured()) {
    return NextResponse.json({ error: "Gravação não configurada." }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { lessonId } = await req.json().catch(() => ({}));
  if (!lessonId) return NextResponse.json({ error: "lessonId required" }, { status: 400 });

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, room_name, teacher_id")
    .eq("id", lessonId)
    .single();
  if (!lesson || lesson.teacher_id !== user.id) {
    return NextResponse.json({ error: "Apenas o professor pode gravar." }, { status: 403 });
  }

  const filepath = `${lessonId}/${Date.now()}.mp4`;
  const output = new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath,
    output: {
      case: "s3",
      value: new S3Upload({
        accessKey: process.env.SUPABASE_S3_ACCESS_KEY!,
        secret: process.env.SUPABASE_S3_SECRET!,
        endpoint: process.env.SUPABASE_S3_ENDPOINT!,
        region: process.env.SUPABASE_S3_REGION || "us-east-2",
        bucket: process.env.SUPABASE_S3_BUCKET || "recordings",
        forcePathStyle: true,
      }),
    },
  });

  try {
    const info = await client.startRoomCompositeEgress(lesson.room_name, output, { layout: "speaker" });
    await supabase.from("lessons").update({
      recording_path: filepath,
      recording_egress_id: info.egressId,
      recording_status: "recording",
    }).eq("id", lessonId);
    return NextResponse.json({ egressId: info.egressId });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falha ao iniciar gravação" }, { status: 500 });
  }
}
