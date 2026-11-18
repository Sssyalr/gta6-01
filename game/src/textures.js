// Procedural canvas textures: building facades, roads, sidewalks, sand. No image files.
import * as THREE from 'three';
import { mulberry32 } from './config.js';

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
  return `rgb(${r},${g},${b})`;
}
// Facade: base colour, lit window grid, darker ground floor with a shopfront.
export function buildingTexture(base, seed) {
  const rnd = mulberry32(seed);
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.18)';
    for (let i = 0; i < 40; i++) g.fillRect(rnd() * w, rnd() * h, 3, 3);
    const cols = 5, rows = 9, cw = w / cols, ch = (h - 40) / rows;
    for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) {
      const lit = rnd() < 0.55;
      g.fillStyle = lit ? '#ffe9a8' : '#2c3e50';
      g.fillRect(x * cw + 5, 8 + y * ch + 5, cw - 10, ch - 10);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(x * cw + 5, 8 + y * ch + 5, cw - 10, 3);
    }
    g.fillStyle = shade(base, 0.55); g.fillRect(0, h - 40, w, 40);
    g.fillStyle = '#1d2b36'; g.fillRect(w * 0.3, h - 34, w * 0.4, 34);
    g.fillStyle = '#ffd166'; g.fillRect(6, h - 36, w - 12, 5);
  });
}
// Asphalt with centre dashes and edge lines, tiled along the road.
export function roadTexture() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#33373d'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 90; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    g.fillStyle = '#e8e4d8'; g.fillRect(0, 4, w, 3); g.fillRect(0, h - 7, w, 3);
    g.fillStyle = '#f2c94c';
    for (let y = 0; y < h; y += 32) g.fillRect(w / 2 - 2, y, 4, 18);
  });
}
export function sidewalkTexture() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#b9b3a4'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke();
      g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke();
    }
  });
}
export function sandTexture() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#e8d29a'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(180,150,90,0.5)';
    for (let i = 0; i < 120; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  });
}
