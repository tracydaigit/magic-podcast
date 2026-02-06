import Anthropic from "@anthropic-ai/sdk";
import { PODCAST_SYSTEM_PROMPT, buildUserPrompt } from "./style-prompt";
import type { ExtractedContent, ScriptSegment } from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function generateScript(
  content: ExtractedContent
): Promise<ScriptSegment[]> {
  const userPrompt = buildUserPrompt(content);

  // For very long articles, we may need to truncate to fit context window
  const maxChars = 150000;
  const truncatedPrompt =
    userPrompt.length > maxChars
      ? userPrompt.substring(0, maxChars) +
        "\n\n[Article truncated for length. Cover all content mentioned above.]"
      : userPrompt;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: PODCAST_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: truncatedPrompt,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Parse the JSON response
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Failed to parse script from Claude response");
  }

  const script: ScriptSegment[] = JSON.parse(jsonMatch[0]);

  // Validate structure
  if (!Array.isArray(script) || script.length === 0) {
    throw new Error("Script is empty or invalid");
  }

  for (const segment of script) {
    if (!segment.speaker || !segment.text) {
      throw new Error("Invalid script segment: missing speaker or text");
    }
    if (segment.speaker !== "A" && segment.speaker !== "B") {
      throw new Error(
        `Invalid speaker "${segment.speaker}" — must be "A" or "B"`
      );
    }
  }

  return script;
}
