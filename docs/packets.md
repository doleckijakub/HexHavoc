### Player registration

1. *client &rarr; server*
```json
{
  "packet_type": "player_register",
  "game_id": "{{ GAME_ID }}",
  "username": "{{ USERNAME }}"
}
```

2. *server &rarr; client*
i. Success
```json
{
  "packet_type": "player_registered",
  "id": "{{ PLAYER_ID }}"
}
```
ii. Game not found
```json
{
  "error": "game-not-found"
}
```
iii. Username taken
```json
{
  "error": "username-taken"
}
```

### Terrain updates
**Updates are sent automatically and do not need to be requested**
```json
{
  "packet_type": "terrain_chunk",
  "chunk": {
  	"position": { "x": X, "y": Y },
    "contents": [
      "CHUNK_TILE_0",
      "CHUNK_TILE_1",
      ...
    ]
  }
}
```