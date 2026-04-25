export function parseAIResponse(text) {
  try {
    const parsed = JSON.parse(text);

    // If it's already structured
    if (Array.isArray(parsed)) return parsed;

    if (parsed.type === "NONE") {
      return [];
    }

    return [parsed];
  } catch {
    return [];
  }
}
