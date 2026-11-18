# SOLMAR HEAT

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Sssyalr/gta6-01/rank.svg)](https://make.fun/c/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Sssyalr/gta6-01/reward.svg)](https://make.fun/c/gta6-01)

An original open-world crime game in the spirit of GTA 6, running offline in a
desktop browser from static files. Explore the sun-soaked coastal city of
Solmar Bay on foot and by car, steal cars, dodge the Solmar PD, and work four
story missions to pay off a $50,000 debt.

## Story

You are Danny "Wheels" Ortiz, a getaway driver who owes $50,000 to loan shark
Vincent Marlow — "The Shark". Fixer Lena Cruz has four jobs for you:

1. **Hot Wheels** ($8,000) — steal the red Comet GT and deliver it to the garage.
2. **The Getaway** ($12,000) — pick up Lena's crew, lose the cops, reach the safehouse.
3. **Cash Run** ($10,000) — collect 5 cash drops around the city before time runs out.
4. **The Big Score** ($20,000) — steal the armored van, shake a 3-star wanted level, deliver it to the docks.

Finish all four and the debt is paid.

## Play

Open `game/index.html` in desktop Chrome (or `node serve.ts`, then
http://localhost:8080). No network request at runtime; three.js is vendored
under `game/vendor/`.

- **On foot:** WASD move, mouse look, Shift sprint, E steal / exit car,
  left-click punch, Q switch to pistol (click to shoot), M manual save.
- **Driving:** W accelerate, S brake / reverse, A/D steer, Space handbrake,
  E exit car.
- **Wanted:** 0–5 stars. Car theft, hitting pedestrians and shooting raise
  the heat; police cruisers chase, ram and bust you. Lay low and it cools off.
- **HUD:** health, cash and debt, wanted stars, mission objective, speed,
  timer, and a live minimap (player, mission target, police, traffic, drops).
- **Save:** autosaves on mission complete (M saves manually); Continue on
  the title screen loads it. Pause with Esc; retry a failed mission.

## Tech

- Three.js r170 (vendored minified build), procedural canvas textures,
  procedural Web Audio (engine, sirens, gunshots, pickups) — no audio or
  image files, everything original.
- Source split by job: `config`, `textures`, `audio`, `world`, `traffic`,
  `police`, `player`, `missions`, `hud`, `save`, `main`, `shots`.

## License

MIT — see [LICENSE](LICENSE). All city, characters, vehicles, names, story,
art and sound are original work. No Rockstar Games content.
