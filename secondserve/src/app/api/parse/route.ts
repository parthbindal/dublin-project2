// POST /api/parse  { "text": "30 bagels and 2 trays of pasta, pick up by 9" }
// Asks the Azure AI model to organize the description. If the AI is unavailable or its answer
// doesn't validate, the built-in parser answers instead, so posting food always works.
import { z } from 'zod';
import { parseWithAzure } from '@/lib/azure';
import { builtinParse, withSaferDietary } from '@/lib/parseListing';

const MAX_TEXT_LENGTH = 1000;

const RequestSchema = z.object({
  text: z.string().trim().min(1).max(MAX_TEXT_LENGTH),
});

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: `Describe the food in 1 to ${MAX_TEXT_LENGTH.toLocaleString('en-US')} characters.` },
      { status: 400 },
    );
  }
  const { text } = parsed.data;
  const ai = await parseWithAzure(text);
  if (ai.draft) return Response.json({ source: 'ai', draft: withSaferDietary(ai.draft, text) });
  return Response.json({
    source: 'builtin',
    draft: builtinParse(text),
    note: `Used the built-in parser because ${ai.error ?? 'the AI was unavailable'}.`,
  });
}
