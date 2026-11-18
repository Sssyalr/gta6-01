// Story missions: four jobs that pay off Danny's $50,000 debt to Vincent Marlow.
// Each mission is a short stage list; the manager moves a beacon to the current target.
import * as THREE from 'three';
import { MISSIONS, LANDMARKS, DROP_SPOTS, CREW_SPOTS, DEBT, dist2 } from './config.js';
import { buildCarMesh } from './traffic.js';

function beaconMesh(color) {
  const g = new THREE.Group();
  const cyl = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 26, 16, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
  );
  cyl.position.y = 13; g.add(cyl);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.2, 2.2, 24), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.25; g.add(ring);
  const dia = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), new THREE.MeshBasicMaterial({ color }));
  dia.position.y = 3.4; g.add(dia);
  g.userData.dia = dia;
  return g;
}
function cashDropMesh(scene, x, z) {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.8), new THREE.MeshLambertMaterial({ color: 0x1f8a4a }));
  box.position.y = 0.5; g.add(box);
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.2, 0.85), new THREE.MeshBasicMaterial({ color: 0xf2c94c }));
  band.position.y = 0.55; g.add(band);
  g.position.set(x, 0, z); scene.add(g);
  return g;
}

export class MissionManager {
  constructor(scene, traffic) {
    this.scene = scene; this.traffic = traffic;
    this.index = 0; this.stage = 0; this.active = false; this.done = false;
    this.timer = 0; this.collected = 0; this.crewLeft = 0;
    this.target = null; this.targetCar = null; this.drops = []; this.crew = [];
    this.beacon = beaconMesh(0xf2c94c); this.beacon.visible = false; scene.add(this.beacon);
    this.onEvent = null; // (type, payload) -> main.js
  }
  get mission() { return MISSIONS[this.index]; }
  get objective() {
    if (this.done) return 'Debt paid — Solmar is yours.';
    if (!this.active) return 'Press Enter to start: ' + this.mission.title;
    const m = this.mission;
    if (m.id === 1) return ['Steal the red sports car', 'Deliver it to the garage'][this.stage];
    if (m.id === 2) return ['Pick up Lena\'s crew (' + (3 - this.crewLeft) + '/3)', 'Lose the cops — reach the safehouse'][this.stage];
    if (m.id === 3) return 'Collect the cash drops (' + this.collected + '/5)';
    return ['Steal the armored van', 'Shake the heat — deliver it to the docks'][this.stage];
  }
  startMission(i) {
    this.index = i; this.stage = 0; this.active = true; this.done = false;
    this.timer = this.mission.id === 3 ? 150 : 0; this.collected = 0; this.crewLeft = 3;
    this.clearProps();
    const m = this.mission;
    if (m.id === 1) {
      const mesh = buildCarMesh(0xd81f2a, 'sports');
      mesh.position.set(-52, 0, 148); mesh.rotation.y = Math.PI / 2; this.scene.add(mesh);
      this.targetCar = { mesh, kind: 'sports', driver: false, speed: 0, heading: Math.PI / 2 };
      this.target = { x: -52, z: 148 };
    } else if (m.id === 2) {
      this.target = { x: LANDMARKS.crewPickup.x, z: LANDMARKS.crewPickup.z };
      for (const [x, z] of CREW_SPOTS) {
        const ped = { mesh: null, x, z, state: 'wait', heading: 0 };
        const mesh = new THREE.Group();
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.85, 0.36), new THREE.MeshLambertMaterial({ color: 0xf2c94c }));
        torso.position.y = 1.15; mesh.add(torso);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshLambertMaterial({ color: 0xd9a066 }));
        head.position.y = 1.85; mesh.add(head);
        mesh.position.set(x, 0, z); this.scene.add(mesh); ped.mesh = mesh; this.crew.push(ped);
      }
    } else if (m.id === 3) {
      this.target = { x: DROP_SPOTS[0][0], z: DROP_SPOTS[0][1] };
      for (const [x, z] of DROP_SPOTS) this.drops.push({ mesh: cashDropMesh(this.scene, x, z), x, z, taken: false });
    } else {
      const mesh = buildCarMesh(0x5a6a72, 'van');
      mesh.position.set(48, 0, -102); mesh.rotation.y = 0; this.scene.add(mesh);
      this.targetCar = { mesh, kind: 'van', driver: false, speed: 0, heading: 0 };
      this.target = { x: 48, z: -102 };
    }
    this.moveBeacon();
    if (this.onEvent) this.onEvent('missionStart', m);
  }
  clearProps() {
    if (this.targetCar) { this.scene.remove(this.targetCar.mesh); this.targetCar = null; }
    for (const d of this.drops) this.scene.remove(d.mesh); this.drops = [];
    for (const c of this.crew) this.scene.remove(c.mesh); this.crew = [];
  }
  moveBeacon() {
    if (!this.target) { this.beacon.visible = false; return; }
    this.beacon.visible = true;
    this.beacon.position.set(this.target.x, 0, this.target.z);
  }
  completeMission(cash, player) {
    const m = this.mission;
    const total = cash + m.reward;
    // If Danny is still sitting in the mission vehicle, step him out before it is collected.
    if (player && this.targetCar && player.car === this.targetCar) player.exitCar();
    this.active = false; this.beacon.visible = false; this.clearProps();
    const isLast = this.index >= MISSIONS.length - 1;
    if (!isLast) { this.index += 1; this.stage = 0; }
    if (this.onEvent) this.onEvent('missionComplete', { mission: m, total });
    if (isLast) { this.done = true; if (this.onEvent) this.onEvent('gameWin', { total }); return total; }
    return total;
  }
  update(dt, player, police) {
    if (!this.active || this.done) return;
    this.beacon.userData.dia.rotation.y += dt * 2;
    this.beacon.userData.dia.position.y = 3.4 + Math.sin(performance.now() / 300) * 0.4;
    const m = this.mission, px = player.x, pz = player.z;
    const near = (x, z, r) => dist2(px, pz, x, z) < r * r;
    if (m.id === 1) {
      if (this.stage === 0 && this.targetCar && !player.onFoot && player.car === this.targetCar) { this.stage = 1; this.target = { x: LANDMARKS.garage.x, z: LANDMARKS.garage.z }; this.moveBeacon(); if (this.onEvent) this.onEvent('stage', 'Now deliver it to the garage.'); }
      else if (this.stage === 1 && near(LANDMARKS.garage.x, LANDMARKS.garage.z, 9)) { this.completeMission(this.cashRef(), player); }
    } else if (m.id === 2) {
      if (this.stage === 0) {
        for (const c of this.crew) if (c.state === 'wait' && near(c.x, c.z, 3.5)) { c.state = 'in'; this.scene.remove(c.mesh); this.crewLeft -= 1; if (this.onEvent) this.onEvent('stage', 'Crew member picked up (' + (3 - this.crewLeft) + '/3).'); }
        if (this.crewLeft === 0) { this.stage = 1; this.target = { x: LANDMARKS.safehouse.x, z: LANDMARKS.safehouse.z }; this.moveBeacon(); police.addWanted(2, 'getaway'); if (this.onEvent) this.onEvent('stage', 'The cops are onto you — reach the safehouse!'); }
      } else if (near(LANDMARKS.safehouse.x, LANDMARKS.safehouse.z, 9)) { police.clearWanted(); this.completeMission(this.cashRef(), player); }
    } else if (m.id === 3) {
      this.timer -= dt;
      if (this.timer <= 0) { if (this.onEvent) this.onEvent('missionFail', 'Time ran out.'); return; }
      let next = null;
      for (const d of this.drops) {
        if (!d.taken && near(d.x, d.z, 3.2)) { d.taken = true; this.scene.remove(d.mesh); this.collected += 1; if (this.onEvent) this.onEvent('pickup', 'Cash drop collected (' + this.collected + '/5).'); }
        if (!d.taken && !next) next = d;
      }
      if (this.collected >= 5) { this.completeMission(this.cashRef(), player); return; }
      if (next) { this.target = { x: next.x, z: next.z }; this.moveBeacon(); }
    } else if (m.id === 4) {
      if (this.stage === 0 && this.targetCar && !player.onFoot && player.car === this.targetCar) {
        this.stage = 1; this.target = { x: LANDMARKS.docks.x, z: LANDMARKS.docks.z }; this.moveBeacon();
        police.addWanted(3, 'van heist'); if (this.onEvent) this.onEvent('stage', 'Three stars! Get the van to the docks!');
      } else if (this.stage === 1 && near(LANDMARKS.docks.x, LANDMARKS.docks.z, 10)) { police.clearWanted(); this.completeMission(this.cashRef(), player); }
    }
  }
  cashRef() { return this._cash || 0; }
  setCash(v) { this._cash = v; }
}
