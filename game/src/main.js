// SOLMAR HEAT — boot, game loop, screens, input, camera, and wiring between systems.
// ?shot=start|play|wanted|mission stages a scene for screenshots (see shots.js).
// ?seed=N fixes the world seed. window.__game exposes state for play-testing.
import * as THREE from 'three';
import { DEBT, MISSIONS, CITY, PALETTE } from './config.js';
import { buildWorld } from './world.js';
import { Traffic } from './traffic.js';
import { Police } from './police.js';
import { Player } from './player.js';
import { MissionManager } from './missions.js';
import { HUD } from './hud.js';
import { SoundEngine } from './audio.js';
import { saveGame, loadGame, clearSave } from './save.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number.parseInt(params.get('seed') ?? '', 10) || 20261118;

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.sky);
scene.fog = new THREE.Fog(PALETTE.fog, 180, 520);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(0, 8, -48);

const sun = new THREE.DirectionalLight(PALETTE.sun, 2.4);
sun.position.set(120, 180, -80); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -220, right: 220, top: 220, bottom: -220, far: 600 });
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x8a7a5a, 1.1));

const { colliders } = buildWorld(scene);
const sound = new SoundEngine();
const hud = new HUD();
const player = new Player(scene);
const traffic = new Traffic(scene, colliders);
const police = new Police(scene, colliders, sound);
const missions = new MissionManager(scene, traffic);

const S = {
  screen: 'title', // title | play | paused | failed | win | intro
  cash: 0, completed: [], missionIndex: 0, time: 0,
  keys: {}, mouseDown: false, pointerLocked: false, camInit: false,
  shake: 0, introFor: 0, failedReason: '',
};
missions.onEvent = (type, payload) => {
  if (type === 'missionStart') { hud.hideIntro(); S.screen = 'play'; hud.showBanner('MISSION ' + payload.id + ': ' + payload.title); sound.click(); }
  else if (type === 'stage') hud.showBanner(payload);
  else if (type === 'pickup') { hud.showBanner(payload); sound.pickup(); }
  else if (type === 'missionComplete') {
    S.cash = payload.total; S.completed.push(payload.mission.id); S.missionIndex = missions.index;
    sound.missionDone(); hud.showBanner('JOB DONE! +$' + payload.mission.reward.toLocaleString(), 3400);
    autosave();
    if (payload.mission.id < MISSIONS.length) startMission(S.missionIndex);
  } else if (type === 'gameWin') {
    S.cash = payload.total; S.screen = 'win'; hud.hideIntro();
    hud.setWin('All four jobs done. $' + payload.total.toLocaleString() + ' earned — the $' + DEBT.toLocaleString() + ' debt to Vincent Marlow is paid. Danny walks free in Solmar Bay.');
    hud.showScreen('win'); sound.missionDone(); autosave();
  } else if (type === 'missionFail') failMission(payload);
};
function autosave() {
  saveGame({ cash: S.cash, missionIndex: S.missionIndex, completed: S.completed, x: player.x, z: player.z, health: player.health, ammo: player.ammo });
}
function failMission(reason) {
  if (S.screen !== 'play') return;
  S.screen = 'failed'; S.failedReason = reason;
  hud.setFailed(reason + '  The mission failed — retry it.');
  hud.showScreen('failed'); sound.fail(); police.clearWanted();
}
function startMission(i) {
  S.missionIndex = i;
  missions.setCash(S.cash);
  hud.showIntro(MISSIONS[i], () => missions.startMission(i));
  S.screen = 'intro';
}
function newGame() {
  S.cash = 0; S.completed = []; S.missionIndex = 0; S.time = 0; S.camSnap = true;
  player.reset(0, -30); player.health = 100; player.ammo = 12;
  police.clearWanted(); missions.index = 0; missions.active = false; missions.done = false;
  hud.hideScreens(); document.getElementById('hud').style.display = 'block';
  startMission(0);
}
function continueGame() {
  const d = loadGame();
  if (!d) { newGame(); return; }
  S.cash = d.cash; S.completed = d.completed || []; S.missionIndex = d.missionIndex || 0;
  player.reset(d.x ?? 0, d.z ?? -30); player.health = d.health ?? 100; player.ammo = d.ammo ?? 12;
  police.clearWanted();
  hud.hideScreens(); document.getElementById('hud').style.display = 'block';
  startMission(S.missionIndex);
}
function quitToTitle() {
  S.screen = 'title'; police.clearWanted(); missions.active = false; missions.beacon.visible = false;
  document.getElementById('hud').style.display = 'none'; hud.showScreen('menu');
  document.getElementById('btn-continue').style.display = loadGame() ? '' : 'none';
}

