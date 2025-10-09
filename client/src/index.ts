import { Vec2 } from '@core/Vec2';
import { Color } from '@core/Color';

const color = Color.hex('#ff00ff');
console.log(new Vec2(0, 0));
console.log(color);

enum TerrainTileType {
    EMPTY,
    GRASS,
    DIRT,
    SAND,
    CLAY,
}

enum TerrainEntityType {
    TREE,
    STONE,
}

type EntityType = TerrainEntityType /* | ... */;

class Entity {
    id: string;
    position: Vec2;
    ty: EntityType;
}

interface EntityMovePacket {
    packet_type: 'entity_move'
    id: number,
    new_position: Vec2,
}

interface TerrainChunk {
    position: Vec2,
    contents: TerrainTileType[],
}

interface TerrainChunkPacket { // sent whenever the player "loads it"
    packet_type: 'terrain_chunk',
    chunk: TerrainChunk,
}

interface EntityLoadPacket {
    packet_type: 'entity_load',
    entity: Entity,
}

interface EntityUnloadPacket {
    packet_type: 'entity_unload',
    id: string,
}

interface PlayerRegisterPacket {
    packet_type: 'player_register';
    username: string;
}

interface PlayerRegisteredPacket {
    packet_type: 'player_registered',
    id: string,
}

type Packet = 
    EntityMovePacket | EntityLoadPacket | EntityUnloadPacket |
    TerrainChunkPacket |
    PlayerRegisterPacket | PlayerRegisteredPacket;



const CONFIG = {
    KEY_UP: 'w',
    KEY_DOWN: 's',
    KEY_LEFT: 'a',
    KEY_RIGHT: 'd'
};

/* Do rozważenia może później:
enum ClientState {
    INITIAL,
    AWAITING_START,
    IN_GAME,
};
*/

const WS_URL = 'ws://localhost:3000';

class Game {
    private ws: WebSocket;

    private canvas: HTMLCanvasElement;
    private cc: CanvasRenderingContext2D;
    private player_id?: string;

    constructor({ wsUrl }: { wsUrl: string }) {
        this.ws = new WebSocket(wsUrl);
        const canvas = document.querySelector('canvas');
        
        if (!canvas) throw new Error('No canvas found');
        this.canvas = canvas;

        const cc = this.canvas.getContext('2d');
        if (!cc) throw new Error('No 2D context found');
        this.cc = cc;

        this.ws.onmessage = (ev: MessageEvent<any>): void => {
            this.recv(JSON.parse(ev.data))
        }
    }

    private recv(packet: Packet): void {
        switch (packet.packet_type) {
            case 'player_registered': this.onPlayerRegistered(packet); break;
        }
    }

    private onPlayerRegistered(packet: PlayerRegisteredPacket): void {
        this.player_id = packet.id;
    }

    private send(packet: Packet): void {
        this.ws.send(JSON.stringify(packet));
    }

    private updatePlaying() {
        // rendering

        // update logic: interpolate movement
        /// my player movement
    }

    private update(timestamp: DOMHighResTimeStamp) {
        if (this.player_id) {
            this.updatePlaying();
        } else {
            /// render text that you are waiting for ACK
        }

        requestAnimationFrame(this.update);
    }

    public run() {
        const registerPacket: PlayerRegisterPacket = {
            packet_type: 'player_register',
            username: 'mdd',
        };

        this.send(registerPacket);

        const keyboard: Record<string, boolean> = {};

        function isKeyPressed(key: string): boolean {
            return keyboard[key] || false;
        }

        document.addEventListener('keydown', event => keyboard[event.key] = true);
        document.addEventListener('keyup', event => keyboard[event.key] = false);

        const terrain = {}; // "0,0": {}, "1,0": {}

        requestAnimationFrame(this.update);
    }
}

console.log(Game);
