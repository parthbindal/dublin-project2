# Binsight: 3-minute pitch

## Before judging starts

- Laptop charged, volume up (the app talks).
- Open the live site, plus the local copy (`python -m http.server 8080`) as a backup.
- Props on the table: a water bottle, a banana or food from dinner, a phone, a paper cup.
- A backup demo video saved on the desktop, in case the Wi-Fi or camera fails.
- Press "Start camera" once beforehand so the browser has already asked for camera permission.
- Load the page once at the venue before going up, so the AI model is already downloaded.
- If an item isn't recognized, try `?model=full` at the end of the address. It's slower but sometimes more accurate.

## The script

**0:00 Hook (20 seconds).** Hold up a paper coffee cup.
"Quick: recycling, compost or trash? Most people say recycling. In most cities it's trash, because paper coffee cups have a plastic lining. Sorting is confusing, and the mistakes matter."

**0:20 The problem (30 seconds).**
"California's SB 1383 law says food scraps have to go in the green bin, because food rotting in landfills makes methane. And phones in the trash are dangerous: the EPA counted 245 fires at waste facilities caused or likely caused by lithium batteries between 2013 and 2020. Nobody reads their city's recycling guide while standing at the bin."

**0:50 Live demo (80 seconds).** Press "Start camera".
1. Water bottle: "Recycling, and it tells me to empty it first."
2. Banana: "Compost."
3. Phone: "E-waste drop-off. Never in a bin, because of the battery."
4. Paper cup: "Depends. It doesn't pretend to know what it can't see, so it explains how to check."
5. Tap "I sorted it" and point to the impact counter.
6. "You can try it on your own phone right now." Show the link.

**2:10 How it works (30 seconds).**
"An object-detection model called COCO-SSD runs right in the browser using TensorFlow.js. There's no server, so camera images never leave the device. It has to see the same item four frames in a row before it answers, so it doesn't flicker. Then my rules engine maps 55 kinds of objects to six answers, each with a reason and a tip, and the rules have unit tests."

**2:40 What's next (20 seconds).**
"Next, I'd train a trash-specific model so it can tell plastic from paper, load each city's rules by ZIP code, and put it on a screen above school cafeteria bins with a class leaderboard."

## Questions judges might ask

**How accurate is it?**
It works well on common items like bottles, fruit, phones and laptops. It's a general model, so it can't see materials. That's why "Depends" exists, and photo mode tells you when it isn't sure.

**Why not just ask ChatGPT?**
Binsight is instant, free, works with a live camera, and is private: no photos get uploaded.

**What did you build, and what did you use?**
I used TensorFlow.js and the pretrained COCO-SSD model. I built the app around it: the camera pipeline, the stability filter, the rules engine for 55 object types, the voice and impact tracker, and the tests. I used an AI coding assistant to help write the code.

**Who would use this?**
Families at home, school cafeterias, and cities and waste haulers, who already spend money on recycling education and could offer this as a tool.
