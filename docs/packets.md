# Network Protocol Documentation

## Packet Types

### Client → Server Packets

#### Player Registration
**Packet Name:** `player_register`  
**Direction:** Client → Server  
**Purpose:** Register a new player in a game session  
**Payload:**
```json
{
  "packet_type": "player_register",
  "game_name": "{{ GAME_NAME }}",
  "username": "{{ USERNAME }}",
  "skin": "{{ SKIN_ID }}"
}
```
**Server Response:**
- Success: `player_registered` packet
- Error: `"game-not-found"` or `"username-taken"`

#### Player Movement
**Packet Name:** `entity_move`  
**Direction:** Client → Server  
**Purpose:** Update player's position in the world  
**Payload:**
```json
{
  "packet_type": "entity_move",
  "id": "{{ PLAYER_ID }}",
  "new_position": {
    "x": X_COORDINATE,
    "y": Y_COORDINATE
  }
}
```
**Notes:** Only allows movement for the player's own ID

#### Chat Message
**Packet Name:** `chat_message_send`  
**Direction:** Client → Server  
**Purpose:** Send chat message to all players or execute command  
**Payload:**
```json
{
  "packet_type": "chat_message_send",
  "message": "{{ MESSAGE_TEXT }}"
}
```
**Commands Supported:**
- `/tp [username]` - Teleport to another player
- *(WIP)* - More commands to be implemented

#### Player Attack
**Packet Name:** `player_attack`  
**Direction:** Client → Server  
**Purpose:** Initiate attack at cursor position  
**Payload:**
```json
{
  "packet_type": "player_attack",
  "cursor_world_pos": {
    "x": X_COORDINATE,
    "y": Y_COORDINATE
  }
}
```
**Notes:** Triggers attack handling logic on server

#### Inventory Selection
**Packet Name:** `inventory_select`  
**Direction:** Client → Server  
**Purpose:** Change player's selected inventory slot  
**Payload:**
```json
{
  "packet_type": "inventory_select",
  "selected": SLOT_NUMBER
}
```
**Notes:** Updates player's selected inventory item

### Server → Client Packets

#### Player Registration Response
**Packet Name:** `player_registered`  
**Direction:** Server → Client  
**Purpose:** Confirm successful player registration  
**Payload:**
```json
{
  "packet_type": "player_registered",
  "id": "{{ PLAYER_ID }}"
}
```
**Client Action:** Shows HUD and chat interface

#### Entity Management

##### Entity Load
**Packet Name:** `entity_load`  
**Direction:** Server → Client  
**Purpose:** Add a new entity to client's view  
**Payload:**
```json
{
  "packet_type": "entity_load",
  "entity": {
    "id": "{{ ENTITY_ID }}",
    "position": {
      "x": X_COORDINATE,
      "y": Y_COORDINATE
    },
    "value": {
      "type": "player",
      "username": "{{ USERNAME }}",
      "skin": "{{ SKIN_ID }}",
      "health": HEALTH_VALUE
    }
  }
}
```

##### Entity Unload
**Packet Name:** `entity_unload` (WIP)  
**Direction:** Server → Client  
**Purpose:** Remove entity from client's view  
**Payload:**
```json
{
  "packet_type": "entity_unload",
  "id": "{{ ENTITY_ID }}"
}
```

##### Entity Movement
**Packet Name:** `entity_move`  
**Direction:** Server → Client  
**Purpose:** Update entity position  
**Payload:**
```json
{
  "packet_type": "entity_move",
  "id": "{{ ENTITY_ID }}",
  "new_position": {
    "x": X_COORDINATE,
    "y": Y_COORDINATE
  }
}
```

##### Entity Damage
**Packet Name:** `entity_damage`  
**Direction:** Server → Client  
**Purpose:** Update entity health after taking damage  
**Payload:**
```json
{
  "packet_type": "entity_damage",
  "id": "{{ ENTITY_ID }}",
  "new_health": NEW_HEALTH_VALUE
}
```
**Client Action:** Updates health display, triggers damage effects for player

##### Entity Death
**Packet Name:** `entity_death` (WIP)  
**Direction:** Server → Client  
**Purpose:** Notify client of entity death  
**Payload:**
```json
{
  "packet_type": "entity_death",
  "id": "{{ ENTITY_ID }}"
}
```
**Client Action:** Removes entity, plays death sound (WIP)

#### Terrain Data
**Packet Name:** `terrain_chunk`  
**Direction:** Server → Client  
**Purpose:** Send terrain chunk data  
**Payload:**
```json
{
  "packet_type": "terrain_chunk",
  "chunk": {
    "position": {
      "x": CHUNK_X,
      "y": CHUNK_Y
    },
    "contents": [
      "TILE_TYPE_0",
      "TILE_TYPE_1",
      ...
    ]
  }
}
```
**Notes:** Automatically sent during registration and when entering new areas

#### Chat System

##### Player Chat Message
**Packet Name:** `chat_message`  
**Direction:** Server → Client  
**Purpose:** Broadcast chat message from player  
**Payload:**
```json
{
  "packet_type": "chat_message",
  "id": "{{ MESSAGE_ID }}",
  "username": "{{ SENDER_USERNAME }}",
  "message": "{{ MESSAGE_TEXT }}"
}
```
**Client Action:** Adds formatted message to chat display

##### System Message
**Packet Name:** `system_message`  
**Direction:** Server → Client  
**Purpose:** Send system notification  
**Payload:**
```json
{
  "packet_type": "system_message",
  "message": "{{ SYSTEM_MESSAGE }}"
}
```
**Examples:** Player join/leave notifications, command responses

#### Error Responses
**Format:**
```json
{
  "error": "ERROR_CODE"
}
```
**Error Codes:**
- `"game-not-found"` - Specified game doesn't exist
- `"username-taken"` - Username already in use
- *(WIP)* - Additional error codes to be implemented

## Flow Examples

### Player Registration Flow
1. Client → Server: `player_register`
2. Server validates game exists and username available
3. Server → Client: `player_registered` (success) or error
4. Server sends initial terrain chunks via `terrain_chunk`
5. Server sends existing entities via `entity_load`
6. Server notifies other players via `system_message`

### Chat Message Flow
1. Client → Server: `chat_message_send`
2. Server processes commands or broadcasts message
3. Server → All Clients: `chat_message` or `system_message`

### Movement Flow
1. Client → Server: `entity_move`
2. Server validates and updates position
3. Server → Relevant Clients: `entity_move` (broadcast)
4. Server handles chunk/entity visibility updates

## Notes & TODOs

### Known Limitations
- Entity movement packets only accepted for player's own ID
- Limited command support in chat
- Basic error handling
- Inventory system partially implemented

### Work in Progress (WIP)
1. **Entity Death System**
   - Death sound effects
   - Corpse/Respawn mechanics
   - Score/stat tracking

2. **Enhanced Error Handling**
   - More specific error codes
   - Error message localization
   - Client-side error display

3. **Additional Commands**
   - More administrative commands
   - Gameplay commands (spawn items, etc.)
   - Moderator tools

4. **Performance Optimizations**
   - Entity visibility culling
   - Chunk loading optimizations
   - Packet compression

5. **Visual Feedback**
   - Damage indicators
   - Attack animations
   - Inventory UI updates

### Implementation Details
- Chunk size defined by `CHUNK_SIZE` constant
- Entity visibility based on chunk boundaries
- UUIDs used for unique identification
- Game state synchronized via shared mutex-protected structures