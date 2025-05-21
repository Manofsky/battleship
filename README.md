# Battleship Game

WebSocket server implementation for Battleship game

## Technologies

- Node.js (v22.x)
- TypeScript
- WebSocket (ws)

## Installation

```bash
npm install
```

## Build

```bash
npm run build
```

## Running the app

The application starts two servers:
- HTTP server on port 8181 (for static files)
- WebSocket server on port 3000 (for game interaction)

```bash
npm run start
```

## Development

```bash
npm run dev
```

## Project Structure

- `src/` - source code
  - `http_server/` - HTTP server for static files
  - `websocket/` - WebSocket server
  - `models/` - data models and storage
  - `game/` - game logic
  - `utils/` - utilities and message handlers
- `front/` - client-side application
- `dist/` - compiled files

## Features

- Player registration and authentication
- Creating and joining game rooms
- Ship placement on the game board
- Attack and random attack
- Tracking win statistics
- Real-time communication via WebSocket (port 3000)

**Development**

`npm run start:dev`

* App served @ `http://localhost:8181` with nodemon

**Production**

`npm run start`

* App served @ `http://localhost:8181` without nodemon

---

**All commands**

Command | Description
--- | ---
`npm run start:dev` | App served @ `http://localhost:8181` with nodemon
`npm run start` | App served @ `http://localhost:8181` without nodemon

**Note**: replace `npm` with `yarn` in `package.json` if you use yarn.
