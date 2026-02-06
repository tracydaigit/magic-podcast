import OpenAI from "openai";
import type { ScriptSegment } from "./types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Two distinct voices for the two hosts
const VOICE_MAP = {
  A: "onyx" as const, // Deep, authoritative narrator
  B: "shimmer" as const, // Different tone for the reactor
};

export async function synthesizeScript(
  script: ScriptSegment[]
): Promise<Buffer> {
  const audioBuffers: Buffer[] = [];

  // Process segments sequentially to maintain order
  for (const segment of script) {
    const voice = VOICE_MAP[segment.speaker];

    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice,
      input: segment.text,
      response_format: "mp3",
    });

    const arrayBuffer = await response.arrayBuffer();
    audioBuffers.push(Buffer.from(arrayBuffer));
  }

  // Simple concatenation of MP3 buffers
  // MP3 frames are self-contained, so concatenation produces valid audio
  return Buffer.concat(audioBuffers);
}

export function estimateDuration(script: ScriptSegment[]): number {
  // Average speaking rate is ~150 words per minute
  const totalWords = script.reduce(
    (sum, seg) => sum + seg.text.split(/\s+/).length,
    0
  );
  return Math.round((totalWords / 150) * 60);
}
