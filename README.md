# NHL '94 PRO Simulator

A browser-based hockey dynasty simulator inspired by the classic NHL '94 game. Load your own roster and schedule via Google Sheets or CSV files, then simulate full seasons, trades, and dynasty runs.

## Features

- Simulate games using NHL '94-era statistics and logic
- Load custom team, player, and schedule data via CSV or Google Sheets
- Dynasty mode with save/continue support
- Pixel-art sprites for skaters and goalies
- Classic retro UI with Press Start 2P font

## Getting Started

1. Clone the repo and open `index.html` in a browser (no build step required).
2. On the start screen, paste your Google Sheet CSV URLs or upload local CSV files for teams, players, and schedule.
3. Click **LOAD GOOGLE SHEET** to start a new game, or **CONTINUE DYNASTY** to resume a saved run.

## CSV Format

The simulator expects three sheets:

| Sheet    | Purpose                          |
|----------|----------------------------------|
| TEAM     | Team names, abbreviations, logos |
| PLAYER   | Player rosters and stats         |
| SCHEDULE | Season game schedule             |

## Tech Stack

- Vanilla JavaScript (no framework)
- HTML5 Canvas for sprite rendering
- [PapaParse](https://www.papaparse.com/) for CSV parsing
- [LZ-String](https://pieroxy.net/blog/pages/lz-string/index.html) for save-state compression

## Status

Alpha V1.00 — actively in development.
