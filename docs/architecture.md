### High-Level Architecture

```
Browser (WebGL)
    |
WebSocket (JSON Packets)
    |
Rust Server (Authoritative)
    |
Procedural World + Entity Simulation
```

The server is all-authroitative - owns:

* Entity positions
* Combat resolution
* Terrain generation
* Visibility & chunk streaming

Clients are thin renderers with prediction-free input forwarding.

### Game Loop Responsibilities

| Component | Responsibility                   |
| --------- | -------------------------------- |
| Server    | Validate input, simulate world   |
| Client    | Render state, send player intent |