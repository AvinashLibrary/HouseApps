import type {
  PaddleOcrService as PaddleOcrServiceType
} from "ppu-paddle-ocr" with { "resolution-mode": "import" };
// Local, free OCR — Step 1 of the pipeline, run on every receipt. PP-OCRv6
// (the package's default model) is noticeably more accurate on receipt-style
// text than Tesseract, at the cost of a larger install and a one-time model
// download on first run (see initialize() note below).
//
// ppu-paddle-ocr is published as a pure ESM package ("type": "module" in its
// own package.json). This server compiles to CommonJS, and CommonJS cannot
// `require()` a pure-ESM package — hence the dynamic `import()` below rather
// than a static `import { PaddleOcrService } from 'ppu-paddle-ocr'`, which TS
// would otherwise compile down to a require() call and fail at runtime with
// ERR_REQUIRE_ESM. The type-only import above is erased entirely at compile
// time (it never emits any require/import call), so it's safe to keep static.
//
// TODO (future): once the AI router service can accept images directly, it
// may be worth comparing "PaddleOCR text -> regex/router pipeline" against
// "image -> router vision model" directly for the hardest receipts, rather
// than always going through local OCR first. Not done now — this keeps the
// cost-first pipeline (local OCR before any model call) the skill calls for.
let servicePromise: Promise<PaddleOcrServiceType> | null = null;

async function getService(): Promise<PaddleOcrServiceType> {
  if (!servicePromise) {
    servicePromise = (async () => {
      const { PaddleOcrService } = await import('ppu-paddle-ocr');
      const service = new PaddleOcrService();
      // Downloads and caches the default PP-OCRv6-small model + dictionary on
      // first run (see PaddleOcrService.downloadModels() to pre-warm this in
      // CI/CD instead of paying the delay on a live request). Cached locally
      // after that — no repeat download or per-request network cost.
      await service.initialize();
      return service;
    })();
  }
  return servicePromise;
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  // Buffer is a view over a possibly-larger underlying ArrayBuffer (Node
  // pools small allocations), so this must slice to the buffer's own bounds
  // rather than passing buffer.buffer directly.
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export class OcrEngine {
  async recognize(buffer: Buffer): Promise<string> {
    const service = await getService();
    const result = await service.recognize(toArrayBuffer(buffer));
    console.log(result.lines[0]);
    return (result?.text || '').trim();
  }
}