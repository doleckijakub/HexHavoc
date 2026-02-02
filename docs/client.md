### Client Responsibilities

* Render world
* Handle input
* Send intent packets
* Maintain local cache of entities & chunks

---

### Game Loop

```text
requestAnimationFrame
 ├─ update()
 ├─ render()
 └─ animate()
```

---

### Rendering Pipeline

1. Terrain pass
2. Entity sprite pass
3. Text overlays
4. Health bars
5. Debug hitboxes (optional)

All rendering uses custom GLSL shaders.

---

### Input Model

| Input        | Action    |
| ------------ | --------- |
| WASD         | Movement  |
| Mouse        | Aim       |
| LMB          | Attack    |
| Scroll / 1–6 | Inventory |
| Enter        | Chat      |
| /            | Command   |