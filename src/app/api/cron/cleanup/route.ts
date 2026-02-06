import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  // Verify cron secret (set in Vercel cron config)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Find expired podcasts
  const { data: expired, error: fetchError } = await supabase
    .from("podcasts")
    .select("id, user_id, audio_url")
    .lt("expires_at", new Date().toISOString())
    .neq("status", "expired");

  if (fetchError) {
    return NextResponse.json(
      { error: fetchError.message },
      { status: 500 }
    );
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ cleaned: 0 });
  }

  // Delete audio files and mark as expired
  let cleaned = 0;
  for (const podcast of expired) {
    // Delete audio file if it exists
    if (podcast.audio_url) {
      await supabase.storage
        .from("podcast-audio")
        .remove([podcast.audio_url]);
    }

    // Mark as expired
    await supabase
      .from("podcasts")
      .update({ status: "expired", audio_url: null })
      .eq("id", podcast.id);

    cleaned++;
  }

  return NextResponse.json({ cleaned });
}
