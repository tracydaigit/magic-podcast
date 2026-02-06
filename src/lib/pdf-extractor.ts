import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export async function extractTextFromPdf(
  data: Buffer | ArrayBuffer
): Promise<string> {
  const uint8 = new Uint8Array(data as ArrayBuffer);

  const doc = await getDocument({ data: uint8 }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .filter((item) => "str" in item)
      .map((item) => (item as { str: string }).str)
      .join(" ");
    pages.push(text);
  }

  return pages.join("\n\n");
}
