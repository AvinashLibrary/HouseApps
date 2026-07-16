export const config = {
  port: Number(process.env.PORT ?? 4000),
  dataDir: process.env.DATA_DIR ?? './data',
  allowedOrigin: process.env.ALLOWED_ORIGIN ? [process.env.ALLOWED_ORIGIN] : ['http://127.0.0.1:5500', 'http://localhost:3000'],
  // Gemini Flash reads the receipt image directly and returns structured JSON
  // (merchant, amount, currency, date, description) in one call, replacing a
  // separate OCR-text-extraction + regex-guessing pipeline. Unlike OCR.space,
  // Gemini has no public demo key — GEMINI_API_KEY must be set (free tier
  // available at aistudio.google.com/apikey).
  geminiApiKey: process.env.GEMINI_API_KEY ?? 'AQ.Ab8RN6KMOBT6_qYqojgWzwTUwU6caRpSS_p6o0wVO8Xi19LNtw',
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-3.5-flash',
  geminiApiUrl: process.env.GEMINI_API_URL ?? 'https://generativelanguage.googleapis.com/v1beta/models',
};