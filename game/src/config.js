// SOLMAR HEAT — every tuning number, the city layout and the story in one place.
export const SAVE_KEY = 'solmar-heat.save.v1';
export const DEBT = 50000;
export const CITY = { half: 190, roadHalf: 175 };
export const ROADS = [-150, -100, -50, 0, 50, 100, 150];
export const ROAD_W = 11;
export const LANDMARKS = {
  garage: { x: -138, z: -138, name: 'Garage' },
  safehouse: { x: 138, z: 138, name: 'Safehouse' },
  docks: { x: 168, z: -20, name: 'Docks' },
  crewPickup: { x: -20, z: 118, name: 'Crew pickup' },
  beach: { x: 0, z: 178, name: 'Solmar Beach' },
};
export const PLAYER_TUNE = { walk: 6, sprint: 10.5, accel: 40, radius: 0.9, maxHealth: 100 };
export const CAR_TUNE = {
  accel: 26, brake: 42, reverseMax: 13, drag: 0.55, grip: 2.6,
  maxSpeed: 40, sportsMax: 50, vanMax: 32, policeMax: 46, radius: 2.1,
};
export const WANTED_TUNE = { decayQuiet: 25, decayStep: 8, bustFootDist: 3.2, bustFootTime: 2, bustCarDist: 4.5, bustCarTime: 3 };
export const MISSIONS = [
  { id: 1, title: 'Hot Wheels', reward: 8000, intro: 'Lena: "A red Comet GT is parked by the marina. Take it. Don\'t scratch it — the buyer pays for clean."', objective: 'Steal the red sports car' },
  { id: 2, title: 'The Getaway', reward: 12000, intro: 'Lena: "My crew is waiting at the north lot. Pick them up, then lose the cops and get to the safehouse."', objective: 'Pick up Lena\'s crew' },
  { id: 3, title: 'Cash Run', reward: 10000, intro: 'Lena: "Five cash drops are stashed around Solmar. Grab them all before the timer runs out."', objective: 'Collect the cash drops (0/5)' },
  { id: 4, title: 'The Big Score', reward: 20000, intro: 'Lena: "One last job. The armored van at the bank — take it, shake the heat, and bring it to the docks. Then you\'re free."', objective: 'Steal the armored van' },
];
export const DROP_SPOTS = [[-120, 60], [80, -120], [120, 40], [-60, -140], [20, 160]];
export const CREW_SPOTS = [[-24, 114], [-16, 120], [-24, 122]];
export const PALETTE = {
  sky: 0x87bfe8, fog: 0xa8c8e0, sun: 0xffe0b0, ground: 0x8f9a86, road: 0x33373d,
  sidewalk: 0xb9b3a4, sand: 0xe8d29a, water: 0x2e7f9e, building: [0xe8a0a8, 0x7fc4c9, 0xf2d492, 0xf5efe0, 0xd98a6a, 0x9ac48f, 0xc9a7d8],
};
export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
// Deterministic RNG (mulberry32) so staged screenshots repeat.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function dist2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }
export function angleLerp(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
