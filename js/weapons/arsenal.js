// Arsenal: glue between the mushroom weapons and Proj's engine (scene, camera, renderer, Player, Game).
// Owns the four guns, switches between them (1-4 / mouse wheel), feeds them input and player movement,
// does hitscan against the current room, and draws them with WeaponView.
//
// Hook-up:
//   Game.init()  -> Arsenal.init();
//   Game.loop()  -> if (this.state === 'playing') Arsenal.update(dt);
//                   replace renderer.render(scene, camera) with Arsenal.render();

const Arsenal = {
    weapons: {},
    current: null,
    view: null,
    ray: new THREE.Raycaster(),
    hud: null,
    // Called for every pellet that hits something: (hit, shot) where hit is a THREE.Raycaster
    // intersection. Point this at your enemy damage code later.
    onHit: null,

    init() {
        scene.add(camera); // the guns are children of the camera, so the camera must be in the scene
        this.view = new WeaponView(camera, { fov: 55 });
        this.view.shareLights(scene);
        for (const id of Weapons.order) {
            const w = new Weapon(id, { worldParent: scene, onShot: shot => this.shoot(shot) });
            this.view.attach(w);
            this.weapons[id] = w;
        }
        this.makeHud();
        this.select(Weapons.order[0]);

        const playing = () => typeof Game !== 'undefined' && Game.state === 'playing';
        addEventListener('mousedown', e => {
            if (playing() && e.button === 0) {
                this.current.setTrigger(true);
            }
        });
        addEventListener('mouseup', e => {
            if (e.button === 0) {
                this.current.setTrigger(false);
            }
        });
        addEventListener('wheel', e => {
            if (playing()) {
                const i = Weapons.order.indexOf(this.current.id);
                const n = Weapons.order.length;
                this.select(Weapons.order[(i + (e.deltaY > 0 ? 1 : n - 1)) % n]);
            }
        });
        addEventListener('keydown', e => {
            if (!playing() || e.repeat) {
                return;
            }
            const n = parseInt(e.key, 10);
            if (n >= 1 && n <= Weapons.order.length) {
                this.select(Weapons.order[n - 1]);
            }
            if (e.code === 'KeyR') {
                this.current.reload();
            }
        });
        document.addEventListener('mousemove', e => {
            if (playing()) {
                this.current.look(e.movementX, e.movementY);
            }
        });
        document.addEventListener('pointerlockchange', () => {
            if (!document.pointerLockElement) {
                this.current.setTrigger(false);
            }
        });
    },

    select(id) {
        if (this.current && this.current.id === id) {
            return;
        }
        if (this.current) {
            camera.remove(this.current.root);
            this.current.setTrigger(false);
            this.current.fx.clear();
        }
        this.current = this.weapons[id];
        camera.add(this.current.root);
        this.current.equip();
        this.updateHud();
    },

    update(dt) {
        const k = Input.keys;
        const speed = Math.hypot(Player.vel.x, Player.vel.z);
        const moving = k.KeyW || k.KeyA || k.KeyS || k.KeyD || k.ArrowUp || k.ArrowDown || k.ArrowLeft || k.ArrowRight;
        this.current.update(dt, {
            speed,
            sprinting: !!(k.ShiftLeft || k.ShiftRight) && moving && speed > CONFIG.walk + 0.5,
            grounded: Player.onGround
        });
        this.updateHud();
    },

    render() {
        renderer.render(scene, camera);
        this.view.render(renderer, scene);
    },

    // Hitscan every pellet against the current room and leave a little spore splash where it lands.
    shoot(shot) {
        const room = typeof Game !== 'undefined' && Game.room;
        if (!room) {
            return;
        }
        const color = Weapons.get(shot.weapon).color;
        for (const dir of shot.dirs) {
            this.ray.set(shot.origin, dir);
            this.ray.far = shot.range;
            const hit = this.ray.intersectObject(room.group, true)[0];
            if (!hit) {
                continue;
            }
            const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : dir.clone().negate();
            const fx = this.current.fx;
            for (let i = 0; i < 6; i++) {
                const v = WeaponKit.sphereDir().multiplyScalar(0.8).addScaledVector(n, 1.2);
                fx.emit({ world: true, pos: hit.point, vel: v, life: 0.35, size: 0.02, sizeEnd: 0.004, color, drag: 3, gravity: 2 });
            }
            fx.emit({ world: true, pos: hit.point.clone().addScaledVector(n, 0.02), vel: n.clone().multiplyScalar(0.3), life: 0.6, size: 0.04, sizeEnd: 0.14, color: 0xcfc6a8, additive: false, opacity: 0.35, drag: 3 });
            if (this.onHit) {
                this.onHit(hit, shot);
            }
        }
    },

    makeHud() {
        const hud = document.getElementById('hud');
        const el = document.createElement('div');
        el.style.cssText = 'position:fixed;right:16px;bottom:14px;text-align:right;color:#fff;font:600 14px system-ui,sans-serif;text-shadow:0 1px 3px #000a';
        el.innerHTML = '<div data-n style="opacity:.8"></div><div><span data-a style="font-size:30px"></span> <span data-m style="opacity:.6"></span></div>' +
            '<div style="height:3px;background:#fff3;margin-top:4px"><i data-r style="display:block;height:100%;width:0"></i></div>';
        (hud || document.body).appendChild(el);
        this.hud = {
            name: el.querySelector('[data-n]'),
            ammo: el.querySelector('[data-a]'),
            mag: el.querySelector('[data-m]'),
            bar: el.querySelector('[data-r]')
        };
    },

    updateHud() {
        const w = this.current;
        if (!this.hud || !w) {
            return;
        }
        this.hud.name.textContent = w.name;
        this.hud.ammo.textContent = w.ammo;
        this.hud.mag.textContent = '/ ' + w.stats.mag;
        this.hud.bar.style.width = (w.reloadProgress * 100) + '%';
        this.hud.bar.style.background = '#' + new THREE.Color(w.def.color).getHexString();
    }
};
