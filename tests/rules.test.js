import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BINS,
  KNOWN_ITEMS,
  getGuidance,
  pickPrimary,
  updateStreak,
  emptyTally,
  addToTally,
} from '../src/rules.js';

const box = [0, 0, 10, 10];

test('food scraps go to compost', () => {
  for (const item of ['banana', 'apple', 'orange', 'pizza', 'sandwich']) {
    assert.equal(getGuidance(item).bin, 'compost', item);
  }
});

test('bottles go to recycling', () => {
  assert.equal(getGuidance('bottle').bin, 'recycle');
});

test('electronics are e-waste, never a curbside bin', () => {
  for (const item of ['cell phone', 'laptop', 'remote', 'keyboard', 'mouse']) {
    assert.equal(getGuidance(item).bin, 'ewaste', item);
  }
});

test('drinking glasses are not sent to recycling', () => {
  assert.notEqual(getGuidance('wine glass').bin, 'recycle');
});

test('cups depend on their material', () => {
  assert.equal(getGuidance('cup').bin, 'check');
});

test('people, animals and vehicles are not treated as waste', () => {
  for (const label of ['person', 'dog', 'car', 'traffic light']) {
    assert.equal(getGuidance(label), null, label);
  }
});

test('unknown and prototype labels return null', () => {
  assert.equal(getGuidance('spaceship'), null);
  assert.equal(getGuidance('constructor'), null);
  assert.equal(getGuidance('toString'), null);
});

test('every known item maps to a real bin with a reason and a tip', () => {
  assert.ok(KNOWN_ITEMS.length > 30);
  for (const item of KNOWN_ITEMS) {
    const guidance = getGuidance(item);
    assert.ok(BINS[guidance.bin], `${item} -> ${guidance.bin}`);
    assert.ok(guidance.reason.length > 0, `${item} reason`);
    assert.ok(guidance.tip.length > 0, `${item} tip`);
  }
});

test('pickPrimary returns the highest-scoring waste item', () => {
  const detections = [
    { class: 'person', score: 0.99, bbox: box },
    { class: 'cup', score: 0.6, bbox: box },
    { class: 'bottle', score: 0.82, bbox: box },
  ];
  assert.equal(pickPrimary(detections, 0.5).class, 'bottle');
});

test('pickPrimary ignores low-confidence detections', () => {
  assert.equal(pickPrimary([{ class: 'bottle', score: 0.3, bbox: box }], 0.5), null);
});

test('pickPrimary handles an empty frame', () => {
  assert.equal(pickPrimary([], 0.5), null);
});

test('updateStreak counts consecutive frames of the same item', () => {
  const first = updateStreak(null, 'bottle');
  const second = updateStreak(first, 'bottle');
  assert.deepEqual(second, { label: 'bottle', count: 2 });
});

test('updateStreak restarts when the item changes or leaves the frame', () => {
  const changed = updateStreak({ label: 'bottle', count: 4 }, 'banana');
  assert.deepEqual(changed, { label: 'banana', count: 1 });
  assert.deepEqual(updateStreak(changed, null), { label: null, count: 0 });
});

test('updateStreak does not mutate the previous state', () => {
  const previous = Object.freeze({ label: 'bottle', count: 1 });
  assert.deepEqual(updateStreak(previous, 'bottle'), { label: 'bottle', count: 2 });
  assert.equal(previous.count, 1);
});

test('emptyTally has a zero for every bin', () => {
  const tally = emptyTally();
  assert.deepEqual(Object.keys(tally).sort(), Object.keys(BINS).sort());
  assert.ok(Object.values(tally).every((count) => count === 0));
});

test('addToTally returns a new tally and leaves the old one alone', () => {
  const before = emptyTally();
  const after = addToTally(before, 'compost');
  assert.equal(after.compost, 1);
  assert.equal(before.compost, 0);
});

test('addToTally rejects unknown bins', () => {
  assert.throws(() => addToTally(emptyTally(), 'space'), /Unknown bin/);
});
