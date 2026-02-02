### Transport

* WebSocket
* JSON
* Stateless packets

---

### Packet Categories

| Category       | Direction       |
| -------------- | --------------- |
| PlayerRegister | Client → Server |
| TerrainChunk   | Server → Client |
| EntityLoad     | Server → Client |
| EntityMove     | Both            |
| PlayerAttack   | Client → Server |
| EntityDamage   | Server → Client |
| ChatMessage    | Both            |

---

### Example Packet

```json
{
  "packet_type": "entity_move",
  "id": "uuid",
  "new_position": {"x": 10, "y": 12}
}
```