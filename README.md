# Volleyball Online Scoring System

A web app for managing volleyball teams, scheduling matches, and scoring live games with rotation tracking.

## License

Licensed under the [Apache License, Version 2.0](LICENSE).

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
- MySQL via mysql2 (connection pool)
- Tailwind CSS

## Database

Copy `.env.example` to `.env` and set MySQL connection variables. For production on a VPC (e.g. DigitalOcean App Platform + managed MySQL), point `MYSQL_HOST` at the **private** database hostname and enable TLS if required:

```bash
MYSQL_HOST=private-db-....db.ondigitalocean.com
MYSQL_PORT=25060
MYSQL_USER=doadmin
MYSQL_PASSWORD=...
MYSQL_DATABASE=volleyball
MYSQL_SSL=true
```

The schema is created automatically on first connection.
