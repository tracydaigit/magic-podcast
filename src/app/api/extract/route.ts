import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { extractFromUrl } from "@/lib/extractor";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { podcastId, url } = await request.json();

    if (!podcastId || !url) {
      return NextResponse.json(
        { error: "Missing podcastId or url" },
        { status: 400 }
      );
    }

    // Extract content
    const content = await extractFromUrl(url);

    // Update podcast with extracted content
    const { error: updateError } = await supabase
      .from("podcasts")
      .update({
        title: content.title,
        word_count: content.wordCount,
        status: "generating",
      })
      .eq("id", podcastId)
      .eq("user_id", user.id);

    if (updateError) {
      throw new Error(`Failed to update podcast: ${updateError.message}`);
    }

    return NextResponse.json({
      success: true,
      content: {
        title: content.title,
        author: content.author,
        fullText: content.fullText,
        wordCount: content.wordCount,
        sourceUrl: content.sourceUrl,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
