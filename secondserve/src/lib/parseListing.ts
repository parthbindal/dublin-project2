// Turns a donor's free-text description into a structured listing.
// The AI route uses parseModelReply; builtinParse is the no-AI backup so the demo never breaks.
import { z } from 'zod';
import { round1 } from './format';
import { FOOD_CATEGORIES, STORAGE_TYPES, type Dietary, type FoodCategory, type FoodItem, type ListingDraft, type Storage } from './types';

export const ListingDraftSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        quantity: z.number().positive().max(100000),
        unit: z.string().trim().max(30).catch('pieces'),
        estimatedLbs: z.number().positive().max(5000),
        category: z.enum(FOOD_CATEGORIES),
      }),
    )
    .min(1)
    .max(20),
  storage: z.enum(STORAGE_TYPES),
  dietary: z.object({
    vegetarian: z.boolean(),
    vegan: z.boolean(),
    containsNuts: z.boolean(),
    containsDairy: z.boolean(),
    containsGluten: z.boolean(),
  }),
  pickupBy: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/).nullable().catch(null),
  notes: z.string().max(500).catch(''),
});

/** Pulls the JSON object out of a model reply, dropping stray tokens like <|OPENAI|> and code fences. */
export function extractJsonObject(text: string): unknown {
  const cleaned = text.replace(/<\|[^|>]*\|>/g, '').replace(/```(?:json)?/gi, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function padTime(value: string): string {
  const [hours, minutes] = value.split(':');
  return `${hours.padStart(2, '0')}:${minutes}`;
}

export function normalizeDraft(draft: ListingDraft): ListingDraft {
  const vegan = draft.dietary.vegan && !draft.dietary.containsDairy;
  return {
    ...draft,
    items: draft.items.map((item) => ({ ...item, estimatedLbs: round1(item.estimatedLbs) })),
    dietary: { ...draft.dietary, vegan, vegetarian: draft.dietary.vegetarian || vegan },
    pickupBy: draft.pickupBy ? padTime(draft.pickupBy) : null,
  };
}

/** Validates an AI reply. Returns null if it is not a usable listing. */
export function parseModelReply(text: string): ListingDraft | null {
  const result = ListingDraftSchema.safeParse(extractJsonObject(text));
  return result.success ? normalizeDraft(result.data) : null;
}

// ---------- Built-in parser (no AI) ----------

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50,
};

const UNIT_ALIASES: Record<string, string> = {
  tray: 'tray', trays: 'tray', box: 'box', boxes: 'box', case: 'case', cases: 'case', crate: 'crate', crates: 'crate',
  bag: 'bag', bags: 'bag', loaf: 'loaf', loaves: 'loaf', lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  gallon: 'gallon', gallons: 'gallon', carton: 'carton', cartons: 'carton', pan: 'pan', pans: 'pan',
  dozen: 'dozen', sack: 'sack', sacks: 'sack',
};

const LBS_PER_UNIT: Record<string, number> = {
  tray: 10, box: 15, case: 20, crate: 20, bag: 5, loaf: 1.5, lb: 1, gallon: 8.6, carton: 2, pan: 8, dozen: 1.5, sack: 10,
};

const LBS_PER_PIECE: Record<FoodCategory, number> = {
  bakery: 0.3, produce: 0.4, prepared: 0.75, dairy: 0.5, protein: 0.5, packaged: 0.5,
};

// Order matters: "banana bread" is bakery and "chicken fried rice" is a prepared meal.
const CATEGORY_PATTERNS: Array<[FoodCategory, RegExp]> = [
  ['bakery', /bread|bagel|muffin|croissant|pastr|loa(f|ves)|\bbuns?\b|rolls?\b|donut|doughnut|cake|cookie|scone|tortilla/],
  ['prepared', /pasta|rice|curry|soup|meal|sandwich|burrito|pizza|stew|lasagna|noodle|taco|wrap|casserole|dumpling|alfredo|salad/],
  ['dairy', /milk|yogh?urt|cheese|\beggs?\b|butter|cream/],
  ['protein', /chicken|beef|pork|fish|salmon|turkey|meat|tofu|\bham\b|sausage/],
  ['produce', /apple|banana|lettuce|vegetable|veggie|fruit|produce|tomato|orange|berr|grape|carrot|potato|onion|pepper|melon/],
  ['packaged', /\bcan(ned|s)?\b|cereal|chip|granola|snack|packaged|\bbars?\b|juice/],
];

const SPLIT_PATTERN = /,|;|\n|\band\b|\bplus\b|\balso\b/i;
const CUT_PATTERN = /\b(that|which|for|pick|pickup|before|by|until|till|need|needs|must|should|still|keep|kept|from|with)\b/i;
const FILLER = new Set([
  'we', 'have', 'has', 'got', 'about', 'around', 'roughly', 'approximately', 'some', 'big', 'large', 'small',
  'extra', 'leftover', 'leftovers', 'of', 'the', 'fresh', 'please', 'there', 'are', 'is', 'left', 'over', 'our',
  'today', 'tonight', 'full', 'half', 'i', 'us', 'my',
]);

const MEAT = /chicken|beef|pork|fish|salmon|turkey|meat|\bham\b|sausage|bacon|pepperoni|shrimp/i;
const NUTS = /\b(nuts?|almonds?|peanuts?|cashews?|walnuts?|pecans?|pistachios?|hazelnuts?|pine nuts?)\b/i;
const DAIRY = /milk|yogh?urt|cheese|butter|cream|alfredo|pizza|lasagna|latte|parmesan/i;
const EGG = /\beggs?\b/i;
const GLUTEN = /bread|bagel|pasta|flour|wheat|cake|muffin|pizza|sandwich|croissant|pastr|cookie|\bbuns?\b|noodle|lasagna|tortilla|donut|doughnut|dumpling/i;

function categorize(text: string): FoodCategory | null {
  const found = CATEGORY_PATTERNS.find(([, pattern]) => pattern.test(text));
  return found ? found[0] : null;
}

// Object.hasOwn, so words like "constructor" never match built-in object properties.
const isNumberWord = (token: string) => Object.hasOwn(NUMBER_WORDS, token);
const isUnit = (token: string) => Object.hasOwn(UNIT_ALIASES, token);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9.]/g, '').replace(/^\.+|\.+$/g, ''))
    .filter(Boolean);
}

function parseChunk(chunk: string): FoodItem | null {
  const kept = chunk.split(CUT_PATTERN)[0] ?? '';
  const tokens = tokenize(kept);
  const quantityToken = tokens.find((t) => /^\d+(\.\d+)?$/.test(t) || isNumberWord(t));
  const unitToken = tokens.find(isUnit);
  const nameTokens = tokens.filter((t) => t !== quantityToken && t !== unitToken && !FILLER.has(t) && !isNumberWord(t));
  const name = nameTokens.slice(0, 5).join(' ');
  const category = categorize(name || kept.toLowerCase());
  if (!category && !unitToken) return null;
  const quantity = quantityToken ? (isNumberWord(quantityToken) ? NUMBER_WORDS[quantityToken] : Number(quantityToken)) : 1;
  const unit = unitToken ? UNIT_ALIASES[unitToken] : 'pieces';
  const finalCategory = category ?? 'prepared';
  const perUnit = unitToken ? LBS_PER_UNIT[unit] : LBS_PER_PIECE[finalCategory];
  return {
    name: name || 'food',
    quantity,
    unit: unitToken ?? 'pieces',
    estimatedLbs: round1(Math.max(0.1, quantity * perUnit)),
    category: finalCategory,
  };
}

function detectStorage(text: string, items: FoodItem[]): Storage {
  if (/\b(hot|warm)\b/i.test(text)) return 'hot';
  const coldWords = /cold|fridge|refrigerat|chill|frozen/i.test(text);
  const perishable = items.some((i) => i.category === 'dairy' || i.category === 'protein' || i.category === 'prepared');
  return coldWords || perishable ? 'refrigerated' : 'shelf-stable';
}

function detectDietary(text: string): Dietary {
  const vegetarian = !MEAT.test(text);
  const containsDairy = DAIRY.test(text);
  return {
    vegetarian,
    vegan: vegetarian && !containsDairy && !EGG.test(text) && !/honey/i.test(text),
    containsNuts: NUTS.test(text),
    containsDairy,
    containsGluten: GLUTEN.test(text),
  };
}

/** "pick up before 9pm" -> "21:00". A bare hour like "by 9" is read as evening. */
export function parsePickupTime(text: string): string | null {
  const match =
    /\b(?:by|before|until|till)\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i.exec(text) ??
    /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/i.exec(text);
  if (!match) return null;
  const rawHours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  const meridiem = (match[3] ?? '').toLowerCase().replace(/\./g, '');
  const hours =
    meridiem === 'pm' && rawHours < 12 ? rawHours + 12
      : meridiem === 'am' && rawHours === 12 ? 0
        : meridiem === '' && rawHours >= 1 && rawHours <= 11 ? rawHours + 12
          : rawHours;
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function builtinParse(text: string): ListingDraft {
  const parsed = text.split(SPLIT_PATTERN).map(parseChunk).filter((item): item is FoodItem => item !== null);
  const items: FoodItem[] =
    parsed.length > 0
      ? parsed.slice(0, 20)
      : [{ name: text.trim().slice(0, 40) || 'food', quantity: 1, unit: 'batch', estimatedLbs: 5, category: 'prepared' }];
  return {
    items,
    storage: detectStorage(text, items),
    dietary: detectDietary(text),
    pickupBy: parsePickupTime(text),
    notes: 'Organized by the built-in parser. Double-check the amounts.',
  };
}
