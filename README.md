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

```bash
npm run start
```

### Running on a custom port

You can specify a custom port for the WebSocket server:

```bash
PORT=3000 npm run start
```

This will start the WebSocket server on port 3000 and the HTTP server on port 3001.

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
- Configurable port for running multiple instances
- Validation of ship placement and game rules

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

## Playing the game in multiple browser tabs

To play the game locally using multiple browser tabs:

1. Start the server with default ports or specify a custom port:
   ```bash
   npm run start
   # or with custom port
   PORT=3000 npm run start
   ```

2. Open two different browser tabs with the client application:
   - First tab: http://localhost:8181 (or http://localhost:3001 if using custom port)
   - Second tab: http://localhost:8181 (or http://localhost:3001 if using custom port)

3. In each tab:
   - Register with different usernames
   - Create a room in one tab
   - Join the room from the other tab
   - Place ships in both tabs
   - Start playing!

## Configuration

The game configuration is stored in `src/config.ts` and includes:

- WebSocket port (default: 3000, can be overridden with PORT environment variable)
- Game board size (default: 10x10)
- Ship configuration (number of ships of each size)
