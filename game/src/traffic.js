// Traffic cars (lane driving, turning at intersections, stopping for cars ahead),
// parked stealable cars, and pedestrians who walk the sidewalks and flee when scared.
import * as THREE from 'three';
import { ROADS, CITY, mulberry32, clamp, dist2 } from './config.js';
import { resolveCollisions } from './world.js';

const CAR_COLORS = [0xd84a4a, 0x4a7fd8, 0xe8c84a, 0xeeeeee, 0x2e2e34, 0x7fc4a0, 0xd88a2e, 0x8a6fd8];

export function buildCarMesh(color, kind) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1a2733 });
  const len = kind === 'van' ? 5.6 : 4.4, wid = kind === 'van' ? 2.2 : 1.9;
  const body = new THREE.Mesh(new THREE.BoxGeometry(len, 0.85, wid), bodyMat);
  body.position.y = 0.75; g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(len * 0.5, 0.75, wid * 0.88), kind === 'van' ? bodyMat : glassMat);
  cab.position.set(kind === 'van' ? 0.3 : -0.2, 1.5, 0); g.add(cab);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  for (const [wx, wz] of [[1.45, 0.95], [1.45, -0.95], [-1.45, 0.95], [-1.45, -0.95]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.x = Math.PI / 2; w.position.set(wx, 0.42, wz); g.add(w);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const wz of [-0.6, 0.6]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 0.4), lightMat);
    h.position.set(len / 2 + 0.02, 0.8, wz); g.add(h);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const wz of [-0.6, 0.6]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 0.4), tailMat);
    t.position.set(-len / 2 - 0.02, 0.8, wz); g.add(t);
  }
  if (kind === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 1.1), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    bar.position.set(-0.2, 1.98, -0.25); g.add(bar);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 1.1), new THREE.MeshBasicMaterial({ color: 0x2040ff }));
    bar2.position.set(-0.2, 1.98, 0.25); g.add(bar2);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(len + 0.02, 0.3, wid + 0.02), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    stripe.position.y = 0.75; g.add(stripe);
  }
  if (kind === 'sports') {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 1.8), bodyMat);
    sp.position.set(-2.1, 1.35, 0); g.add(sp);
  }
  g.userData.len = len;
  return g;
}

function makePedMesh(shirt) {
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
  const shirtM = new THREE.MeshLambertMaterial({ color: shirt });
  const pantsM = new THREE.MeshLambertMaterial({ color: 0x2e3a4a });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.85, 0.36), shirtM); torso.position.y = 1.15; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), skin); head.position.y = 1.85; g.add(head);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.26), pantsM); legL.position.set(0.16, 0.38, 0); g.add(legL);
  const legR = legL.clone(); legR.position.x = -0.16; g.add(legR);
  g.userData.legs = [legL, legR];
  return g;
}

