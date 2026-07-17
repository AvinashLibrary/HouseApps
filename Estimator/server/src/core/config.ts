export const config = {
  port: Number(process.env.PORT ?? 4000),
  dataDir: process.env.DATA_DIR ?? './data',
  allowedOrigin: process.env.ALLOWED_ORIGIN ? [process.env.ALLOWED_ORIGIN] : ['http://127.0.0.1:5500', 'http://localhost:3000','http://localhost:3001'],
  // Receipt OCR pipeline: local Tesseract OCR + regex/merchant-template
  // extraction runs on every receipt for free. The AI router below is only
  // called when the regex pass's confidence is below this threshold — see
  // features/ocr/ocr.service.ts.
  ocrConfidenceThreshold: Number(process.env.OCR_CONFIDENCE_THRESHOLD ?? 0.95),
  // When true, includes the raw OCR text in the response for debugging.
  // Left off by default — never expose raw OCR to the client otherwise.
  ocrDebug: process.env.OCR_DEBUG === 'true',
  // In-house AI router microservice — picks a model itself (see its own
  // `model`/`label` response fields) and manages its own provider credentials,
  // so this server no longer needs a Gemini API key of its own.
  aiRouterUrl: process.env.AI_ROUTER_URL ?? 'http://localhost:3000/v1/route',
  // The router is currently text-only (POST { prompt } -> { response }).
  // Image-based extraction (used only as a last resort when local OCR finds
  // no text at all) is blocked until the router actually supports it — flip
  // to true once that lands, but the request shape in
  // llm-fallback.repository.ts's extractFromImage is a placeholder that will
  // need to be checked against the router's real image contract at that point.
  aiRouterSupportsImage: process.env.AI_ROUTER_SUPPORTS_IMAGE === 'true',
  // Off by default — merchant-level categorization is already handled locally
  // and for free (categorizer.ts, per the skill's "never use an LLM for
  // merchant categorization" rule). This is specifically for per-LINE-ITEM
  // categorization (e.g. a pharmacy receipt with both medicine and snacks),
  // which local lookup genuinely can't do — flip on when that's needed.
  ocrCategorizeItems: process.env.OCR_CATEGORIZE_ITEMS === 'true',
};