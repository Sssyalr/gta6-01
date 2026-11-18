// Screenshot scenes (?shot=start|play|wanted|mission): stage the real game into a
// lively frame — same code paths as play, fixed seed, no faked renders.
import { LANDMARKS } from './config.js';

function driveForward(api, seconds) {
  const { player, traffic, police, missions } = api;
  const keys = { KeyW: true };
  for (let i = 0; i < seconds * 60; i++) {
    player.update(1 / 60, keys, [], traffic, () => {});
    traffic.update(1 / 60, player.pos, player.car);
  }
}
function settle(api, seconds) {
  const { player, traffic, police } = api;
  for (let i = 0; i < seconds * 60; i++) {
    traffic.update(1 / 60, player.pos, player.car);
    if (police.level > 0) police.update(1 / 60, player, player.car, () => {});
  }
}
// Put one traffic car on the player's road, ahead of the car, so the frame shows traffic.
function placeTrafficAhead(api, gap) {
  const { player, traffic } = api;
  const c = traffic.cars[0];
  const h = player.car ? player.car.heading : 0;
  const aheadX = player.x + Math.sin(h) * gap, aheadZ = player.z + Math.cos(h) * gap;
  const vertical = Math.abs(Math.sin(h)) < Math.abs(Math.cos(h)); // moving along z: road is x=const
  if (vertical) { c.axis = 'z'; c.road = Math.round(aheadX / 50) * 50; c.along = aheadZ; c.dir = Math.cos(h) > 0 ? 1 : -1; }
  else { c.axis = 'x'; c.road = Math.round(aheadZ / 50) * 50; c.along = aheadX; c.dir = Math.sin(h) > 0 ? 1 : -1; }
  c.speed = 8;
  traffic.syncCarMesh(c);
}

export function stageShot(name, api) {
  const { S, player, traffic, police, missions, hud } = api;
  hud.hideScreens();
  if (name === 'start') {
    S.screen = 'title';
    document.getElementById('hud').style.display = 'none';
    hud.showScreen('menu');
    player.reset(0, -30);
    settle(api, 2);
    return { screen: 'title' };
  }
  document.getElementById('hud').style.display = 'block';
  S.screen = 'play'; S.camSnap = true;
  if (name === 'play') {
    api.newGame();
    S.missionIndex = 0;
    hud.hideIntro();
    missions.startMission(0);
    // Steal the red sports car itself and drive it down the avenue with traffic around.
    const car = missions.targetCar;
    player.x = car.mesh.position.x; player.z = car.mesh.position.z;
    player.stealCar(car, () => {});
    player.camYaw = car.heading;
    driveForward(api, 3.5);
    placeTrafficAhead(api, 42);
    hud.showBanner('MISSION 1: HOT WHEELS — deliver the Comet GT to the garage');
  } else if (name === 'wanted') {
    api.newGame();
    S.missionIndex = 1;
    hud.hideIntro();
    missions.startMission(1);
    missions.stage = 1; missions.crewLeft = 0; missions.target = { x: LANDMARKS.safehouse.x, z: LANDMARKS.safehouse.z };
    missions.moveBeacon();
    const car = traffic.parked[3];
    player.x = car.mesh.position.x; player.z = car.mesh.position.z;
    player.stealCar(car, () => {});
    police.addWanted(3, 'getaway');
    settle(api, 1.5);
    driveForward(api, 2.5);
    placeTrafficAhead(api, 38);
    settle(api, 1.0);
    // One cruiser pulls alongside so the chase is visible in the frame.
    const pc = police.cars[0];
    if (pc) {
      pc.x = player.x - 7; pc.z = player.z - 22; pc.heading = player.car.heading; pc.speed = 22;
      pc.mesh.position.set(pc.x, 0, pc.z); pc.mesh.rotation.y = pc.heading - Math.PI / 2;
    }
    hud.showBanner('WANTED ★★★ — lose the cops, reach the safehouse!');
  } else { // mission: cash run — Danny on foot grabbing a drop, city alive around him
    api.newGame();
    S.missionIndex = 2;
    hud.hideIntro();
    missions.startMission(2);
    const d = missions.drops[0];
    player.reset(d.x - 4, d.z + 3);
    player.camYaw = Math.atan2(d.x - player.x, d.z - player.z);
    settle(api, 2);
    hud.showBanner('MISSION 3: CASH RUN — grab all 5 drops before time runs out');
  }
  return { screen: 'play' };
}
