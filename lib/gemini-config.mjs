// Google supports both names for Gemini Developer API credentials. Mirror the
// SDK's documented precedence and trim deployment-secret whitespace so an
// accidental newline or pasted space cannot invalidate an otherwise valid key.
export function getGeminiApiKey() {
  const value = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  const key = value?.trim();
  return key || undefined;
}
