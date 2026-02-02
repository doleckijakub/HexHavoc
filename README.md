# HexHavoc

### Overview

HexHavoc is a browser-playable multiplayer game where players explore a procedurally generated world, fight other players, and interact with world entities (trees, stones, terrain objects).

**Core traits:**

* Server-authoritative simulation (Rust)
* WebSocket protocol
* Chunk-based world streaming
* Deterministic terrain generation
* Pixel-art rendering with WebGL
* Low-latency PvP combat

---

### Tech Stack

| Layer     | Technology               |
| --------- | ------------------------ |
| Backend   | Rust + Actix + Tokio     |
| Frontend  | TypeScript + WebGL       |
| Transport | WebSocket (JSON packets) |
| Rendering | Custom shader pipeline   |
| Assets    | Tilemap-based pixel art  |

---

### Repository Structure

```
server/
  src/
    main.rs           # HTTP + WS bootstrap
    model.rs          # Game logic & state (core)
    terrain.rs        # World generation
    packet.rs         # Network protocol
    endpoints/        # REST & WS handlers

client/
  src/
    game.ts           # Client game loop
    core/             # Math, entities, rendering primitives
    render/           # Renderer & shaders
    types/            # Shared packet & game types
    textures/         # Tilemaps
```

---

### Building the Project

```bash
cd client
npm install
```

### Running the Project

#### Frontend

```bash
./start.sh
```