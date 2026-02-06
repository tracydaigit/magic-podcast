import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { extractTextFromPdf } from "@/lib/pdf-extractor";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const podcastId = formData.get("podcastId") as string | null;

    if (!file || !podcastId) {
      return NextResponse.json(
        { error: "Missing file or podcastId" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 }
      );
    }

    // Parse the PDF
    const arrayBuffer = await file.arrayBuffer();
    const textContent = await extractTextFromPdf(arrayBuffer);

    if (!textContent.trim()) {
      throw new Error("Could not extract text from this PDF");
    }

    const trimmed = textContent.trim();
    const wordCount = trimmed.split(/\s+/).length;
    const firstLine = trimmed.split("\n")[0]?.trim() || "Untitled PDF";
    const title =
      firstLine.length > 200 ? firstLine.substring(0, 200) : firstLine;

    // Update podcast with extracted content
    const { error: updateError } = await supabase
      .from("podcasts")
      .update({
        title,
        word_count: wordCount,
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
        title,
        author: null,
        fullText: trimmed,
        wordCount,
        sourceUrl: `file://${file.name}`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "File extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
