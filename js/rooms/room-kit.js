// Room registry plus the shared pieces (basic box room, exit door) that room files build from.
// Each room type lives in its own file in this folder and calls Rooms.register().

const Rooms = {
    defs: {},
    order: [],
    register(type, def) {
        def.type = type;
        this.defs[type] = def;
        this.order.push(type);
    },
    get(type) {
        return this.defs[type];
    },
    all() {
        return this.order.map(t => this.defs[t]);
    },
    css(color) {
        return '#' + new THREE.Color(color).getHexString();
    }
};

class Door {
    constructor(b, x, z, w, h, color) {
        this.x = x;
        this.z = z;
        this.t = 0;
        this.isOpen = false;
        this.pivot = new THREE.Group();
        this.pivot.position.set(x - w / 2, 0, z - 0.25);
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), b.mat(color));
        leaf.position.set(w / 2, h / 2, 0);
        this.pivot.add(leaf);
        b.group.add(this.pivot);
        this.collider = b.solid(x, 0, z - 0.25, w, h, 0.3);
    }
    near(pos) {
        return Math.hypot(pos.x - this.x, pos.z - this.z) < 3;
    }
    open() {
        this.isOpen = true;
        this.collider.off = true;
    }
    // True once the player has walked through the doorway into the dark beyond.
    passed(pos) {
        return pos.z < this.z - 1.2;
    }
    update(dt) {
        if (this.isOpen && this.t < 1) {
            this.t = Math.min(1, this.t + dt * 1.5);
            const e = this.t * this.t * (3 - 2 * this.t);
            this.pivot.rotation.y = e * 1.6;
        }
    }
}

const RoomKit = {
    shade(color, k) {
        return new THREE.Color(color).multiplyScalar(k).getHex();
    },
    // A plain rectangular room. The player spawns at the +z end facing the exit door at the -z end.
    basicRoom(b, o) {
        const W = (o.width || 14) / 2;
        const L = (o.length || 22) / 2;
        const H = o.height || 5;
        const T = 0.5;
        const wall = o.wall || o.color;
        const floor = o.floor || this.shade(o.color, 0.85);
        const ceiling = o.ceiling || this.shade(o.color, 0.95);
        const dw = 2.4;
        const dh = 3.2;
        const side = W - dw / 2;

        b.deco(0, -0.1, 0, W * 2, 0.1, L * 2, floor);
        b.deco(0, H, 0, W * 2, 0.1, L * 2, ceiling);
        b.box(-W - T / 2, 0, 0, T, H, L * 2 + T * 2, wall);
        b.box(W + T / 2, 0, 0, T, H, L * 2 + T * 2, wall);
        b.box(0, 0, L + T / 2, W * 2, H, T, wall);

        b.box(-(dw / 2 + side / 2), 0, -L - T / 2, side, H, T, wall);
        b.box(dw / 2 + side / 2, 0, -L - T / 2, side, H, T, wall);
        b.box(0, dh, -L - T / 2, dw, H - dh, T, wall);

        const depth = 4;
        const cz = -L - T - depth / 2;
        b.dark(0, -0.1, cz, dw + 1, 0.1, depth, false);
        b.dark(0, dh, cz, dw + 1, 0.1, depth, false);
        b.dark(-dw / 2 - 0.25, 0, cz, 0.5, dh, depth);
        b.dark(dw / 2 + 0.25, 0, cz, 0.5, dh, depth);
        b.dark(0, 0, -L - T - depth - 0.25, dw + 1, dh, 0.5);

        b.door = new Door(b, 0, -L, dw, dh, o.doorColor || 0x5b4130);
        b.spawn = { x: 0, z: L - 2, yaw: 0 };
    }
};
