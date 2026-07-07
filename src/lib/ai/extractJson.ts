export function extractJson<T>(text: string): T {
  let cleaned = text.trim();
  // Remove ```json ... ```
  cleaned = cleaned.replace(/^```json/i, "");
  cleaned = cleaned.replace(/^```/i, "");
  cleaned = cleaned.replace(/```$/i, "");
  cleaned = cleaned.trim();
  try {
    return JSON.parse(cleaned);
  } catch {}
  // Find first JSON array/object
  const startArray = cleaned.indexOf("[");
  const startObject = cleaned.indexOf("{");
  let start = -1;
  if (startArray === -1) start = startObject;
  else if (startObject === -1) start = startArray;
  else start = Math.min(startArray, startObject);
  if (start === -1) {
    throw new Error("No JSON found.");
  }
  const endArray = cleaned.lastIndexOf("]");
  const endObject = cleaned.lastIndexOf("}");
  const end = Math.max(endArray, endObject);
  if (end === -1) {
    throw new Error("Invalid JSON.");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}