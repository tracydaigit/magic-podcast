import { getDocument, type PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";

export async function extractTextFromPdf(
  data: Buffer | ArrayBuffer
): Promise<string> {
  const uint8 = new Uint8Array(
    data instanceof Buffer ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : data
  );

  const doc: PDFDocumentProxy = await getDocument({ data: uint8 }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .filter((item): item is { str: string } => "str" in item)
      .map((item) => item.str)
      .join(" ");
    pages.push(text);
  }

  return pages.join("\n\n");
}
