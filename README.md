# Volleyball Online Scoring System

A web app for managing volleyball teams, scheduling matches, and scoring live games with rotation tracking.

## Features

### Admin
- **Create teams** with player names and jersey numbers
- **Edit teams** — update rosters and jersey numbers
- **Manage locations** — add and edit venues with name and address
- **Create matches** by selecting two registered teams
- **Edit matches** before scoring starts

### Scorer
- **Select matches** created by admins
- **Set starting rotation** — assign 6 players to court positions (P1–P6) for each team
- **Live scoring** — tap to add points; automatic side-out rotation when the receiving team wins a rally
- **Set tracking** — scorers add sets manually and score without a fixed point limit

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Workflow

1. Go to **Admin → Teams** and create teams with rosters
2. Go to **Admin → Locations** and add venues with name and address
3. Go to **Admin → Matches** and schedule a match between two teams
4. Go to **Scorer**, select the match, set rotations, and start scoring
5. After each set ends, set the rotation for the next set before continuing

## Tech Stack

- Next.js 16 (App Router)
- SQLite via better-sqlite3
- Tailwind CSS

Data is stored locally in `data/volleyball.db`.
