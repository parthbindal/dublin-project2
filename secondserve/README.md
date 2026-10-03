# SecondServe

**Good food deserves a second serving.** SecondServe takes extra food from local businesses and gets it to food banks and shelters, with volunteer drivers, before closing time.

Built in one day at Dublin HacX 2026 in San Ramon, California.

## The problem

- In 2024, 29% of the U.S. food supply went unsold or uneaten ([ReFED](https://refed.org/food-waste/the-problem/)).
- In 2024, 47.9 million people in the U.S. lived in food-insecure households, meaning they couldn't always afford enough food ([USDA ERS](https://ers.usda.gov/publications/113622)).
- California's SB 1383 now requires large food businesses to act ([CalRecycle](https://calrecycle.ca.gov/organics/slcp/foodrecovery/donors/)):
  - **Tier 1, since January 1, 2022:** supermarkets with $2 million or more in yearly sales, grocery stores of 10,000 square feet or more, food service providers, food distributors and wholesale food vendors.
  - **Tier 2, since January 1, 2024:** restaurants with 250 or more seats or 5,000 square feet or more, hotels with on-site food facilities and 200 or more rooms, health facilities with on-site food facilities and 100 or more beds, large venues and events, state agency cafeterias above the same size limits, and schools with on-site food facilities.
  - **What they must do:** arrange to recover the maximum amount of edible food they would otherwise throw away, through a written agreement with a food recovery organization.
  - **What they must keep records of:** each partner's name, address and contact information, the types of food, how often it is collected, and how many pounds are recovered each month.

The hard part is coordination. A youth center with no fridge can't take yogurt. A vegetarian kitchen can't take chicken. Hot food has to move fast, and somebody has to drive it there before the program closes.

## What it does

1. **Share extra food in plain words.** A business types something like "2 trays of chicken alfredo that need to stay cold, pick up before 9". AI turns that into a listing with items, estimated pounds, how to keep the food, allergens and a pickup time.
   - A keyword check runs alongside the AI. If either one spots an allergen or meat, the warning stays.
   - If the AI is unavailable, a built-in reader takes over, so posting always works.
2. **Find the right home for it.** Every food program gets a score out of 100:

   | What it measures | Points |
   | --- | ---: |
   | Distance | 35 |
   | Room left today | 25 |
   | Whether it asked for that kind of food | 25 |
   | Time before closing | 15 |

   - Hard rules rule a program out completely: no fridge for cold food, no hot meals, vegetarian only, nut-free, full, or closed.
   - Every match shows its reasons, and every rejection says why.
3. **Plan the pickup.** SecondServe picks a free volunteer driver with enough room.
   - Our own rule: perishable trips longer than 30 minutes need a cooler. That keeps deliveries well inside the USDA's limit of 2 hours out of refrigeration (1 hour above 90°F) ([USDA FSIS](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/danger-zone-40f-140f)).
4. **Count what matters.** It counts pounds delivered, meals (Feeding America counts about 1.2 pounds of food as one meal, [source](https://www.feedingamerica.org/ways-to-give/faq/about-our-claims)), food on the road, and food that didn't make it in time. A one-click spreadsheet of donation records covers the per-donation details SB 1383 asks for.
5. **Predict extra food.** From past posts, SecondServe learns patterns like "Golden Crust usually has about 37 lbs of bread around 5:50 PM on Saturdays (8 of the last 8)", so food banks can get ready. These are labeled as predictions, not promises.
6. **Works anywhere, with your own business.** Search any city or address, or use your location, and the demo network moves there onto real streets. In "Share extra food", choose "Add your own business", type its name and address, and it joins the evening and gets matched like any other.

## Try the demo

- **The top of the page:** a scroll-driven story follows one bakery's bread from closing time to the dinner table.
- **The live evening:** press **Play the evening**, or **Share extra food** to post your own.

All businesses, food programs and volunteers are **made-up sample data**. The map, streets, road routes and AI are real.

## How it's built

| Piece | Where |
| --- | --- |
| Matching engine and driver choice | `src/lib/matching.ts` |
| Evening simulation (posted → matched → picked up → delivered) | `src/lib/simulation.ts` |
| AI reader (Azure AI Foundry) with a strict format check and allergen double-check | `src/lib/azure.ts`, `src/app/api/parse/route.ts`, `src/lib/parseListing.ts` |
| Predictions | `src/lib/prediction.ts` |
| Impact numbers and the donation-records spreadsheet | `src/lib/impact.ts` |
| Moving the demo to any city, place search, road snapping | `src/lib/relocate.ts`, `src/lib/places.ts` |
| Scroll story | `src/components/ScrollStory.tsx` |

- **How the scroll story moves:** each frame it eases toward your scroll position, but a **speed limiter** caps it at 0.85 of the story per second, so a hard fling glides instead of jumping.
- **Why it stays fast:** it only changes a few CSS values, one SVG transform and two text labels per frame, and it stops itself once it catches up.
- **Motion setting:** follows the device's "reduce motion" setting by default, and the **Motion** button switches between full and calm.
- **Free map services, used within their rules:** OpenStreetMap tiles, Nominatim place search and OSRM routes.
  - Requests are queued at no more than 1 per second.
  - Searches are remembered so they aren't repeated.
  - There is no search-as-you-type.
- **Security:** the AI key stays on the server and is never sent to the browser.
- **Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Leaflet, Zod and Vitest (68 tests).

## Run it yourself

```bash
cd secondserve
npm install
```

Create `secondserve/.env.local`. It's git-ignored, so it is never committed.

```
AZURE_AI_ENDPOINT=https://<your-resource>.services.ai.azure.com/openai/v1/chat/completions
AZURE_AI_KEY=<your key>
AZURE_AI_MODEL=<your deployment name>
```

Then:

```bash
npm run dev     # http://localhost:3000
npm test        # 68 unit tests
```

Without `.env.local` everything still works, and posts are read by the built-in reader instead of AI.

## A note on donor protection

The federal Bill Emerson Good Samaritan Food Donation Act protects people who donate apparently wholesome food in good faith to a nonprofit. It covers both civil and criminal liability, except for gross negligence or intentional misconduct ([42 U.S.C. 1791](https://www.law.cornell.edu/uscode/text/42/1791)).

A 2023 update extended this protection to:

- businesses, including grocers, restaurants, caterers and schools, that give food directly to people in need for free;
- food passed on at a low "Good Samaritan reduced price" that only covers costs.

## What's next

- Real accounts for businesses, food banks and drivers, with text alerts.
- Combining several pickups into one driver trip.
- A quick food-safety check at pickup (temperature and time packed).
- Learning predictions from real post history.

## Credits

Built by [@parthbindal](https://github.com/parthbindal) at Dublin HacX 2026, with help from Claude Code (an AI coding assistant). Map data © OpenStreetMap contributors. Place search by Nominatim. Routes by OSRM.
