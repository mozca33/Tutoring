import { EgressClient } from "livekit-server-sdk";

// Host HTTPS derivado do wsUrl do LiveKit.
export function livekitHost() {
  const ws = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "";
  return ws.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
}

export function egressClient() {
  const key = process.env.LIVEKIT_API_KEY;
  const secret = process.env.LIVEKIT_API_SECRET;
  if (!key || !secret) return null;
  return new EgressClient(livekitHost(), key, secret);
}

export function s3Configured() {
  return Boolean(
    process.env.SUPABASE_S3_ACCESS_KEY &&
    process.env.SUPABASE_S3_SECRET &&
    process.env.SUPABASE_S3_ENDPOINT,
  );
}
