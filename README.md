# ♻️ Binsight

**Point your camera at trash. Binsight tells you which bin it goes in, and why.**

Built in one day at Dublin HacX 2026 in San Ramon, California.

**Try it:** https://parthbindal.github.io/dublin-project2/ (works on phones; allow camera access)

## The problem

Sorting trash is confusing, and getting it wrong has real costs.

- **Food in the trash makes methane.** California's SB 1383 law requires food scraps to go in the green bin. The state's goal is a 75% cut in organic waste sent to landfills by 2025, compared with 2014.
- **Batteries in the trash start fires.** The U.S. EPA found 245 fires at 64 waste facilities between 2013 and 2020 that were caused or likely caused by lithium-ion batteries from things like phones and laptops. The EPA says the real number is probably higher.
- **Lots of "recyclable-looking" things aren't.** Drinking glasses, plastic forks and most paper coffee cups don't belong in the recycling bin.

Nobody reads their city's recycling guide while standing at the bin holding a banana peel. People need an answer in two seconds.

## What it does

- **Live camera:** hold up an item, and Binsight draws a box around it, shows the bin and says it out loud.
- **Six answers:** Recycling, Compost, Trash, E-waste drop-off, Donate or reuse, and "Depends" for items like cups where the material matters. Instead of guessing, "Depends" explains how to check.
- **A reason and a tip with every answer**, such as "Empty it first. Leftover liquid soaks the paper in the recycling bin."
- **Photo upload** as a backup, which says honestly when it isn't sure.
- **Impact tracker** that counts how many items you've sorted, by bin.
- **Private by design:** the AI runs inside your browser, so camera images are never uploaded anywhere.

## How it works

```
camera frame ─► COCO-SSD model (TensorFlow.js, runs in the browser) ─► object names + boxes
                                                                         │
              stability filter: same item in 4 frames in a row  ◄────────┘
                                   │
                    rules engine (src/rules.js) ─► bin + reason + tip ─► screen + voice
```

- **Object detection:** the COCO-SSD model running on TensorFlow.js. It recognizes 80 kinds of everyday objects. Binsight uses the "lite" version by default because in our tests it was 2 to 8 times faster per frame and did better on webcam-style frames. Add `?model=full` to the address to try the larger version.
- **Rules engine:** `src/rules.js` maps 55 of those object types to a bin using general California guidance. It's written as small pure functions with unit tests.
- **Stability filter:** an item has to appear in 4 frames in a row before Binsight announces it, so the answer doesn't flicker.
- **No server, no build step, no API keys:** just HTML, CSS and JavaScript.

## Run it yourself

```bash
git clone https://github.com/parthbindal/dublin-project2.git
cd dublin-project2
python -m http.server 8080
```

Then open http://localhost:8080. The camera only works on `localhost` or an `https://` site. The first load needs internet to download the AI model.

Run the tests (needs Node.js 22 or newer):

```bash
npm test
```

## Limits and what's next

- **It sees objects, not materials.** The model can't tell a plastic cup from a paper one, which is why the "Depends" answer exists. Next step: train a trash-specific model on the TACO dataset, which has photos of litter labelled by material.
- **Rules differ by city.** Next step: enter a ZIP code to load your own city's rules.
- **School mode:** a screen above the cafeteria bins with a leaderboard for each class.

## Sources

- CalRecycle, SB 1383 organic waste rules: https://calrecycle.ca.gov/organics/slcp/
- U.S. EPA, *An Analysis of Lithium-ion Battery Fires in Waste Management and Recycling* (2021): https://www.epa.gov/recycle/used-lithium-ion-batteries

## Credits

Built by [@parthbindal](https://github.com/parthbindal) at Dublin HacX 2026, with help from Claude Code (an AI coding assistant). Object detection by TensorFlow.js and the COCO-SSD model (Apache 2.0 license).
