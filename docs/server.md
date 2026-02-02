### Server State Model

```rust
ServerState
 ├─ games: HashMap<Uuid, Game>
 ├─ clients: HashMap<Uuid, Client>
 └─ game_ids_by_name
```

Each `Game` is fully isolated.

---

### Game

```rust
pub struct Game {
    id: Uuid,
    name: String,
    entity_map: HashMap<Uuid, Entity>,
    usernames: HashSet<String>,
    client_entity_view: HashMap<ClientId, Set<EntityId>>,
    terrain_generator: TerrainGenerator,
}
```

**Key ideas:**

* Entity-centric simulation
* Visibility-based entity streaming
* Chunk-based terrain

---

### Entity System

```rust
Entity {
  id: Uuid,
  position: Vec2,
  value: EntityType,
  health: i32
}
```

`EntityType` includes:

* Player
* Trees, Stones and other ecorative world objects

Players have inventory, skin, username, and combat stats.

---

### Combat Model

Damage is computed by:

1. Tool presence
2. Tool type effectiveness
3. Tool material

```text
Base Damage → Tool Bonus → Type Match → Material Multiplier
```

The server broadcasts:

* `EntityDamage`
* `EntityDeath`
* System kill messages

---

### Terrain Streaming

* World divided into **chunks**
* Clients receive chunks within `VIEW_RANGE`
* Server tracks per-client visible entities

```text
Player moves → visible chunks diffed → streamed
```