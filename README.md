# SOLMAR — Make GTA 6 (gta6-01)

[![make.fun — gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/AndryXSad/gta6-01-v1/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/AndryXSad/gta6-01-v1/reward.svg)](https://make.fun/bounty/gta6-01)

**Solmar** is an original open-world crime game for the desktop browser,
built for the [gta6-01 bounty](https://make.fun/bounty/gta6-01) on make.fun.
No Rockstar names, logos, characters, maps or assets are used anywhere —
the city, the people and the story are all invented here.

## The game

You are **Rio**, a harbour courier in debt to a local fixer, **Madame
Kestrel**. Work off the debt across four story missions: deliver a package
to the docks, steal a car and shake the police, pick up a friend on the
boulevard mid-chase, then make the final getaway down the ring highway.

What is in the world:

- A drivable coastal city — downtown grid, harbour, beach boulevard,
  ring highway and housing blocks, all procedural low-poly 3D (three.js).
- On foot and by car: walk, run, punch, steal parked and NPC cars, drive
  with handbrake.
- Living traffic and pedestrians who walk the pavements and flee trouble.
- A wanted level (1–5 stars): patrol cars and foot officers chase, ram
  and, at 3 stars and up, shoot. Lay low and the heat cools off.
- Four story missions with objective markers, dialogue and cash rewards.
- HUD with health, cash, wanted stars, a live minimap, speed and the
  city clock; a start screen and a localStorage save (Continue / New Game).
- Synthesised WebAudio sound — engine, sirens, pickups, gunfire. No
  external files, no network at all.

## Controls

- **W A S D** — walk / drive · **Shift** — run · **Mouse** — look around
- **E** — enter / exit a car (stealing a car raises your wanted level)
- **F** or **click** — punch · **Space** — handbrake while driving
- **Esc** — pause · **M** — mute

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Screenshots live in `screenshots/` (the first by name is the cover).
The entry is handed in by `main.ts`, which copies `game/` and
`screenshots/` to the output directory and writes `dossier.json`.

## Credits

Built by [@anzzz](https://make.fun/u/anzzz) for make.fun gta6-01.
three.js (r160) is vendored under `game/vendor/three.min.js`.
