# SOLMAR — Open-World Crime

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/AndryXSad/gta6-01-v1/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/AndryXSad/gta6-01-v1/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Solmar** is a sun-soaked coastal open-world crime game, built for the
[make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01). You are **Rio**, a
harbour courier who owes money to the local fixer **Madame Kestrel**. Work off
the debt across four story missions — while the Solmar police count your
wanted stars.

## The city

Solmar is a fully procedural 3D city: a downtown road grid with low-poly
towers, a working harbour (cranes, containers, docks), a beach boulevard with
palms, and a ring highway around it all. No external assets, no network —
every building, palm and street lamp is generated in code.

## What you can do

- **Walk and drive** — WASD on foot (Shift to run), E to get in and out of
  any car, arcade driving with handbrake-style turns.
- **Steal cars** — grab any parked or traffic car with E. Stealing raises your
  wanted level, and the police notice.
- **Wanted system (1–5 stars)** — patrol cars chase and ram you; foot cops
  chase you down, and shoot at 3+ stars. Stay out of sight to cool off, or get
  busted and wake up at the hospital minus a fine.
- **Four story missions** — deliver a package to the harbour, steal a car for
  the north garage, pick up Dara on the boulevard, then a final highway
  getaway. A light beacon marks each target; finishing a mission pays cash.
- **Living traffic** — NPC cars cruise the grid and brake for the car ahead;
  pedestrians stroll the sidewalks and scatter when you speed past.
- **Combat** — punch with Space. Punching a cop is a bad idea.
- **HUD + minimap** — health, cash, wanted stars, city clock, mission
  objective and a live top-down minimap with the mission marker.
- **Save** — progress (mission, cash, health, wanted, position) autosaves to
  localStorage; Continue from the start screen.
- **Sound** — engine hum, sirens, punches, gunshots and mission jingles, all
  synthesised with WebAudio. No audio files.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk / drive |
| Shift | Run |
| E | Enter / exit car |
| Space | Punch |
| P | Pause |
| Mouse drag | Rotate camera |

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

## Screenshots

Deterministic shots (`?shot=...&seed=1`): `1-chase` (cover: getaway with
wanted stars, minimap and objective), `2-city` (downtown on foot),
`3-mission` (harbour beacon + mission dialog), `4-police` (wanted 4 standoff).
Retake them with the headless shell in `shots.json` after any visual change.

## Source layout

- `game/index.html` — canvas + HUD + menu
- `game/src/main.js` — game loop and state machine
- `game/src/city.js` — procedural city (roads, towers, harbour, beach)
- `game/src/player.js` — Rio on foot + melee combat
- `game/src/vehicles.js` — low-poly cars, driving, stealing
- `game/src/traffic.js` — NPC cars and pedestrians
- `game/src/police.js` — wanted level, patrols, foot cops
- `game/src/missions.js` — four missions, beacons, rewards
- `game/src/hud.js` — HUD + minimap
- `game/src/audio.js` — synthesised WebAudio sounds
- `game/src/save.js` — localStorage save / load
- `game/src/shots.js` — deterministic screenshot scenes
- `game/src/config.js`, `game/src/random.js` — tuning + seeded RNG
- `game/vendor/three.min.js` — vendored three.js (U)

## License

MIT — see [LICENSE](LICENSE).
