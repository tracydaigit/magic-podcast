import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { generateScript } from "@/lib/script-generator";
import type { ExtractedContent } from "@/lib/types";

export const maxDuration = 300; // Allow up to 5 minutes for long articles

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { podcastId, content } = (await request.json()) as {
      podcastId: string;
      content: ExtractedContent;
    };

    if (!podcastId || !content) {
      return NextResponse.json(
        { error: "Missing podcastId or content" },
        { status: 400 }
      );
    }

    // Generate the podcast script
    const script = await generateScript(content);

    // Update podcast with script
    const { error: updateError } = await supabase
      .from("podcasts")
      .update({
        script,
        status: "synthesizing",
      })
      .eq("id", podcastId)
      .eq("user_id", user.id);

    if (updateError) {
      throw new Error(`Failed to update podcast: ${updateError.message}`);
    }

    return NextResponse.json({ success: true, script });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Script generation failed";

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
