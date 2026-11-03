// Arsenal: glue between the mushroom weapons and Proj's engine (scene, camera, renderer, Player, Game).
// Owns the four guns, switches between them (1-4 / mouse wheel), feeds them input and player movement,
// does hitscan against the current room, and draws them with WeaponView.
// Controls: LMB fire, RMB alt fire (charge / burst / scope / throw), R reload, F inspect.
//
// Hook-up (see WEAPONS.md):
//   Game.init()  -> Arsenal.init();
//   Game.loop()  -> if (this.state === 'playing') Arsenal.update(dt);
//                   replace renderer.render(scene, camera) with Arsenal.render();

const Arsenal = {
    weapons: {},
    current: null,
    view: null,
    ray: new THREE.Raycaster(),
    hud: null,
    // Called for every pellet that hits something: (hit, shot) where hit is { point, normal, object,
    // distance }. Point this at your enemy damage code later.
    onHit: null,

    init() {
        scene.add(camera); // the guns are children of the camera, so the camera must be in the scene
        this.view = new WeaponView(camera, { fov: 55 });
        this.view.shareLights(scene);
        this.view.addLights();
        this.scope = new ScopeOverlay();
        // slow the mouse down while scoped in
        const look = Player.look.bind(Player);
        Player.look = (dx, dy) => {
            const k = this.scope.sensitivity(this.current);
            look(dx * k, dy * k);
        };
        for (const id of Weapons.order) {
            const w = new Weapon(id, {
                worldParent: scene,
                trace: (origin, dir, range) => this.trace(origin, dir, range),
                onShot: shot => this.shoot(shot)
            });
            this.view.attach(w);
            this.weapons[id] = w;
        }
        this.makeHud();
        this.select(Weapons.order[0]);

        const playing = () => typeof Game !== 'undefined' && Game.state === 'playing';
        addEventListener('mousedown', e => {
            if (!playing()) {
                return;
            }
            if (e.button === 0) {
                this.current.setTrigger(true);
            } else if (e.button === 2) {
                this.current.setAlt(true);
            }
        });
        addEventListener('mouseup', e => {
            if (e.button === 0) {
                this.current.setTrigger(false);
            } else if (e.button === 2) {
                this.current.setAlt(false);
            }
        });
        addEventListener('contextmenu', e => {
            if (playing()) {
                e.preventDefault();
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
            if (e.code === 'KeyF') {
                this.current.inspect();
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
                this.current.setAlt(false);
                this.current.zoom = 0;
                this.scope.update(this.current, camera, CONFIG.fov);
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
            this.current.setAlt(false);
            this.current.clearEffects();
        }
        this.current = this.weapons[id];
        camera.add(this.current.root);
        this.current.equip();
        this.updateHud();
    },

    // Entering a new room: drop anything still in flight (spores, projectiles, a thrown pistol)
    // and redraw the current gun, so nothing from the old room carries over.
    reset() {
        const w = this.current;
        w.setTrigger(false);
        w.setAlt(false);
        w.clearEffects();
        w.equip();
        this.scope.update(w, camera, CONFIG.fov);
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
        const z = this.scope.update(this.current, camera, CONFIG.fov);
        const cross = document.getElementById('cross');
        if (cross) {
            cross.hidden = z > 0.6;
        }
        this.updateHud();
    },

    render() {
        renderer.render(scene, camera);
        this.view.render(renderer, scene);
    },

    // Where a pellet lands in the current room. The weapon flies its projectile there and splashes it.
    trace(origin, dir, range) {
        const room = typeof Game !== 'undefined' && Game.room;
        if (!room) {
            return null;
        }
        this.ray.set(origin, dir);
        this.ray.far = range;
        const hit = this.ray.intersectObject(room.group, true)[0];
        if (!hit) {
            return null;
        }
        const normal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : dir.clone().negate();
        return { point: hit.point, normal, object: hit.object, distance: hit.distance };
    },

    // Damage is instant (hitscan); shot.hits[i] is what pellet i hit, or null.
    shoot(shot) {
        if (!this.onHit || !shot.hits) {
            return;
        }
        shot.hits.forEach(hit => {
            if (hit) {
                this.onHit(hit, shot);
            }
        });
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
        this.hud.name.textContent = w.name + (w.def.altName ? '  ·  RMB ' + w.def.altName : '');
        this.hud.ammo.textContent = w.ammo;
        this.hud.mag.textContent = '/ ' + w.stats.mag;
        // the bar shows reload progress, or the shotgun's charge while charging
        const charge = w.state === 'charge' ? w.data.charge : 0;
        this.hud.bar.style.width = (Math.max(w.reloadProgress, charge) * 100) + '%';
        this.hud.bar.style.background = '#' + new THREE.Color(w.def.color).getHexString();
    }
};
