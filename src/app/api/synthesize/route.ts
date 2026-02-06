import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { synthesizeScript, estimateDuration } from "@/lib/tts";
import type { ScriptSegment } from "@/lib/types";

export const maxDuration = 300; // TTS can take several minutes for long scripts

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { podcastId, script } = (await request.json()) as {
      podcastId: string;
      script: ScriptSegment[];
    };

    if (!podcastId || !script) {
      return NextResponse.json(
        { error: "Missing podcastId or script" },
        { status: 400 }
      );
    }

    // Synthesize the audio
    const audioBuffer = await synthesizeScript(script);
    const duration = estimateDuration(script);

    // Upload to Supabase Storage
    const fileName = `${user.id}/${podcastId}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from("podcast-audio")
      .upload(fileName, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload audio: ${uploadError.message}`);
    }

    // Update podcast record
    const { error: updateError } = await supabase
      .from("podcasts")
      .update({
        audio_url: fileName,
        duration_seconds: duration,
        status: "ready",
      })
      .eq("id", podcastId)
      .eq("user_id", user.id);

    if (updateError) {
      throw new Error(`Failed to update podcast: ${updateError.message}`);
    }

    return NextResponse.json({ success: true, duration });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Synthesis failed";

    // Try to update status to error
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { podcastId } = await request.clone().json();
      if (user && podcastId) {
        await supabase
          .from("podcasts")
          .update({ status: "error", error_message: message })
          .eq("id", podcastId)
          .eq("user_id", user.id);
      }
    } catch {
      // ignore cleanup errors
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
