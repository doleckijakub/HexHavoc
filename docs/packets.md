### Player registration

1. *client &rarr; server*
```json
{
  "packet_type": "player_register",
  "game_id": "{{ GAME_ID }}",
  "username": "{{ USERNAME }}"
}
```

2.1. *server &rarr; client*
```json
{
  "packet_type": "player_registered",
  "id": "{{ PLAYER_ID }}"
}
```