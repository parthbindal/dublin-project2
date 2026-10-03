import { describe, expect, it } from 'vitest';
import { builtinParse, extractJsonObject, parseModelReply, parsePickupTime } from './parseListing';

// A real reply from the Azure DeepSeek model during testing.
const REAL_REPLY =
  '{"items":[{"name":"bagels","quantity":30,"unit":"pieces","estimatedLbs":9,"category":"bakery"},' +
  '{"name":"chicken alfredo pasta","quantity":2,"unit":"trays","estimatedLbs":20,"category":"prepared"},' +
  '{"name":"bananas","quantity":1,"unit":"box","estimatedLbs":25,"category":"produce"}],"storage":"refrigerated",' +
  '"dietary":{"vegetarian":false,"vegan":false,"containsNuts":false,"containsDairy":true,"containsGluten":true},' +
  '"pickupBy":"21:00","notes":"Chicken alfredo pasta trays need to stay cold."}';

const SAMPLE_TEXT =
  'we have about 30 bagels, 2 big trays of chicken alfredo pasta that need to stay cold, and a box of bananas. pick up before 9pm please';

describe('extractJsonObject', () => {
  it('strips stray model tokens like <|OPENAI|>', () => {
    expect(extractJsonObject('{"ok":<|OPENAI|>true}')).toEqual({ ok: true });
  });

  it('finds JSON inside a code fence or prose', () => {
    expect(extractJsonObject('Here you go:\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('returns null when there is no JSON', () => {
    expect(extractJsonObject('sorry, I cannot help')).toBeNull();
  });
});

describe('parseModelReply', () => {
  it('accepts a real model reply', () => {
    const draft = parseModelReply(REAL_REPLY);
    expect(draft?.items).toHaveLength(3);
    expect(draft?.pickupBy).toBe('21:00');
    expect(draft?.storage).toBe('refrigerated');
  });

  it('rejects replies with an unknown food category', () => {
    expect(parseModelReply(REAL_REPLY.replace('"produce"', '"spaceship"'))).toBeNull();
  });

  it('fixes contradictions: food with dairy is never vegan', () => {
    const draft = parseModelReply(REAL_REPLY.replace('"vegan":false', '"vegan":true'));
    expect(draft?.dietary.vegan).toBe(false);
  });

  it('drops an invalid pickup time instead of failing', () => {
    expect(parseModelReply(REAL_REPLY.replace('"21:00"', '"tonight"'))?.pickupBy).toBeNull();
  });
});

describe('builtinParse', () => {
  const draft = builtinParse(SAMPLE_TEXT);

  it('finds each food item with a sensible weight', () => {
    expect(draft.items.map((i) => i.name)).toEqual(['bagels', 'chicken alfredo pasta', 'bananas']);
    expect(draft.items[0]).toMatchObject({ quantity: 30, category: 'bakery', estimatedLbs: 9 });
    expect(draft.items[1]).toMatchObject({ quantity: 2, unit: 'trays', category: 'prepared', estimatedLbs: 20 });
    expect(draft.items[2]).toMatchObject({ quantity: 1, unit: 'box', category: 'produce' });
  });

  it('works out storage, dietary flags and the pickup time', () => {
    expect(draft.storage).toBe('refrigerated');
    expect(draft.dietary).toMatchObject({ vegetarian: false, containsDairy: true, containsGluten: true, containsNuts: false });
    expect(draft.pickupBy).toBe('21:00');
  });

  it('spots hot food and does not mistake donuts for nuts', () => {
    const donuts = builtinParse('a dozen donuts, still warm');
    expect(donuts.storage).toBe('hot');
    expect(donuts.dietary.containsNuts).toBe(false);
    expect(donuts.items[0]).toMatchObject({ name: 'donuts', category: 'bakery', unit: 'dozen' });
  });

  it('flags nuts mentioned anywhere in the description', () => {
    const sandwiches = builtinParse('18 pesto sandwiches with pine nuts');
    expect(sandwiches.dietary.containsNuts).toBe(true);
    expect(sandwiches.items[0].name).toBe('pesto sandwiches');
  });

  it('never returns an empty listing', () => {
    expect(builtinParse('asdf qwerty').items).toHaveLength(1);
  });
});

describe('parsePickupTime', () => {
  it('reads common ways people write a time', () => {
    expect(parsePickupTime('pick up by 9')).toBe('21:00');
    expect(parsePickupTime('before 7:30pm')).toBe('19:30');
    expect(parsePickupTime('until 11am')).toBe('11:00');
    expect(parsePickupTime('whenever works')).toBeNull();
  });
});
