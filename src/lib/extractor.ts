import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { extractTextFromPdf } from "./pdf-extractor";
import type { ExtractedContent } from "./types";

export async function extractFromUrl(url: string): Promise<ExtractedContent> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/pdf")) {
    return extractFromPdf(url, response);
  }

  return extractFromHtml(url, response);
}

async function extractFromHtml(
  url: string,
  response: Response
): Promise<ExtractedContent> {
  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article) {
    throw new Error("Could not extract article content from this URL");
  }

  const textContent = (article.textContent ?? "").trim();
  const wordCount = textContent.split(/\s+/).length;

  return {
    title: article.title || "Untitled Article",
    author: article.byline || null,
    fullText: textContent,
    wordCount,
    sourceUrl: url,
  };
}

async function extractFromPdf(
  url: string,
  response: Response
): Promise<ExtractedContent> {
  const arrayBuffer = await response.arrayBuffer();
  const textContent = await extractTextFromPdf(arrayBuffer);

  const trimmed = textContent.trim();
  const wordCount = trimmed.split(/\s+/).length;
  const firstLine = trimmed.split("\n")[0]?.trim() || "Untitled PDF";

  return {
    title: firstLine.length > 200 ? firstLine.substring(0, 200) : firstLine,
    author: null,
    fullText: trimmed,
    wordCount,
    sourceUrl: url,
  };
}
