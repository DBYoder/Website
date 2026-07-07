# Agile Toolset - Website Project

This project contains a suite of agile tools (Planning Poker, Retro Board, Story Generator) built with React and a Node.js backend.

## Deployment on Railway

The project is configured for seamless deployment on Railway.

> **Persistence note:** the server saves sessions (poker rooms, retro boards,
> WBS trees) to a local `data/` directory. Container filesystems on Railway
> are wiped on every redeploy — mount a Railway volume at `/app/data` if
> sessions should survive deployments. Rooms idle for more than 30 days are
> pruned automatically at startup.

### Files Added for Support:
- `server.js`: Express server with Socket.io support for real-time tool functionality.
- `package.json`: Updated with `start` script and dependencies (`express`, `socket.io`).
- `railway.json`: Deployment configuration for Railway.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run frontend in development mode:
   ```bash
   npm run dev
   ```

3. Build and run production server:
   ```bash
   npm run build
   npm start
   ```

## Tools
- **Planning Poker**: Real-time estimation tool.
- **Retro Board**: Collaborative retrospective board.
- **Story Generator**: AI-ready user story template generator.
