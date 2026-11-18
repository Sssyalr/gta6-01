// Wanted level (0–5 stars) and the police cars that chase you, ram you, and bust you.
import * as THREE from 'three';
import { ROADS, CITY, WANTED_TUNE, clamp, dist2, angleLerp } from './config.js';
import { buildCarMesh } from './traffic.js';
import { resolveCollisions } from './world.js';

export class Police {
  constructor(scene, colliders, sound) {
    this.scene = scene; this.colliders = colliders; this.sound = sound;
    this.level = 0; this.quietT = 0; this.decayT = 0; this.bustT = 0;
    this.cars = []; this.rnd = Math.random;
  }
  addWanted(n, reason) {
    if (n <= 0) return;
    this.level = clamp(this.level + n, 0, 5);
    this.quietT = 0; this.decayT = 0;
    if (this.level > 0) this.sound.setSiren(true);
    return reason;
  }
  clearWanted() { this.level = 0; this.bustT = 0; this.sound.setSiren(false); this.removeAll(); }
  removeAll() { for (const c of this.cars) this.scene.remove(c.mesh); this.cars = []; }
  spawnNear(px, pz) {
    const mesh = buildCarMesh(0xf2f2f2, 'police');
    const road = ROADS[Math.floor(Math.random() * ROADS.length)];
    const axis = Math.random() < 0.5 ? 'x' : 'z';
    const car = { mesh, x: 0, z: 0, heading: 0, speed: 0, kind: 'police', driver: true };
    if (axis === 'x') { car.x = px + (Math.random() < 0.5 ? -50 : 50); car.z = road; }
    else { car.x = road; car.z = pz + (Math.random() < 0.5 ? -50 : 50); }
    car.x = clamp(car.x, -CITY.half, CITY.half); car.z = clamp(car.z, -CITY.half, CITY.half);
    mesh.position.set(car.x, 0, car.z); this.scene.add(mesh); this.cars.push(car);
    return car;
  }
  update(dt, player, playerCar, onBusted) {
    const px = player.x, pz = player.z;
    // Decay: stay clean and out of sight and the heat cools off.
    if (this.level > 0) {
      this.quietT += dt;
      const nearest = this.cars.reduce((m, c) => Math.min(m, Math.hypot(c.x - px, c.z - pz)), 1e9);
      if (this.quietT > WANTED_TUNE.decayQuiet && nearest > 35) {
        this.decayT += dt;
        if (this.decayT > WANTED_TUNE.decayStep) { this.level -= 1; this.decayT = 0; this.quietT = 0; if (this.level === 0) this.sound.setSiren(false); }
      } else this.decayT = 0;
    }
    const want = this.level > 0 ? Math.min(this.level + 1, 5) : 0;
    while (this.cars.length < want) this.spawnNear(px, pz);
    while (this.cars.length > want) { const c = this.cars.pop(); this.scene.remove(c.mesh); }
    let busted = false;
    for (const c of this.cars) {
      const d = Math.hypot(c.x - px, c.z - pz);
      const maxSp = 30 + this.level * 3;
      const targetHeading = Math.atan2(px - c.x, pz - c.z);
      c.heading = angleLerp(c.heading, targetHeading, clamp(dt * 2.2, 0, 1));
      // Ram: speed up when lined up, ease off when very close so it pushes instead of orbiting.
      const wantSp = d > 6 ? maxSp : maxSp * 0.4;
      c.speed += clamp(wantSp - c.speed, -30 * dt, 18 * dt);
      c.x += Math.sin(c.heading) * c.speed * dt;
      c.z += Math.cos(c.heading) * c.speed * dt;
      const [nx, nz] = resolveCollisions(this.colliders, c.x, c.z, 2.1);
      c.x = nx; c.z = nz;
      c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading - Math.PI / 2;
      // Ram the player's car: shove it and shake the camera (handled by caller via return).
      if (playerCar && d < 4.6) {
        playerCar.speed *= 0.985;
        playerCar.mesh.position.x += Math.sin(c.heading) * 2.4 * dt;
        playerCar.mesh.position.z += Math.cos(c.heading) * 2.4 * dt;
      }
      // Busted: a cop reaches you on foot, or boxes your stopped car in.
      const close = playerCar ? d < WANTED_TUNE.bustCarDist && Math.abs(playerCar.speed) < 1.5 : d < WANTED_TUNE.bustFootDist;
      if (close) { this.bustT += dt; if (this.bustT > (playerCar ? WANTED_TUNE.bustCarTime : WANTED_TUNE.bustFootTime)) busted = true; }
    }
    if (this.cars.length === 0) this.bustT = 0; else if (!this.cars.some((c) => Math.hypot(c.x - px, c.z - pz) < 6)) this.bustT = Math.max(0, this.bustT - dt);
    if (busted) onBusted();
  }
  // Minimap dots.
  dots() { return this.cars.map((c) => ({ x: c.x, z: c.z })); }
}
