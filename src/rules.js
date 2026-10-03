// Sorting rules: maps COCO-SSD object labels to the bin each item belongs in.
// Guidance follows general California practice (SB 1383 organics, e-waste law).
// Cities differ, so the app always tells people to check their local hauler.

export const BINS = Object.freeze({
  recycle: { id: 'recycle', label: 'Recycling', icon: '♻️', color: '#2563eb' },
  compost: { id: 'compost', label: 'Compost', icon: '🌱', color: '#16a34a' },
  landfill: { id: 'landfill', label: 'Trash', icon: '🗑️', color: '#64748b' },
  ewaste: { id: 'ewaste', label: 'E-waste drop-off', icon: '🔋', color: '#dc2626' },
  donate: { id: 'donate', label: 'Donate or reuse', icon: '🎁', color: '#9333ea' },
  check: { id: 'check', label: 'Depends: check it', icon: '🔎', color: '#d97706' },
});

const FOOD = {
  bin: 'compost',
  reason:
    'Food scraps go in the green bin. California law (SB 1383) keeps them out of landfills, where rotting food releases methane.',
  tip: 'Still good and untouched? Share it instead of tossing it.',
};

const ELECTRONICS = {
  bin: 'ewaste',
  reason:
    'California treats most electronics as hazardous waste, so they never go in a curbside bin. Batteries inside can start fires in garbage trucks.',
  tip: 'Take it to an e-waste drop-off or a store take-back program.',
};

const SMALL_APPLIANCE = {
  bin: 'ewaste',
  reason: 'Small appliances do not go in curbside bins. Their cords tangle the machines at recycling plants.',
  tip: 'Take it to an e-waste or scrap-metal drop-off. Still works? Donate it.',
};

const LARGE_APPLIANCE = {
  bin: 'ewaste',
  reason: 'Large appliances need a special pickup. Fridges also contain refrigerants that harm the climate if released.',
  tip: 'Book an appliance pickup with your waste hauler.',
};

const UTENSIL = {
  bin: 'landfill',
  reason: 'Plastic utensils are too small for recycling machines to sort, so they end up as trash.',
  tip: 'Metal? Wash it and keep it. Next time, skip the plastic ones.',
};

const REUSABLE = {
  bin: 'donate',
  reason: 'This still has life left. Donating it keeps it out of the landfill.',
  tip: 'Broken beyond repair? Then it goes in the trash.',
};

const BULKY = {
  bin: 'donate',
  reason: 'Too big for any bin.',
  tip: 'Donate it, or book a bulky-item pickup with your waste hauler.',
};

const GUIDANCE = Object.freeze({
  bottle: {
    bin: 'recycle',
    reason: 'Plastic, glass and aluminum bottles are recyclable.',
    tip: 'Empty it first, so leftover liquid does not soak the paper in the bin. Marked "CA Cash Refund"? Return it for money.',
  },
  'wine glass': {
    bin: 'landfill',
    reason: 'Drinking glass melts at a different temperature than bottle glass, so recyclers reject it.',
    tip: 'Donate it if it is intact. Wrap broken glass before you trash it.',
  },
  cup: {
    bin: 'check',
    reason: 'It depends on what the cup is made of.',
    tip: 'Clean plastic cup: recycling. Paper coffee cups usually have a plastic lining, so most cities say trash.',
  },
  bowl: {
    bin: 'check',
    reason: 'It depends on what the bowl is made of.',
    tip: 'Paper or fiber bowl: compost, if your hauler takes food-soiled paper. Rinsed plastic: recycling. Ceramic: donate or trash.',
  },
  fork: UTENSIL,
  knife: UTENSIL,
  spoon: UTENSIL,
  toothbrush: {
    bin: 'landfill',
    reason: 'Mixed plastic and nylon bristles cannot be recycled curbside.',
    tip: 'Some brands run free mail-back recycling programs.',
  },
  umbrella: {
    bin: 'landfill',
    reason: 'Umbrellas mix metal and fabric that recycling machines cannot separate.',
    tip: 'Still works? Donate it instead.',
  },
  banana: FOOD,
  apple: FOOD,
  orange: FOOD,
  broccoli: FOOD,
  carrot: FOOD,
  sandwich: FOOD,
  'hot dog': FOOD,
  pizza: FOOD,
  donut: FOOD,
  cake: FOOD,
  'potted plant': {
    bin: 'compost',
    reason: 'Dead leaves and stems go in the green bin.',
    tip: 'Most haulers do not take the pot or potting soil. Reuse the soil in your garden and the pot for a new plant.',
  },
  'cell phone': ELECTRONICS,
  laptop: ELECTRONICS,
  keyboard: ELECTRONICS,
  mouse: ELECTRONICS,
  remote: ELECTRONICS,
  tv: ELECTRONICS,
  'hair drier': SMALL_APPLIANCE,
  microwave: ELECTRONICS,
  toaster: SMALL_APPLIANCE,
  clock: {
    bin: 'ewaste',
    reason: 'Battery-powered clocks count as electronics.',
    tip: 'Pop the batteries out and take them to a battery drop-off.',
  },
  refrigerator: LARGE_APPLIANCE,
  oven: LARGE_APPLIANCE,
  book: {
    bin: 'donate',
    reason: 'Books can be read again.',
    tip: 'Give it to a library or a Little Free Library. Worn-out paperbacks can go in recycling.',
  },
  'teddy bear': REUSABLE,
  backpack: REUSABLE,
  handbag: REUSABLE,
  suitcase: REUSABLE,
  tie: REUSABLE,
  vase: REUSABLE,
  scissors: REUSABLE,
  'sports ball': REUSABLE,
  frisbee: REUSABLE,
  skateboard: REUSABLE,
  'tennis racket': REUSABLE,
  'baseball bat': REUSABLE,
  'baseball glove': REUSABLE,
  skis: REUSABLE,
  snowboard: REUSABLE,
  surfboard: REUSABLE,
  kite: REUSABLE,
  chair: BULKY,
  couch: BULKY,
  bed: BULKY,
  'dining table': BULKY,
  bench: BULKY,
});

export const KNOWN_ITEMS = Object.freeze(Object.keys(GUIDANCE));

/** Returns { item, bin, reason, tip } for a detected label, or null if it is not waste. */
export function getGuidance(label) {
  if (typeof label !== 'string' || !Object.hasOwn(GUIDANCE, label)) {
    return null;
  }
  return { item: label, ...GUIDANCE[label] };
}

/** Picks the most confident detection that is a sortable item, or null. */
export function pickPrimary(detections, minScore) {
  return detections
    .filter((detection) => detection.score >= minScore && getGuidance(detection.class) !== null)
    .reduce((best, detection) => (best === null || detection.score > best.score ? detection : best), null);
}

/** Tracks how many frames in a row the same item has been seen, to stop flicker. */
export function updateStreak(previous, label) {
  if (!label) {
    return { label: null, count: 0 };
  }
  if (previous && previous.label === label) {
    return { label, count: previous.count + 1 };
  }
  return { label, count: 1 };
}

export function emptyTally() {
  return Object.fromEntries(Object.keys(BINS).map((binId) => [binId, 0]));
}

export function addToTally(tally, binId) {
  if (!Object.hasOwn(BINS, binId)) {
    throw new Error(`Unknown bin: ${binId}`);
  }
  return { ...tally, [binId]: (tally[binId] ?? 0) + 1 };
}