export class Traffic {
  constructor(scene, colliders) {
    this.scene = scene; this.colliders = colliders;
    this.rnd = mulberry32(99173);
    this.cars = []; this.peds = []; this.parked = [];
    const colors = CAR_COLORS;
    for (let i = 0; i < 11; i++) this.cars.push(this.spawnTrafficCar(colors[i % colors.length]));
    // Parked cars along roads (stealable).
    const spots = [[-52, -8.5], [48, 8.5], [-8.5, 102], [102, -8.5], [-102, 8.5], [8.5, -52], [148, 58], [-148, -58]];
    for (let i = 0; i < spots.length; i++) {
      const [x, z] = spots[i];
      const mesh = buildCarMesh(colors[(i + 2) % colors.length], 'sedan');
      mesh.position.set(x, 0, z); mesh.rotation.y = Math.abs(x) > Math.abs(z) ? Math.PI / 2 : 0;
      scene.add(mesh);
      this.parked.push({ mesh, x, z, heading: mesh.rotation.y, speed: 0, kind: 'parked', driver: true, color: colors[(i + 2) % colors.length] });
    }
    const shirts = [0xe8e8e8, 0x4a7fd8, 0xd84a8a, 0x7fc46a, 0xe8a84a, 0x9a6fd8];
    for (let i = 0; i < 14; i++) {
      const mesh = makePedMesh(shirts[i % shirts.length]);
      const p = { mesh, x: (this.rnd() * 2 - 1) * 140, z: (this.rnd() * 2 - 1) * 140, heading: this.rnd() * Math.PI * 2, speed: 1.4, state: 'walk', fleeT: 0, tx: 0, tz: 0, phase: this.rnd() * 6 };
      this.pickTarget(p); mesh.position.set(p.x, 0, p.z); scene.add(mesh); this.peds.push(p);
    }
  }
  spawnTrafficCar(color) {
    const mesh = buildCarMesh(color, 'sedan');
    const axis = this.rnd() < 0.5 ? 'x' : 'z';
    const road = ROADS[Math.floor(this.rnd() * ROADS.length)];
    const dir = this.rnd() < 0.5 ? 1 : -1;
    const car = { mesh, axis, road, dir, along: (this.rnd() * 2 - 1) * 160, speed: 0, targetSpeed: 9 + this.rnd() * 4, kind: 'traffic', driver: true };
    this.scene.add(mesh); this.syncCarMesh(car); return car;
  }
  syncCarMesh(car) {
    const lane = car.dir * 2.4;
    if (car.axis === 'x') { car.mesh.position.set(car.along, 0, car.road + lane); car.mesh.rotation.y = car.dir > 0 ? 0 : Math.PI; }
    else { car.mesh.position.set(car.road - lane, 0, car.along); car.mesh.rotation.y = car.dir > 0 ? -Math.PI / 2 : Math.PI / 2; }
  }
  pickTarget(p) {
    const r = ROADS[Math.floor(this.rnd() * ROADS.length)];
    if (this.rnd() < 0.5) { p.tx = (this.rnd() * 2 - 1) * 160; p.tz = r + (this.rnd() < 0.5 ? 8.5 : -8.5); }
    else { p.tx = r + (this.rnd() < 0.5 ? 8.5 : -8.5); p.tz = (this.rnd() * 2 - 1) * 160; }
  }
  scare(x, z, radius) {
    for (const p of this.peds) {
      if (p.state === 'down') continue;
      if (dist2(p.x, p.z, x, z) < radius * radius) { p.state = 'flee'; p.fleeT = 3; p.heading = Math.atan2(p.x - x, p.z - z); }
    }
  }
  nearestStealable(x, z, maxD) {
    let best = null, bd = maxD * maxD;
    for (const c of [...this.parked, ...this.cars]) {
      if (!c.driver && c.kind === 'parked') continue;
      const cx = c.mesh.position.x, cz = c.mesh.position.z;
      const d = dist2(x, z, cx, cz);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  update(dt, playerPos, playerCar) {
    // Traffic cars: drive, turn at intersections, stop for the car ahead.
    for (const c of this.cars) {
      let want = c.targetSpeed;
      for (const o of this.cars) {
        if (o === c || o.axis !== c.axis || o.road !== c.road || o.dir !== c.dir) continue;
        const gap = (o.along - c.along) * c.dir;
        if (gap > 0 && gap < 11) { want = 0; break; }
      }
      if (playerCar && playerCar !== c) {
        const px = playerCar.mesh.position.x, pz = playerCar.mesh.position.z;
        const cx = c.mesh.position.x, cz = c.mesh.position.z;
        if (dist2(px, pz, cx, cz) < 100) {
          const ahead = c.axis === 'x' ? (px - cx) * c.dir : (pz - cz) * c.dir;
          if (ahead > 0 && ahead < 9) want = 0;
        }
      }
      c.speed += clamp(want - c.speed, -14 * dt, 8 * dt);
      c.along += c.speed * c.dir * dt;
      // Turn at an intersection sometimes; U-turn at the city edge.
      const nearInt = ROADS.some((r) => Math.abs(c.along - r) < 1.2);
      if (nearInt && this.rnd() < dt * 0.5) {
        const cross = ROADS.reduce((a, b) => (Math.abs(b - c.along) < Math.abs(a - c.along) ? b : a));
        const oldRoad = c.road;
        c.road = cross; c.along = oldRoad; c.axis = c.axis === 'x' ? 'z' : 'x'; c.dir = this.rnd() < 0.5 ? 1 : -1;
      }
      if (Math.abs(c.along) > CITY.roadHalf) { c.dir *= -1; c.along = Math.sign(c.along) * CITY.roadHalf; }
      this.syncCarMesh(c);
    }
    // Pedestrians: stroll to targets, flee when scared, legs swing.
    for (const p of this.peds) {
      if (p.state === 'down') continue;
      let sp = p.speed;
      if (p.state === 'flee') { sp = 5.5; p.fleeT -= dt; if (p.fleeT <= 0) p.state = 'walk'; }
      else {
        const dx = p.tx - p.x, dz = p.tz - p.z, d = Math.hypot(dx, dz);
        if (d < 2) this.pickTarget(p);
        else p.heading = Math.atan2(dx, dz);
      }
      p.x += Math.sin(p.heading) * sp * dt; p.z += Math.cos(p.heading) * sp * dt;
      p.x = clamp(p.x, -CITY.half, CITY.half); p.z = clamp(p.z, -CITY.half, CITY.half);
      const [nx, nz] = resolveCollisions(this.colliders, p.x, p.z, 0.6);
      p.x = nx; p.z = nz;
      p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.heading;
      p.phase += dt * sp * 3;
      p.mesh.userData.legs[0].rotation.x = Math.sin(p.phase) * 0.5;
      p.mesh.userData.legs[1].rotation.x = -Math.sin(p.phase) * 0.5;
    }
  }
}
