# SecondServe: 3-minute pitch

## Before judging starts

- Run `npm run dev` in the `secondserve` folder and open http://localhost:3000. Press **Reset** so the clock is at 5:30 PM.
- Set speed to **4×**.
- Check that the venue Wi-Fi works: post one listing with AI. If it says "Built-in parser", the AI couldn't be reached, and the demo still works.
- Record a 60-second backup video of the demo in case anything fails.

## The script

**0:00 Hook (20 seconds)**
"Right now, as businesses close for the night, good food is going in the trash a few miles from a shelter that needs it. California even requires big grocery stores and restaurants to donate it. That's a law called SB 1383. So why does it still get thrown out? Because nobody coordinates the details."

**0:20 The problem (25 seconds)**
"A youth center with no fridge can't take yogurt. A vegetarian kitchen can't take chicken. Hot food has to move fast. And someone has to drive it there before the program closes. A simple 'post your leftovers' board doesn't solve any of that."

**0:45 Demo, part 1: watch an evening (45 seconds)**
Press **Run the evening**.
- "Each pin is a business with surplus. Watch: the bakery posts 30 pounds of bread, and SecondServe instantly matches it to the youth center that asked for bakery items. It assigns Ana, a volunteer, and she drives the real road route."
- Click a listing. "Every match explains itself: distance, room left, what they asked for. And look who was ruled out and why: no fridge for cold food, can't take hot meals, nut-free program."
- Point at the impact numbers. "We count pounds actually delivered, meals, and even food we couldn't place. Honest numbers."

**1:30 Demo, part 2: post with AI (40 seconds)**
Press **+ Post surplus**, pick **Ridgeline Catering**, press **Try: Event leftovers**, then **Organize with AI**.
- "A caterer just types like they'd text a friend. AI turns it into a real listing: items, pounds, that it's hot, that it's vegetarian, the pickup deadline."
- Press **Post and find a match**. "Matched in under a second, to a shelter that takes hot meals, with a driver who can get it there fast enough to stay food-safe."

**2:10 Predictions and compliance (25 seconds)**
- Point at **Likely surplus tonight**. "SecondServe learns patterns. This bakery has had surplus 8 of the last 8 Saturdays, so food programs can get a heads-up before it's even posted."
- Press **Export SB 1383 log**. "And businesses get the record log the law requires, automatically."

**2:35 Close (25 seconds)**
"Next: real accounts, text alerts for drivers, and batching several pickups into one run. SecondServe turns 'we have leftovers' into food on someone's plate before closing time."

## Questions judges might ask

**Is the data real?**
The businesses and food programs are fictional sample data, and the screen says so. The law, the 1.2 pounds per meal figure, the AI and the road routes are real.

**What does the AI do, and what if it's wrong?**
It turns a free-text description into a structured listing. Every AI answer is checked against a strict format before it's used, the business can edit the weights and times before posting, and if the AI is down, a built-in parser takes over.

**How does matching work?**
Hard rules first: fridge, hot food, vegetarian-only, nut-free, capacity, opening hours. Then a score out of 100: distance 35, room left 25, whether they asked for that food 25, time before closing 15. A driver is chosen who can make the pickup deadline, and perishable trips over 30 minutes need a cooler.

**How are predictions made?**
For each business and weekday: how many of the last 8 weeks had a listing, plus the typical time and amount. It's simple and explainable on purpose, and it's labeled as an estimate.

**What did you build vs. use?**
I used Next.js, Leaflet maps, OpenStreetMap and OSRM for routes, and an AI model on Azure. I built the matching engine, driver assignment, simulation, predictions, compliance export, the dashboard, and 47 tests. I used an AI coding assistant to help write the code.

**Who pays for it?**
Businesses covered by SB 1383 already have to arrange food recovery and keep records, so they'd pay for the coordination and compliance log. Food programs use it free.
