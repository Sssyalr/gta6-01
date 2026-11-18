// HUD: health, cash and debt, wanted stars, objective, speed, timer, banner,
// mission cards, and the canvas minimap (player, target, police, traffic, drops).
import { DEBT, MISSIONS, CITY, ROADS } from './config.js';

export class HUD {
  constructor() {
    this.el = {};
    for (const id of ['health-fill', 'health-num', 'cash', 'debt', 'stars', 'objective', 'mission-name', 'speed', 'speed-box', 'timer', 'banner', 'intro', 'intro-title', 'intro-text', 'menu', 'pause', 'failed', 'failed-text', 'win', 'win-text', 'hint']) this.el[id] = document.getElementById(id);
    this.map = document.getElementById('minimap');
    this.mapCtx = this.map.getContext('2d');
    this.bannerT = 0;
  }
  showBanner(text, ms) { this.el.banner.textContent = text; this.el.banner.style.opacity = '1'; this.bannerT = ms || 2600; }
  showIntro(mission, onStart) {
    this.el['intro-title'].textContent = 'MISSION ' + mission.id + ' — ' + mission.title.toUpperCase();
    this.el['intro-text'].textContent = mission.intro + '  Reward: $' + mission.reward.toLocaleString() + '.';
    this.el.intro.style.display = 'block';
    this._introStart = onStart;
  }
  hideIntro() { this.el.intro.style.display = 'none'; }
  showScreen(name) {
    for (const s of ['menu', 'pause', 'failed', 'win']) this.el[s].style.display = s === name ? 'flex' : 'none';
  }
  hideScreens() { for (const s of ['menu', 'pause', 'failed', 'win']) this.el[s].style.display = 'none'; }
  setFailed(text) { this.el['failed-text'].textContent = text; }
  setWin(text) { this.el['win-text'].textContent = text; }
  update(dt, s) {
    if (this.bannerT > 0) { this.bannerT -= dt * 1000; if (this.bannerT <= 0) this.el.banner.style.opacity = '0'; }
    this.el['health-fill'].style.width = Math.max(0, s.health) + '%';
    this.el['health-num'].textContent = Math.ceil(Math.max(0, s.health));
    this.el.cash.textContent = '$' + s.cash.toLocaleString();
    this.el.debt.textContent = 'DEBT: $' + Math.max(0, DEBT - s.cash).toLocaleString();
    this.el.stars.textContent = '★'.repeat(s.wanted) + '☆'.repeat(5 - s.wanted);
    this.el.stars.style.color = s.wanted > 0 ? '#ff5040' : '#ffffff';
    this.el.objective.textContent = s.objective;
    this.el['mission-name'].textContent = s.done ? 'SOLMAR HEAT — COMPLETE' : 'MISSION ' + (s.missionIndex + 1) + '/4: ' + MISSIONS[s.missionIndex].title.toUpperCase();
    this.el['speed-box'].style.display = s.driving ? 'block' : 'none';
    this.el.speed.textContent = Math.round(Math.abs(s.speedKmh || 0));
    this.el.timer.style.display = s.timer > 0 ? 'block' : 'none';
    this.el.timer.textContent = '⏱ ' + Math.ceil(s.timer) + 's';
    this.el.hint.textContent = s.driving ? 'W/S drive · A/D steer · Space handbrake · E exit car' : 'WASD move · Shift sprint · E steal car · Q pistol/fists · Click attack/shoot · Esc pause';
    this.drawMinimap(s);
  }
  drawMinimap(s) {
    const ctx = this.mapCtx, W = 180, H = 180, scale = W / (CITY.half * 2 + 20);
    const toX = (x) => (x + CITY.half + 10) * scale, toY = (z) => (z + CITY.half + 10) * scale;
    ctx.fillStyle = 'rgba(10,18,26,0.82)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c9b489'; ctx.fillRect(0, toY(172), W, H - toY(172)); // beach
    ctx.fillStyle = '#2e7f9e'; ctx.fillRect(0, toY(196), W, H - toY(196)); // sea
    ctx.fillStyle = '#3d4450';
    for (const r of ROADS) { ctx.fillRect(toX(r) - 2, 0, 4, H); ctx.fillRect(0, toY(r) - 2, W, 4); }
    ctx.fillStyle = '#5a6a72';
    for (const bx of [-175, -125, -75, -25, 25, 75, 125]) for (const bz of [-175, -125, -75, -25, 25, 75, 125]) ctx.fillRect(toX(bx) - 6, toY(bz) - 6, 12, 12);
    // Cash drops.
    ctx.fillStyle = '#37d67a';
    for (const d of s.drops || []) ctx.fillRect(toX(d.x) - 3, toY(d.z) - 3, 6, 6);
    // Traffic (white) and police (red).
    ctx.fillStyle = '#ffffff';
    for (const t of s.trafficDots || []) ctx.fillRect(toX(t.x) - 1.5, toY(t.z) - 1.5, 3, 3);
    ctx.fillStyle = '#ff2a2a';
    for (const p of s.policeDots || []) { ctx.beginPath(); ctx.arc(toX(p.x), toY(p.z), 3.5, 0, 7); ctx.fill(); }
    // Mission target: pulsing yellow diamond.
    if (s.target) {
      const pulse = 5 + Math.sin(performance.now() / 200) * 2;
      ctx.fillStyle = '#f2c94c';
      ctx.beginPath(); ctx.moveTo(toX(s.target.x), toY(s.target.z) - pulse); ctx.lineTo(toX(s.target.x) + pulse, toY(s.target.z)); ctx.lineTo(toX(s.target.x), toY(s.target.z) + pulse); ctx.lineTo(toX(s.target.x) - pulse, toY(s.target.z)); ctx.fill();
    }
    // Player arrow.
    ctx.save(); ctx.translate(toX(s.px), toY(s.pz)); ctx.rotate(s.heading || 0);
    ctx.fillStyle = '#37e0ff'; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
  }
}
