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

### Chat related packets

1. *client &rarr; server*
```json
{
  "packet_type": "chat_message_send",
  "message": "{{ MESSAGE }}"
}
```

2. *server &rarr; client*
i. Success
```json
{
  "packet_type": "chat_message",
  "id": "{{ MESSAGE_ID }}",
  "username": "{{ USERNAME }}",
  "message": "{{ MESSAGE }}"
}
```

3. *server &rarr; client*
i. System message
```json
{
  "packet_type": "system_message",
  "message": "{{ MESSAGE }}"
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