# SecondServe: 3-minute pitch

## Before judging starts

- In the `secondserve` folder, run `npm run dev` and open http://localhost:3000. Scroll back to the top.
- Check that the **Motion** button in the top bar says **full**. This laptop asks for less motion, so the page starts in calm mode until you switch it.
- Post one test listing to check that the AI works on the venue Wi-Fi. If the post is marked "Read without AI", the backup reader took over, and the demo still works.
- Record a 60-second backup video in case anything fails.

## The script

**0:00 Hook (20 seconds), on the top of the page**

"In 2024, 29% of America's food supply went unsold or uneaten. That same year, 47.9 million Americans lived in households that couldn't always afford enough food. The food and the people are often a few miles apart."

**0:20 The story (40 seconds).** Scroll slowly through the four scenes.

- "It's closing time at a bakery with 30 pounds of good bread left."
- "They type one sentence, and SecondServe fills in what a food bank needs: how much, how to keep it, allergens, and the pickup time."
- "It matches the bread to a youth center that asked for bread and is still open, and a volunteer drives it over."
- "That's 25 meals instead of the dumpster."

**1:00 The live evening (50 seconds).** Press **Play the evening** at 4×.

- "Here's a whole Saturday evening. Each red pin is a business with extra food, each green pin is a food bank, and the yellow pins are volunteer drivers on real roads."
- Click a ticket. "Every match explains itself: distance, room, what they asked for. Look who was ruled out and why: no fridge, can't take hot meals, a nut-free program."
- "California's SB 1383 already requires big grocery stores, distributors and large restaurants to arrange for their extra edible food to be recovered and to keep records. That's this button: Donation records."

**1:50 Your city and the AI (40 seconds).**

- Type a judge's city into **Try it in your own town**. "It works anywhere. The demo moves onto real streets in your city."
- Press **Share extra food**, choose **Wedding leftovers**, then **Read it for me**. "A caterer types like they'd text a friend. AI turns it into a real listing, and a second check catches allergens the AI might miss." Press **Share it**.

**2:30 Close (30 seconds)**

"Next: real accounts, text alerts for drivers, and combining pickups into one trip. SecondServe turns 'we have leftovers' into dinner on someone's table before closing time."

## Questions judges might ask

**Is the data real?**
The businesses, food banks and drivers are made-up sample data, and the page says so. The statistics, the law, the map, the streets, the routes and the AI are real, and every number links to its source at the bottom of the page.

**What if the AI gets it wrong?**
- Every AI answer is checked against a strict format.
- A keyword check runs alongside it for allergens and meat, and if either one flags something, the warning stays.
- The business can edit the weights and times before posting.
- If the AI is down, a built-in reader takes over.

**How is food kept safe?**
The USDA says perishable food shouldn't be out of refrigeration for more than 2 hours, or 1 hour above 90°F. Our own stricter rule requires a cooler for any perishable trip over 30 minutes.

**Are businesses protected if they donate?**
Yes. The federal Bill Emerson Good Samaritan Food Donation Act protects people who donate apparently wholesome food in good faith to a nonprofit, except in cases of gross negligence or intentional misconduct. A 2023 update extended this to businesses that give food directly to people in need for free.

**How does matching work?**
- First, hard rules: fridge, hot food, vegetarian only, nut-free, room left, and opening hours.
- Then a score out of 100: distance 35, room 25, whether they asked for that food 25, time before closing 15.
- A driver who can make the pickup deadline is chosen, and long perishable trips need a cooler.

**What did you build, and what did you use?**
- **Used:** Next.js, Leaflet with OpenStreetMap, OSRM for routes, Nominatim for place search, and an AI model on Azure.
- **Built:** the matching engine, driver choice, the simulation, predictions, the any-city feature, the scroll story with its speed limiter, the donation-records export, and 68 tests.
- I used an AI coding assistant to help write the code.

**Who pays for it?**
Businesses covered by SB 1383 already have to arrange food recovery and keep records, so they'd pay for the coordination and the records. Food banks use it for free.
