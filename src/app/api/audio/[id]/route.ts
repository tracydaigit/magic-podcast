import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: podcastId } = await params;

    // Verify the podcast belongs to the user
    const { data: podcast, error: fetchError } = await supabase
      .from("podcasts")
      .select("audio_url")
      .eq("id", podcastId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !podcast?.audio_url) {
      return NextResponse.json(
        { error: "Podcast not found" },
        { status: 404 }
      );
    }

    // Get a signed URL for the audio file
    const { data: signedUrl, error: signError } = await supabase.storage
      .from("podcast-audio")
      .createSignedUrl(podcast.audio_url, 3600); // 1 hour expiry

    if (signError || !signedUrl) {
      return NextResponse.json(
        { error: "Failed to get audio URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: signedUrl.signedUrl });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get audio";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
