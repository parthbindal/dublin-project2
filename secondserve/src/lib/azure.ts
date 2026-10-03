// Server-only: asks the Azure AI model to organize a donor's description into a listing.
// The key stays on the server (read from .env.local) and is never sent to the browser.
import { parseModelReply } from './parseListing';
import type { ListingDraft } from './types';

const TIMEOUT_MS = 15000;

const SYSTEM_PROMPT = `You turn a restaurant's, store's or cafeteria's description of leftover food into JSON for a food-rescue app.
Reply with ONLY one JSON object, no prose, in exactly this shape:
{"items":[{"name":string,"quantity":number,"unit":string,"estimatedLbs":number,"category":"bakery"|"produce"|"prepared"|"dairy"|"protein"|"packaged"}],
 "storage":"shelf-stable"|"refrigerated"|"hot",
 "dietary":{"vegetarian":boolean,"vegan":boolean,"containsNuts":boolean,"containsDairy":boolean,"containsGluten":boolean},
 "pickupBy":"HH:MM" or null,
 "notes":string}
Rules:
- estimatedLbs is your best estimate of the total weight of that line (all units together).
- unit is "pieces" when the food is counted one by one.
- storage: "hot" if served hot, "refrigerated" for cooked food, dairy, meat or anything they say must stay cold, otherwise "shelf-stable".
- pickupBy uses 24-hour time. A bare evening hour like "by 9" means 21:00. Use null if no time is given.
- notes: one short sentence with anything a food bank should know (allergens, how it was stored). Never invent facts.`;

export interface AiParseResult {
  draft: ListingDraft | null;
  error: string | null;
}

function readContent(data: unknown): string | null {
  const choices = (data as { choices?: Array<{ message?: { content?: unknown } }> } | null)?.choices;
  const content = choices?.[0]?.message?.content;
  return typeof content === 'string' ? content : null;
}

export async function parseWithAzure(text: string): Promise<AiParseResult> {
  const endpoint = process.env.AZURE_AI_ENDPOINT;
  const key = process.env.AZURE_AI_KEY;
  const model = process.env.AZURE_AI_MODEL;
  if (!endpoint || !key || !model) return { draft: null, error: 'AI is not set up on this computer' };
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': key },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 800,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!response.ok) return { draft: null, error: `the AI service answered ${response.status}` };
    const content = readContent(await response.json());
    const draft = content ? parseModelReply(content) : null;
    return draft ? { draft, error: null } : { draft: null, error: "the AI's answer didn't fit the listing format" };
  } catch (error: unknown) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    return { draft: null, error: timedOut ? 'the AI took too long to answer' : 'the AI could not be reached' };
  }
}
