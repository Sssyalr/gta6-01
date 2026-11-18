// Solmar Bay: ground, roads, sidewalks, buildings, palms, beach, docks, props.
import * as THREE from 'three';
import { CITY, ROADS, ROAD_W, PALETTE, mulberry32, LANDMARKS } from './config.js';
import { buildingTexture, roadTexture, sidewalkTexture, sandTexture } from './textures.js';

const BLOCK_CENTERS = [-175, -125, -75, -25, 25, 75, 125, 175];

export function buildWorld(scene) {
  const rnd = mulberry32(20261118);
  const colliders = []; // {minX,maxX,minZ,maxZ}
  const buildings = [];
  const roadTex = roadTexture(); roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
  const walkTex = sidewalkTexture(); walkTex.wrapS = walkTex.wrapT = THREE.RepeatWrapping;

  // Base ground (warm concrete) + sand strip + sea to the south.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshLambertMaterial({ color: PALETTE.ground }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.05, -40); scene.add(ground);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(560, 46), new THREE.MeshLambertMaterial({ map: sandTexture() }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0, 198); scene.add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(700, 160), new THREE.MeshLambertMaterial({ color: PALETTE.water }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.4, 300); scene.add(sea);

  // Roads: dark strips along every grid line, with sidewalk borders.
  const roadMat = new THREE.MeshLambertMaterial({ map: roadTex });
  const walkMat = new THREE.MeshLambertMaterial({ map: walkTex });
  for (const r of ROADS) {
    for (const [w, len, x, z, ry] of [[ROAD_W, 400, r, 0, 0], [ROAD_W, 400, 0, r, Math.PI / 2]]) {
      const t = roadTex.clone(); t.needsUpdate = true; t.repeat.set(1, len / 14);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), new THREE.MeshLambertMaterial({ map: t }));
      m.rotation.x = -Math.PI / 2; m.rotation.z = ry; m.position.set(x, 0.02, z); scene.add(m);
    }
    // Sidewalk ribbons flanking each road.
    for (const off of [-8.5, 8.5]) {
      const s1 = new THREE.Mesh(new THREE.BoxGeometry(400, 0.18, 5), walkMat);
      s1.position.set(0, 0.09, r + off); scene.add(s1);
      const s2 = new THREE.Mesh(new THREE.BoxGeometry(5, 0.18, 400), walkMat);
      s2.position.set(r + off, 0.09, 0); scene.add(s2);
    }
  }

  // Buildings: one or two per block, pastel facades, taller toward the centre.
  const hex = (n) => '#' + n.toString(16).padStart(6, '0');
  let seed = 7;
  for (const cx of BLOCK_CENTERS) for (const cz of BLOCK_CENTERS) {
    if (cz === 175) continue; // beach row stays open
    if (Math.abs(cx) === 175 && Math.abs(cz) === 175) continue;
    if (cx === -125 && cz === -125) continue; // garage lot
    if (cx === 125 && cz === 125) continue; // safehouse lot
    const distC = Math.abs(cx) + Math.abs(cz);
    const h = 8 + rnd() * (distC < 100 ? 30 : 16);
    const w = 20 + rnd() * 12, d = 20 + rnd() * 12;
    const base = PALETTE.building[Math.floor(rnd() * PALETTE.building.length)];
    const mat = new THREE.MeshLambertMaterial({ map: buildingTexture(hex(base), seed++) });
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    b.position.set(cx, h / 2, cz); scene.add(b); buildings.push(b);
    colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
    if (rnd() < 0.45) { // rooftop box
      const r2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 2.5, d * 0.4), new THREE.MeshLambertMaterial({ color: 0x8a8f98 }));
      r2.position.set(cx + w * 0.2, h + 1.25, cz); scene.add(r2);
    }
  }

  // Landmark lots: garage (west), safehouse (east), docks (far east).
  function lot(x, z, color, label) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(30, 0.3, 24), new THREE.MeshLambertMaterial({ color }));
    m.position.set(x, 0.15, z); scene.add(m);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(30, 5, 1), new THREE.MeshLambertMaterial({ color: 0xd8d2c4 }));
    wall.position.set(x, 2.5, z - 12); scene.add(wall);
    colliders.push({ minX: x - 15, maxX: x + 15, minZ: z - 12.5, maxZ: z - 11.5 });
    return { x, z, label };
  }
  lot(LANDMARKS.garage.x, LANDMARKS.garage.z, 0x6a7f8a, 'Garage');
  lot(LANDMARKS.safehouse.x, LANDMARKS.safehouse.z, 0x7f9a6a, 'Safehouse');
  const dock = new THREE.Mesh(new THREE.BoxGeometry(24, 1, 60), new THREE.MeshLambertMaterial({ color: 0x8a6f4d }));
  dock.position.set(186, 0.5, -20); scene.add(dock);

  // Palm trees along the beach and scattered on sidewalks.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6f4d });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f9e57 });
  function palm(x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 7, 6), trunkMat);
    trunk.position.y = 3.5; g.add(trunk);
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.4, 4), leafMat);
      const a = (i / 6) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 1.2, 7.2, Math.sin(a) * 1.2);
      leaf.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); g.add(leaf);
    }
    g.position.set(x, 0, z); scene.add(g);
  }
  for (let x = -170; x <= 170; x += 28) palm(x + rnd() * 8, 182 + rnd() * 6);
  for (let i = 0; i < 16; i++) palm(ROADS[Math.floor(rnd() * ROADS.length)] + 9, (rnd() * 2 - 1) * 160);

  // Beach umbrellas + streetlights at intersections.
  const umbMat = new THREE.MeshLambertMaterial({ color: 0xff7f6a });
  for (let i = 0; i < 8; i++) {
    const u = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.2, 8), umbMat);
    u.position.set(-150 + i * 42 + rnd() * 10, 2.2, 192 + rnd() * 8); scene.add(u);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 5), trunkMat);
    pole.position.set(u.position.x, 1.1, u.position.z); scene.add(pole);
  }
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x44484e });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (const rx of [-100, 0, 100]) for (const rz of [-100, 0, 100]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 6), poleMat);
    p.position.set(rx + 7, 3, rz + 7); scene.add(p);
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), lampMat);
    l.position.set(rx + 7, 6.2, rz + 7); scene.add(l);
  }
  return { colliders, buildings };
}

// Push a circle (x,z,r) out of building AABBs; returns corrected x,z.
export function resolveCollisions(colliders, x, z, r) {
  for (const c of colliders) {
    const nx = Math.max(c.minX, Math.min(x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(z, c.maxZ));
    const dx = x - nx, dz = z - nz, d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-6) { const d = Math.sqrt(d2); x = nx + (dx / d) * r; z = nz + (dz / d) * r; }
      else { // inside: push out along the smallest penetration axis
        const pl = x - c.minX, pr = c.maxX - x, pt = z - c.minZ, pb = c.maxZ - z;
        const m = Math.min(pl, pr, pt, pb);
        if (m === pl) x = c.minX - r; else if (m === pr) x = c.maxX + r;
        else if (m === pt) z = c.minZ - r; else z = c.maxZ + r;
      }
    }
  }
  return [x, z];
}
