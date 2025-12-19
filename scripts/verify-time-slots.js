
import { generateTimeSlots, mergeDataIntoSlots } from '../lib/time-slots.js';

// Mock DB Data
const now = new Date();
const mockData24h = [
  // Current time match
  { timestamp: now.toISOString(), temperature: 25.5, humidity: 60 },
  // 2 hours ago match
  { timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), temperature: 24.0, humidity: 55 },
  // Way out of range (should be ignored or merged if within tolerance of oldest slot?)
  // Oldest slot is 23h ago.
  { timestamp: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString(), temperature: 20.0, humidity: 50 },
];

console.log("Testing 24h Range...");
const slots24h = generateTimeSlots('24h');
console.log(`Generated ${slots24h.length} slots for 24h.`);

const merged24h = mergeDataIntoSlots(slots24h, mockData24h, '24h');
// Check recent slot
const lastSlot = merged24h[merged24h.length - 1]; // Closest to now (index 0 is oldest? No, generateTimeSlots loops 23 down to 0, push. So 0 is oldest, 23 is newest.)
// Wait, loop: for (let i = 23; i >= 0; i--) { push( subHours(now, i) ) }
// i=23: now - 23h. Pushed first.
// i=0: now. Pushed last.
// So array is Oldest -> Newest.

const newestSlot = merged24h[merged24h.length - 1];
const oldestSlot = merged24h[0];

console.log("Newest Slot (Should have data):", newestSlot.time, newestSlot.temperature);
console.log("Oldest Slot (Should be null or data if matched):", oldestSlot.time, oldestSlot.temperature);

// Verify data merging
if (newestSlot.temperature === 25.5) {
  console.log("PASS: Newest slot matched correctly.");
} else {
  console.log("FAIL: Newest slot did not match. Got:", newestSlot.temperature);
}

// Verify gap
const middleSlot = merged24h[10]; // 13 hours ago roughly. Should be null.
if (middleSlot.temperature === null) {
  console.log("PASS: Middle slot (gap) is null.");
} else {
  console.log("FAIL: Middle slot is not null. Got:", middleSlot.temperature);
}

console.log("\nTesting 7d Range...");
const slots7d = generateTimeSlots('7d');
console.log(`Generated ${slots7d.length} slots for 7d.`);
// 7d: i = 41 down to 0. 42 slots.
// i=41 -> -164 hours (~7 days).
// i=0 -> now.

console.log("\nTesting 30d Range...");
const slots30d = generateTimeSlots('30d');
console.log(`Generated ${slots30d.length} slots for 30d.`);

console.log("\nDone.");
