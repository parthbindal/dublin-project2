# SecondServe

**Surplus food from local businesses, matched to food programs and volunteer drivers before closing time.**

Built in one day at Dublin HacX 2026 in San Ramon, California.

## The problem

Every evening, bakeries, grocery stores, restaurants and cafeterias have good food left over. Nearby food pantries, shelters and youth programs need it. But they rarely connect in time, because nobody is coordinating the details:

- **Will it fit?** A youth center with no fridge can't take yogurt. A vegetarian kitchen can't take chicken. A nut-free program can't take pesto.
- **Can someone get it there?** Hot or cold food has to travel quickly, ideally in a cooler, and the program has to still be open when it arrives.
- **Is anyone keeping records?** California's SB 1383 law requires large grocery stores and food distributors (since 2022) and large restaurants, hotels and other food businesses (since 2024) to donate edible food they would otherwise throw away. They also have to keep records of who received it, what types of food, and how many pounds per month.

A simple "post your leftovers" board doesn't solve this. SecondServe handles the coordination.

## What it does

1. **Post surplus in plain words.** A business types something like *"2 trays of chicken alfredo that need to stay cold and a box of bananas, pick up before 9"*. AI turns it into a structured listing with items, estimated pounds, storage needs, allergens and a pickup deadline. A built-in parser takes over if the AI is unavailable, so posting always works.
2. **Match it to the right food program.** Every program is scored on distance, room left today, whether it asked for that kind of food, and how much time is left before it closes. Hard rules rule programs out: no fridge for cold food, no hot meals, vegetarian-only, nut-free, closed or full. **Every match shows its reasons, and every rejection says why.**
3. **Plan the pickup.** SecondServe picks a free volunteer driver with enough room. Perishable trips longer than 30 minutes require a driver with a cooler. The map shows the driver's real road route and moves the driver along it.
4. **Track the outcome.** It counts pounds delivered, estimated meals (1.2 lbs = 1 meal, Feeding America's measure), food on the road, and food that *couldn't* be placed in time, because honest numbers matter more than sign-up counts. One click exports an **SB 1383 record log** (CSV) for donors.
5. **Predict surplus before it's posted.** From past listings, SecondServe learns patterns, such as "Golden Crust Bakery usually has about 37 lbs of bread around 5:50 PM on Saturdays (seen 8 of the last 8)", so programs can get a heads-up. These are labeled as estimates, not promises.

## Try the demo

Press **Run the evening** to play a sample Saturday night in the Tri-Valley. Listings appear, get matched, and drivers move across the map. Then press **+ Post surplus** to post your own food with AI.

All businesses, food programs and volunteers in the demo are **fictional sample data**.

## How it works

| Piece | Where | What it does |
| --- | --- | --- |
| Matching engine | `src/lib/matching.ts` | Scores each program (distance 35, capacity 25, need 25, time 15), applies hard rules, picks a driver, explains every decision |
| Evening simulation | `src/lib/simulation.ts` | State machine: posted → matched → picked up → delivered, or expired. Never mutates state |
| AI listing parser | `src/lib/azure.ts`, `src/app/api/parse/route.ts` | Sends the description to an AI model on Azure AI Foundry (DeepSeek), then validates the JSON reply with Zod |
| Built-in parser | `src/lib/parseListing.ts` | No-AI backup that reads quantities, units, food types, allergens and pickup times |
| Predictions | `src/lib/prediction.ts` | Weeks seen ÷ weeks tracked for each business and weekday, plus the typical time and amount |
| Impact and SB 1383 log | `src/lib/impact.ts` | Totals, meals, and a CSV export that guards against spreadsheet formula injection |
| Map | `src/components/MapView.tsx` | Leaflet + OpenStreetMap, road routes from OSRM, falling back to straight lines when offline |

The AI key stays on the server and is never sent to the browser. Tech: Next.js 16, React 19, TypeScript, Tailwind CSS, Leaflet, Zod and Vitest (47 tests).

## Run it yourself

```bash
cd secondserve
npm install
```

Create `secondserve/.env.local` (it's git-ignored, so never commit it):

```
AZURE_AI_ENDPOINT=https://<your-resource>.services.ai.azure.com/openai/v1/chat/completions
AZURE_AI_KEY=<your key>
AZURE_AI_MODEL=<your deployment name>
```

Then:

```bash
npm run dev     # http://localhost:3000
npm test        # 47 unit tests
```

Without `.env.local` everything still works; listings are organized by the built-in parser instead of AI.

## Limits and what's next

- Real accounts for businesses, food programs and drivers, with SMS alerts in place of the on-screen heads-up.
- Smarter routing that batches several pickups into one driver run.
- Food-safety sign-off at pickup (temperature check, time packed) to support liability protection for donors.
- Learning predictions from real listing history instead of sample patterns.

## Sources

- CalRecycle, SB 1383 organic waste and edible food recovery: https://calrecycle.ca.gov/organics/slcp/
- Feeding America, how they count meals (1.2 lbs of food = 1 meal): https://www.feedingamerica.org/ways-to-give/faq/about-our-claims

## Credits

Built by [@parthbindal](https://github.com/parthbindal) at Dublin HacX 2026, with help from Claude Code (an AI coding assistant). Map data © OpenStreetMap contributors. Routes by OSRM.
