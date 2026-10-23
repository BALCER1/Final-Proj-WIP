// Core three.js setup, input, player movement and the RoomBuilder that every room uses.

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(CONFIG.fov, innerWidth / innerHeight, 0.1, 400);
camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.prepend(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0xd0d0d0, 0.75));
const sun = new THREE.DirectionalLight(0xffffff, 0.45);
sun.position.set(6, 10, 4);
scene.add(sun);

addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});

const Input = {
    keys: {},
    init() {
        addEventListener('keydown', e => {
            this.keys[e.code] = true;
            if (e.code === 'Space') {
                e.preventDefault();
            }
        });
        addEventListener('keyup', e => {
            this.keys[e.code] = false;
        });
        addEventListener('blur', () => {
            this.keys = {};
        });
    }
};

const Player = {
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    onGround: false,
    room: null,

    reset(room) {
        const spawn = room.spawn;
        this.room = room;
        this.pos.set(spawn.x, 0, spawn.z);
        this.vel.set(0, 0, 0);
        this.yaw = spawn.yaw;
        this.pitch = 0;
        this.syncCamera();
    },

    look(dx, dy) {
        this.yaw -= dx * CONFIG.sensitivity;
        this.pitch = Math.max(-1.55, Math.min(1.55, this.pitch - dy * CONFIG.sensitivity));
    },

    hits(p) {
        const r = CONFIG.radius;
        const h = CONFIG.height;

        for (const b of this.room.colliders) {
            if (
                !b.off &&
                p.x + r > b.min.x &&
                p.x - r < b.max.x &&
                p.z + r > b.min.z &&
                p.z - r < b.max.z &&
                p.y + h > b.min.y &&
                p.y < b.max.y
            ) {
                return b;
            }
        }
        return null;
    },

    slide(p, axis) {
        if (!this.hits(p)) {
            return;
        }
        if (this.onGround) {
            const y = p.y;
            p.y = y + CONFIG.step;
            if (!this.hits(p)) {
                return;
            }
            p.y = y;
        }
        p[axis] = this.pos[axis];
        this.vel[axis] = 0;
    },

    update(dt) {
        const k = Input.keys;
        const fwd = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
        const str = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
        const speed = k.ShiftLeft || k.ShiftRight ? CONFIG.sprint : CONFIG.walk;

        const sin = Math.sin(this.yaw);
        const cos = Math.cos(this.yaw);
        let wx = str * cos - fwd * sin;
        let wz = -str * sin - fwd * cos;
        const len = Math.hypot(wx, wz);
        if (len > 0) {
            wx = wx / len * speed;
            wz = wz / len * speed;
        }

        const t = 1 - Math.exp(-CONFIG.accel * dt);
        this.vel.x += (wx - this.vel.x) * t;
        this.vel.z += (wz - this.vel.z) * t;

        if (k.Space && this.onGround) {
            this.vel.y = CONFIG.jump;
            this.onGround = false;
        }
        this.vel.y -= CONFIG.gravity * dt;

        const p = this.pos.clone();
        p.x += this.vel.x * dt;
        this.slide(p, 'x');
        p.z += this.vel.z * dt;
        this.slide(p, 'z');
        const wasGround = this.onGround;
        p.y += this.vel.y * dt;
        this.onGround = false;
        const hit = this.hits(p);
        if (hit) {
            if (this.vel.y < 0) {
                p.y = hit.max.y;
                this.onGround = true;
            } else {
                p.y = this.pos.y;
            }
            this.vel.y = 0;
        }
        const gy = this.room.rampHeight(p.x, p.z);
        if (gy !== null && this.vel.y <= 0 && (p.y <= gy || (wasGround && p.y - gy < 0.6))) {
            p.y = gy;
            this.vel.y = 0;
            this.onGround = true;
        }
        if (p.y <= 0) {
            p.y = 0;
            this.vel.y = 0;
            this.onGround = true;
        }
        this.pos.copy(p);
        this.syncCamera();
    },

    syncCamera() {
        camera.position.set(this.pos.x, this.pos.y + CONFIG.eye, this.pos.z);
        camera.rotation.set(this.pitch, this.yaw, 0);
    }
};

// Everything a room creates goes through a RoomBuilder so it can all be
// thrown away (GPU memory included) the moment the player leaves the room.
class RoomBuilder {
    constructor() {
        this.group = new THREE.Group();
        this.colliders = [];
        this.ramps = [];
        this.door = null;
        this.spawn = { x: 0, z: 0, yaw: 0 };
        this.background = 0x000000;
        this.fog = null;
        scene.add(this.group);
    }
    rampHeight(x, z) {
        for (const r of this.ramps) {
            if (x >= r.x0 && x <= r.x1 && z >= r.zFar && z <= r.zNear) {
                return Math.max(0, Math.min(r.top, r.slope * (r.zRef - z)));
            }
        }
        return null;
    }
    mat(color) {
        return new THREE.MeshLambertMaterial({ color });
    }
    deco(x, y, z, w, h, d, color) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.mat(color));
        mesh.position.set(x, y + h / 2, z);
        this.group.add(mesh);
        return mesh;
    }
    solid(x, y, z, w, h, d) {
        const c = {
            min: new THREE.Vector3(x - w / 2, y, z - d / 2),
            max: new THREE.Vector3(x + w / 2, y + h, z + d / 2),
            off: false
        };
        this.colliders.push(c);
        return c;
    }
    box(x, y, z, w, h, d, color) {
        this.solid(x, y, z, w, h, d);
        return this.deco(x, y, z, w, h, d, color);
    }
    // Unlit black box, used for the "darkness" behind doors.
    dark(x, y, z, w, h, d, isSolid = true) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        mesh.position.set(x, y + h / 2, z);
        this.group.add(mesh);
        if (isSolid) {
            this.solid(x, y, z, w, h, d);
        }
        return mesh;
    }
    dispose() {
        scene.remove(this.group);
        this.group.traverse(o => {
            if (o.geometry) {
                o.geometry.dispose();
            }
            if (o.material) {
                o.material.dispose();
            }
        });
        this.colliders.length = 0;
    }
}