// --- Input ---
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  S.keys[e.code] = true;
  if (e.code === 'Escape' && S.screen === 'play') { S.screen = 'paused'; hud.showScreen('pause'); document.exitPointerLock?.(); }
  else if (e.code === 'Enter' && (S.screen === 'title')) newGame();
  else if (e.code === 'Enter' && S.screen === 'play' && !missions.active && !missions.done) startMission(S.missionIndex);
  else if (e.code === 'Enter' && S.screen === 'intro') { hud.hideIntro(); missions.startMission(S.missionIndex); }
  else if (e.code === 'KeyM' && S.screen === 'play') { autosave(); hud.showBanner('Progress saved.'); }
  else if (e.code === 'KeyQ' && S.screen === 'play' && player.onFoot) {
    player.weapon = player.weapon === 'fists' ? 'pistol' : 'fists';
    hud.showBanner(player.weapon === 'pistol' ? 'Pistol out — click to shoot' : 'Fists — click to punch');
  } else if (e.code === 'KeyE' && S.screen === 'play') {
    if (player.onFoot) {
      // The mission car takes priority when you are standing next to it.
      const tc = missions.targetCar;
      const nearTarget = tc && Math.hypot(tc.mesh.position.x - player.x, tc.mesh.position.z - player.z) < 5;
      const car = nearTarget ? tc : traffic.nearestStealable(player.x, player.z, 5);
      if (car) {
        const nearCop = police.cars.some((c) => Math.hypot(c.x - player.x, c.z - player.z) < 28);
        player.stealCar(car, () => {
          sound.click();
          if (car.driver === false && nearCop) police.addWanted(1, 'stolen in front of police');
          else if (missions.targetCar === car) { /* mission car: no heat */ }
          else police.addWanted(1, 'car theft');
          hud.showBanner(car.kind === 'sports' ? 'Nice — the Comet GT is yours.' : car.kind === 'van' ? 'The armored van is yours.' : 'Car stolen.');
        });
      }
    } else player.exitCar();
  }
});
window.addEventListener('keyup', (e) => { S.keys[e.code] = false; });
canvas.addEventListener('click', () => { sound.ensure(); if (S.screen === 'play' && !S.pointerLocked) canvas.requestPointerLock?.(); });
document.addEventListener('pointerlockchange', () => { S.pointerLocked = document.pointerLockElement === canvas; });
document.addEventListener('mousemove', (e) => {
  if (!S.pointerLocked || S.screen !== 'play') return;
  player.camYaw -= e.movementX * 0.0026;
  player.camPitch = Math.max(-0.15, Math.min(0.9, player.camPitch + e.movementY * 0.0022));
});
canvas.addEventListener('mousedown', (e) => {
  if (S.screen !== 'play' || !player.onFoot) return;
  sound.ensure();
  if (player.weapon === 'pistol') {
    if (player.ammo <= 0) { hud.showBanner('Out of ammo — find a green ammo crate.'); return; }
    const hit = player.shoot(camera, traffic.peds, police.cars, (best) => {
      sound.shot(); traffic.scare(player.x, player.z, 14);
      if (best?.tag === 'ped') { best.ref.state = 'down'; best.ref.mesh.rotation.x = -Math.PI / 2; best.ref.mesh.position.y = 0.4; police.addWanted(1, 'shooting'); }
      if (best?.tag === 'police') police.addWanted(1, 'shot at police');
    });
  } else {
    player.punch(traffic.peds, () => { sound.punch(); traffic.scare(player.x, player.z, 10); });
  }
});
// Ammo crates: green boxes that refill the pistol.
const ammoCrates = [];
{
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshLambertMaterial({ color: 0x37d67a });
  for (const [x, z] of [[-48, 52], [98, -48], [-98, -98], [148, 98]]) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, 0.5, z); scene.add(m);
    ammoCrates.push({ mesh: m, x, z, taken: false });
  }
}
function bind(id, fn) { const el = document.getElementById(id); if (el) el.addEventListener('click', () => { sound.ensure(); sound.click(); fn(); }); }
bind('btn-start', newGame);
bind('btn-continue', continueGame);
bind('btn-resume', () => { S.screen = 'play'; hud.hideScreens(); });
bind('btn-quit', quitToTitle); bind('btn-quit2', quitToTitle); bind('btn-quit3', quitToTitle);
bind('btn-retry', () => { hud.hideScreens(); player.reset(player.x, player.z); player.health = 100; police.clearWanted(); startMission(S.missionIndex); });
bind('btn-again', () => { clearSave(); newGame(); });
bind('intro-go', () => { hud.hideIntro(); missions.startMission(S.missionIndex); });
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Player crime events ---
function onPlayerEvent(type, ref) {
  if (type === 'hitPed') { sound.punch(); traffic.scare(player.x, player.z, 16); police.addWanted(1, 'hit a pedestrian'); S.shake = 0.35; }
  if (type === 'crash' || type === 'bump') { sound.crash(); S.shake = 0.3; if (type === 'crash') player.damage(4); }
}

