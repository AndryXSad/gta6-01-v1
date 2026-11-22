# Solmar — Make GTA 6 (gta6-01)

[![make.fun — gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/AndryXSad/gta6-01-v1/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/AndryXSad/gta6-01-v1/reward.svg)](https://make.fun/bounty/gta6-01)

**Solmar** is an original open-world driving-and-heist game set in a sunny
coastal city you built yourself — not a copy of any existing game. Play as
Rio, a harbour courier in debt to the local fixer Madame Kestrel, and work
through four story missions across downtown, the harbour, the beach
boulevard and the ring highway.

## How to play

- **On foot:** WASD to walk, Shift to run, mouse drag to look around,
  click (or F) to punch, E to enter a nearby car.
- **Driving:** W/S to accelerate and brake, A/D to steer, Space for the
  handbrake, E to get out. Parked cars and traffic cars can be taken —
  stealing one in front of the police raises your wanted level.
- **Wanted level:** 1–5 stars. Police patrol cars and officers chase you;
  lay low or outrun them and the heat cools off.
- **Missions:** follow the yellow marker and the objective text. Finish a
  mission to earn cash and unlock the next one.
- **HUD:** health, cash, wanted stars, speed, mission objective, city
  clock, and a live minimap showing streets, police and the mission marker.
- **Save:** progress (cash, mission, best run) is kept in localStorage —
  Continue or start a New Game from the title screen.

## Tech

- three.js r160, vendored under `game/vendor/` — no network, no build step,
  all assets procedural. Sound is synthesised with WebAudio (engine, siren,
  pickup, gunshot); no external files.
- Source is split into one clear job per file under `game/src/`
  (`city`, `traffic`, `vehicles`, `player`, `police`, `missions`, `hud`,
  `audio`, `save`, `shots`, `config`, `random`, `main`).
- Deterministic screenshots: open `game/index.html?shot=chase&seed=1`
  (also `city`, `mission`, `police`) — each stages a real played-forward
  scene from the same seed.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

## Entry

Built for the [gta6-01 bounty on make.fun](https://make.fun/bounty/gta6-01).
`main.ts` copies `game/` and `screenshots/` into the output directory and
writes `dossier.json` for the judge.
