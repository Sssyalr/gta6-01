// Danny "Wheels" Ortiz on foot and behind the wheel: movement, camera, car theft,
// arcade driving, punches and the pistol.
import * as THREE from 'three';
import { PLAYER_TUNE, CAR_TUNE, CITY, clamp, angleLerp, dist2 } from './config.js';
import { resolveCollisions } from './world.js';
import { buildCarMesh } from './traffic.js';

function makePlayerMesh() {
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
  const jacket = new THREE.MeshLambertMaterial({ color: 0x2e8a7a });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2e3a4a });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.9, 0.38), jacket); torso.position.y = 1.15; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8), skin); head.position.y = 1.9; g.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 10), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  cap.position.y = 2.08; g.add(cap);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.8, 0.28), pants); legL.position.set(0.17, 0.4, 0); g.add(legL);
  const legR = legL.clone(); legR.position.x = -0.17; g.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.22), jacket); armL.position.set(0.44, 1.15, 0); g.add(armL);
  const armR = armL.clone(); armR.position.x = -0.44; g.add(armR);
  g.userData.legs = [legL, legR]; g.userData.arms = [armL, armR];
  return g;
}

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.mesh = makePlayerMesh(); scene.add(this.mesh);
    this.x = 0; this.z = -30; this.yaw = 0; this.camYaw = 0; this.camPitch = 0.32;
    this.health = PLAYER_TUNE.maxHealth; this.ammo = 12; this.weapon = 'fists';
    this.onFoot = true; this.car = null; this.speed = 0; this.steer = 0;
    this.walkPhase = 0; this.hurtT = 0; this.punchT = 0; this.shootT = 0;
    this.mesh.position.set(this.x, 0, this.z);
  }
  get pos() { return this.car ? this.car.mesh.position : this.mesh.position; }
  reset(x, z) {
    this.x = x; this.z = z; this.yaw = 0; this.camYaw = 0;
    this.health = PLAYER_TUNE.maxHealth; this.onFoot = true; this.car = null; this.speed = 0;
    this.mesh.position.set(x, 0, z); this.mesh.visible = true;
  }
  // --- car theft: take the nearest car, its driver bails out ---
  stealCar(car, onSteal) {
    if (!car) return false;
    car.kind = car.kind === 'parked' ? 'stolen' : car.kind;
    car.driver = false; // you are the driver now
    // Movement heading: mesh forward is local +x, so heading = rotation.y + 90deg.
    car.heading = car.mesh.rotation.y + Math.PI / 2;
    this.car = car; this.onFoot = false; this.speed = 0;
    this.mesh.visible = false;
    if (onSteal) onSteal(car);
    return true;
  }
  exitCar() {
    if (!this.car) return;
    const c = this.car;
    const h = c.heading ?? c.mesh.rotation.y + Math.PI / 2;
    // Step out to the car's left side.
    this.x = c.mesh.position.x + Math.cos(h) * 2.6;
    this.z = c.mesh.position.z - Math.sin(h) * 2.6;
    this.yaw = h; this.camYaw = h;
    this.mesh.position.set(this.x, 0, this.z); this.mesh.visible = true;
    this.car = null; this.onFoot = true; this.speed = 0;
  }
  punch(peds, onHit) {
    if (this.punchT > 0 || !this.onFoot) return;
    this.punchT = 0.45;
    for (const p of peds) {
      if (p.state === 'down') continue;
      const d = Math.hypot(p.x - this.x, p.z - this.z);
      if (d < 2.6) {
        p.state = 'down'; p.mesh.rotation.x = -Math.PI / 2; p.mesh.position.y = 0.4;
        if (onHit) onHit(p);
        return;
      }
    }
  }
  // Hitscan pistol: ray from the camera; returns what it hit ('ped' | 'police' | null).
  shoot(camera, peds, policeCars, onShot) {
    if (this.shootT > 0 || this.ammo <= 0 || !this.onFoot) return null;
    this.shootT = 0.35; this.ammo -= 1;
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
    const o = camera.position.clone();
    let best = null, bd = 60;
    const test = (x, z, r, tag, ref) => {
      const dx = x - o.x, dz = z - o.z;
      const along = dx * dir.x + dz * dir.z;
      if (along < 0 || along > bd) return;
      const perp = Math.abs(dx * dir.z - dz * dir.x);
      if (perp < r + 0.8) { bd = along; best = { tag, ref }; }
    };
    for (const p of peds) if (p.state !== 'down') test(p.x, p.z, 0.7, 'ped', p);
    for (const c of policeCars) test(c.x, c.z, 2.2, 'police', c);
    if (onShot) onShot(best);
    return best;
  }
  update(dt, keys, colliders, traffic, onEvent) {
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.punchT = Math.max(0, this.punchT - dt);
    this.shootT = Math.max(0, this.shootT - dt);
    if (this.onFoot) this.updateFoot(dt, keys, colliders, traffic, onEvent);
    else this.updateDrive(dt, keys, colliders, traffic, onEvent);
  }
  updateFoot(dt, keys, colliders, traffic, onEvent) {
    const sprint = keys['ShiftLeft'] || keys['ShiftRight'];
    const sp = sprint ? PLAYER_TUNE.sprint : PLAYER_TUNE.walk;
    let fx = 0, fz = 0;
    const cy = this.camYaw;
    if (keys['KeyW'] || keys['ArrowUp']) { fx += Math.sin(cy); fz += Math.cos(cy); }
    if (keys['KeyS'] || keys['ArrowDown']) { fx -= Math.sin(cy); fz -= Math.cos(cy); }
    if (keys['KeyA'] || keys['ArrowLeft']) { fx += Math.cos(cy); fz -= Math.sin(cy); }
    if (keys['KeyD'] || keys['ArrowRight']) { fx += -Math.cos(cy); fz += Math.sin(cy); }
    const len = Math.hypot(fx, fz);
    if (len > 0) {
      fx /= len; fz /= len;
      this.x += fx * sp * dt; this.z += fz * sp * dt;
      this.yaw = angleLerp(this.yaw, Math.atan2(fx, fz), clamp(dt * 10, 0, 1));
      this.walkPhase += dt * sp * 1.6;
    }
    const [nx, nz] = resolveCollisions(colliders, this.x, this.z, PLAYER_TUNE.radius);
    this.x = clamp(nx, -CITY.half, CITY.half); this.z = clamp(nz, -CITY.half, CITY.half);
    // Bumping a pedestrian at a run knocks them down and counts as a crime.
    for (const p of traffic.peds) {
      if (p.state !== 'down' && dist2(this.x, this.z, p.x, p.z) < 1.1 && len > 0 && sprint) {
        p.state = 'down'; p.mesh.rotation.x = -Math.PI / 2; p.mesh.position.y = 0.4;
        if (onEvent) onEvent('hitPed', p);
      }
    }
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.yaw;
    const sw = len > 0 ? Math.sin(this.walkPhase) * 0.55 : 0;
    this.mesh.userData.legs[0].rotation.x = sw; this.mesh.userData.legs[1].rotation.x = -sw;
    this.mesh.userData.arms[0].rotation.x = this.punchT > 0.25 ? -1.4 : -sw * 0.7;
    this.mesh.userData.arms[1].rotation.x = this.punchT > 0.25 ? -1.4 : sw * 0.7;
  }
  updateDrive(dt, keys, colliders, traffic, onEvent) {
    const c = this.car;
    const maxSp = c.kind === 'sports' ? CAR_TUNE.sportsMax : c.kind === 'van' ? CAR_TUNE.vanMax : CAR_TUNE.maxSpeed;
    if (c.heading === undefined) c.heading = c.mesh.rotation.y + Math.PI / 2;
    if (keys['KeyW'] || keys['ArrowUp']) c.speed += CAR_TUNE.accel * dt;
    if (keys['KeyS'] || keys['ArrowDown']) c.speed -= (c.speed > 0.5 ? CAR_TUNE.brake : CAR_TUNE.accel * 0.6) * dt;
    if (keys['Space']) c.speed -= Math.sign(c.speed) * CAR_TUNE.brake * 1.4 * dt;
    c.speed -= c.speed * CAR_TUNE.drag * dt;
    c.speed = clamp(c.speed, -CAR_TUNE.reverseMax, maxSp);
    if (Math.abs(c.speed) < 0.05 && !keys['KeyW'] && !keys['KeyS']) c.speed = 0;
    let steer = 0;
    if (keys['KeyA'] || keys['ArrowLeft']) steer += 1;
    if (keys['KeyD'] || keys['ArrowRight']) steer -= 1;
    const steerAmt = steer * CAR_TUNE.grip * clamp(Math.abs(c.speed) / 12, 0, 1) * (keys['Space'] ? 1.5 : 1) * dt * Math.sign(c.speed || 1);
    c.heading += steerAmt;
    c.mesh.rotation.y = c.heading - Math.PI / 2;
    const h = c.heading;
    let nx = c.mesh.position.x + Math.sin(h) * c.speed * dt;
    let nz = c.mesh.position.z + Math.cos(h) * c.speed * dt;
    [nx, nz] = resolveCollisions(colliders, nx, nz, CAR_TUNE.radius);
    const hitWall = (nx !== c.mesh.position.x + Math.sin(h) * c.speed * dt) || (nz !== c.mesh.position.z + Math.cos(h) * c.speed * dt);
    if (hitWall && Math.abs(c.speed) > 8) { if (onEvent) onEvent('crash'); c.speed *= 0.4; }
    c.mesh.position.x = clamp(nx, -CITY.half, CITY.half);
    c.mesh.position.z = clamp(nz, -CITY.half, CITY.half);
    this.x = c.mesh.position.x; this.z = c.mesh.position.z;
    // Running over a pedestrian while driving.
    for (const p of traffic.peds) {
      if (p.state !== 'down' && dist2(this.x, this.z, p.x, p.z) < 2.4 && Math.abs(c.speed) > 3) {
        p.state = 'down'; p.mesh.rotation.x = -Math.PI / 2; p.mesh.position.y = 0.4;
        c.speed *= 0.85;
        if (onEvent) onEvent('hitPed', p);
      }
    }
    // Bump traffic cars: slow down, shove them a little.
    for (const o of traffic.cars) {
      const d2 = dist2(this.x, this.z, o.mesh.position.x, o.mesh.position.z);
      if (d2 < 16) {
        const d = Math.sqrt(d2) || 0.01;
        const push = (4 - d) * 0.5;
        o.along += (o.mesh.position.x - this.x) / d * push * (o.axis === 'x' ? 1 : 0) + (o.mesh.position.z - this.z) / d * push * (o.axis === 'z' ? 1 : 0) * 0;
        o.speed = Math.max(0, o.speed - 4 * dt);
        if (Math.abs(c.speed) > 6) { c.speed *= 0.92; if (onEvent) onEvent('bump'); }
      }
    }
  }
  damage(n) {
    if (this.hurtT > 0) return;
    this.hurtT = 0.8; this.health = Math.max(0, this.health - n);
  }
}
export { buildCarMesh };
