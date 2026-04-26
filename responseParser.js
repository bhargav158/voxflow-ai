export function parseAIResponse(text) {
  try {
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) return parsed;

    if (parsed.type === "NONE") {
      return [];
    }

    return [parsed];
  } catch {
    return [];
  }
}