// --- Camera ---
const camTarget = new THREE.Vector3();
function updateCamera(dt) {
  const driving = !player.onFoot && player.car;
  const px = player.x, pz = player.z;
  const yaw = driving ? (player.car.heading ?? player.car.mesh.rotation.y + Math.PI / 2) : player.camYaw;
  const dist = driving ? 11.5 : 8.5, height = driving ? 4.6 : 3.6 + player.camPitch * 4;
  const bx = px - Math.sin(yaw) * dist, bz = pz - Math.cos(yaw) * dist;
  if (S.camSnap) { camera.position.set(bx, height, bz); S.camSnap = false; }
  else {
    const k = 1 - Math.exp(-dt * 7);
    camera.position.x += (bx - camera.position.x) * k;
    camera.position.y += (height - camera.position.y) * k;
    camera.position.z += (bz - camera.position.z) * k;
  }
  if (S.shake > 0) {
    S.shake -= dt;
    camera.position.x += (Math.random() - 0.5) * S.shake * 0.5;
    camera.position.y += (Math.random() - 0.5) * S.shake * 0.4;
  }
  camTarget.set(px, driving ? 1.6 : 1.8, pz);
  camera.lookAt(camTarget);
}

// --- Main loop ---
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.max(0, Math.min((now - last) / 1000, 0.05)); last = now;
  S.time += dt;
  if (S.screen === 'play') {
    missions.setCash(S.cash);
    player.update(dt, S.keys, colliders, traffic, onPlayerEvent);
    traffic.update(dt, player.pos, player.car);
    police.update(dt, player, player.car, () => failMission('BUSTED — the Solmar PD caught you.'));
    missions.update(dt, player, police);
    if (player.health <= 0) failMission('You\'re down. Danny wakes up in the clinic — the job failed.');
    for (const c of ammoCrates) {
      if (!c.taken && Math.hypot(c.x - player.x, c.z - player.z) < 2.2) {
        c.taken = true; c.mesh.visible = false; player.ammo = Math.min(24, player.ammo + 12);
        sound.pickup(); hud.showBanner('Ammo +12');
      }
    }
    sound.setEngine(player.car ? Math.abs(player.car.speed || 0) / 45 : 0, !!player.car);
  }
  if (S.screen === 'title') {
    // Slow orbit over the city behind the title screen.
    const t = S.time * 0.05;
    traffic.update(dt, player.pos, null);
    camera.position.set(Math.sin(t) * 150, 70, Math.cos(t) * 150 - 20);
    camera.lookAt(0, 0, 0);
  } else {
    updateCamera(dt);
  }
  hud.update(dt, {
    health: player.health, cash: S.cash, wanted: police.level,
    objective: missions.active || missions.done ? missions.objective : (S.screen === 'title' ? 'Start a new game to take Lena\'s first job.' : missions.objective),
    missionIndex: S.missionIndex, done: missions.done,
    driving: !player.onFoot, speedKmh: player.car ? (player.car.speed || 0) * 3.6 : 0,
    timer: missions.active && missions.mission.id === 3 ? missions.timer : 0,
    target: missions.active ? missions.target : null,
    drops: missions.drops.filter((d) => !d.taken),
    trafficDots: traffic.cars.map((c) => ({ x: c.mesh.position.x, z: c.mesh.position.z })),
    policeDots: police.dots(), px: player.x, pz: player.z,
    heading: player.onFoot ? player.camYaw : (player.car ? player.car.mesh.rotation.y : 0),
  });
  const ammoEl = document.getElementById('ammo-num');
  if (ammoEl) ammoEl.textContent = player.ammo + (player.weapon === 'pistol' ? ' 🔫' : '');
  renderer.render(scene, camera);
}

const api = {
  S, player, traffic, police, missions, hud, sound, scene, camera, renderer,
  newGame, continueGame, startMission, quitToTitle, failMission,
  state() {
    return { screen: S.screen, cash: S.cash, wanted: police.level, health: player.health, ammo: player.ammo, onFoot: player.onFoot, x: player.x, z: player.z, mission: missions.index, stage: missions.stage, missionActive: missions.active, objective: missions.objective, policeCars: police.cars.length, trafficCars: traffic.cars.length, peds: traffic.peds.length };
  },
};
window.__game = api;

// Screenshot staging: ?shot=start|play|wanted|mission
if (shotName) {
  document.getElementById('hud').style.display = 'block';
  hud.hideScreens();
  stageShot(shotName, api);
  let painted = 0;
  const paint = () => {
    painted += 1;
    if (painted >= 3) window.__shotReady = true;
    else requestAnimationFrame(paint);
  };
  requestAnimationFrame(paint);
} else {
  document.getElementById('btn-continue').style.display = loadGame() ? '' : 'none';
}
requestAnimationFrame(frame);
