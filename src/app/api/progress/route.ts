import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { podcastId, progressSeconds, completed } = await request.json();

    const { error } = await supabase.from("playback_progress").upsert(
      {
        user_id: user.id,
        podcast_id: podcastId,
        progress_seconds: progressSeconds,
        completed: completed || false,
        last_played_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,podcast_id",
      }
    );

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save progress";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const podcastId = request.nextUrl.searchParams.get("podcastId");
    if (!podcastId) {
      return NextResponse.json(
        { error: "Missing podcastId" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("playback_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("podcast_id", podcastId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(error.message);
    }

    return NextResponse.json({ progress: data || null });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load progress";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
