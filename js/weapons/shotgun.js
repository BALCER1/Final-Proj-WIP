// PUFFCAP BLUNDERBUSS - shotgun.
// Twin hollow-stalk barrels with flared gill bells, a puffball chamber with a hinged lid,
// a gill-collar pump, and a gnarled root stock wrapped in mycelium.
// Fire:   puffball squashes and blasts a cone of spores, then the pump racks and spits out a spent husk.
// Reload: gun rolls in, the puffball lid pops open, glowing spore pods arc in one at a time,
//         the lid slams shut in a cloud of dust, and the pump racks.

Weapons.register('shotgun', {
    name: 'Puffcap Blunderbuss',
    offset: [0.28, -0.19, -0.64],
    stats: {
        mag: 6, rate: 1.25, auto: false, damage: 9, pellets: 9, spread: 0.09, range: 40,
        reloadTime: 2.35, drawTime: 0.5,
        kick: { back: 0.12, up: 0.22, roll: 0.05 }
    },
    color: 0xb8ff4d,

    build(b, w) {
        const C = {
            stem: 0xe9dcc0, gill: 0xc79f78, cap: 0xa66c44, puff: 0xefe7d0,
            wood: 0x5c3b25, myc: 0xf6f2e8, glow: 0xb8ff4d, dark: 0x1b130c
        };
        const m = {
            stem: b.mat('stem', { color: C.stem }),
            gill: b.mat('gill', { color: C.gill, side: THREE.DoubleSide }),
            cap: b.mat('cap', { color: C.cap, roughness: 0.55 }),
            puff: b.mat('puff', { color: C.puff, flatShading: true, roughness: 0.95, side: THREE.DoubleSide }),
            wart: b.mat('wart', { color: 0xd8ccb0, flatShading: true }),
            wood: b.mat('wood', { color: C.wood, flatShading: true, roughness: 0.95 }),
            myc: b.mat('myc', { color: C.myc, roughness: 0.8 }),
            dark: b.mat('dark', { color: C.dark, roughness: 1, side: THREE.DoubleSide }),
            glow: b.glow('glow', C.glow, 1.2),
            inner: b.glow('inner', 0x6fae1e, 0.5)
        };
        const model = b.group();
        const by = 0.045; // barrel height

        // Barrels
        for (const x of [-0.031, 0.031]) {
            b.tubeZ(0.024, 0.03, 0.5, m.stem, model, [x, by, -0.33], { wobble: 0.0025, seed: x * 100 });
            b.tubeZ(0.043, 0.025, 0.07, m.gill, model, [x, by, -0.612], { open: true, seg: 18 });
            b.disc(0.024, m.dark, model, [x, by, -0.6], [0, Math.PI, 0]);
            b.ring(0.042, 0.006, m.cap, model, [x, by, -0.647]);
            b.ring(0.027, 0.005, m.gill, model, [x, by, -0.12]);
        }
        // Mycelium wrapped around both barrels
        const helix = [];
        for (let i = 0; i <= 44; i++) {
            const a = i * 0.62;
            helix.push([Math.cos(a) * 0.064, by + Math.sin(a) * 0.04, -0.13 - i * 0.0062]);
        }
        b.tube(helix, 0.0026, 0.0018, m.myc, model, { seg: 140, radial: 5, wobble: 0.002, freq: 90 });

        // Gill-collar pump
        const pump = b.part(b.group(model, [0, 0, -0.38]));
        b.tubeZ(0.062, 0.068, 0.095, m.cap, pump, [0, by - 0.006, 0], { seg: 20, wobble: 0.002 });
        b.ring(0.066, 0.008, m.gill, pump, [0, by - 0.006, -0.048]);
        b.ring(0.07, 0.008, m.gill, pump, [0, by - 0.006, 0.048]);
        for (let i = 0; i < 14; i++) {
            const a = Math.PI + (i / 13 - 0.5) * 2.4; // ridges underneath where a hand would grip
            b.box(0.006, 0.006, 0.08, m.gill, pump, [Math.sin(a) * 0.069, by - 0.006 + Math.cos(a) * 0.069, 0], [0, 0, -a]);
        }

        // Frame under the chamber
        b.tubeZ(0.034, 0.04, 0.2, m.stem, model, [0, 0.022, -0.01], { wobble: 0.002 });

        // Puffball chamber: open-topped body + hinged lid + six spore pods inside
        const R = 0.085;
        const cut = 0.86;
        const chamber = b.part(b.group(model, [0, 0.068, -0.02], null, [1, 0.86, 1.18]));
        b.sphere(R, m.puff, chamber, null, null, { ws: 24, hs: 16, t0: cut, tl: Math.PI - cut, wobble: 0.003, freq: 70 });
        const cy = R * Math.cos(cut);
        const cr = R * Math.sin(cut);
        b.disc(cr * 0.98, m.inner, chamber, [0, cy - 0.006, 0], [-Math.PI / 2, 0, 0]);
        const pods = [];
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + 0.5;
            const pod = b.sphere(0.014, m.glow, chamber, [Math.cos(a) * cr * 0.58, cy, Math.sin(a) * cr * 0.58], [1, 0.85, 1], { ws: 10, hs: 8 });
            pods.push(b.part(pod));
        }
        const lid = b.part(b.group(chamber, [0, cy, cr]));
        b.sphere(R, m.puff, lid, [0, -cy, -cr], null, { ws: 24, hs: 10, tl: cut, wobble: 0.003, freq: 70 });
        const lidSprout = b.part(b.mini(lid, [0, R - cy - 0.004, -cr], 0.03, m.cap, m.stem));
        // warts on the puffball
        const rnd = WeaponKit.rng(7);
        const wartGeo = new THREE.ConeGeometry(0.004, 0.007, 5);
        for (let i = 0; i < 26; i++) {
            const th = WeaponKit.lerp(cut + 0.15, Math.PI - 0.3, rnd());
            const ph = rnd() * Math.PI * 2;
            const n = new THREE.Vector3(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph));
            const wart = b.mesh(wartGeo, m.wart, chamber);
            wart.position.copy(n).multiplyScalar(R * 0.99);
            wart.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
        }

        // Grip, trigger and root stock
        b.tube([[0, 0.01, 0.04], [0, -0.05, 0.06], [0, -0.115, 0.09]], 0.022, 0.019, m.wood, model, { wobble: 0.003, ends: true });
        b.ring(0.024, 0.0035, m.stem, model, [0, -0.012, 0.0], [0, Math.PI / 2, 0], { arc: Math.PI });
        b.box(0.005, 0.022, 0.008, m.gill, model, [0, -0.01, 0.005], [0.3, 0, 0]);
        b.tube([[0, 0.02, 0.08], [0, 0.005, 0.17], [0, -0.025, 0.26], [0, -0.07, 0.34]], 0.034, 0.046, m.wood, model, { wobble: 0.005, freq: 30, ends: true });
        b.tube([[0.01, 0.0, 0.2], [0.04, -0.03, 0.24], [0.05, -0.07, 0.27]], 0.009, 0.003, m.wood, model, { wobble: 0.002, seg: 12 });
        b.tube([[-0.01, -0.02, 0.25], [-0.04, -0.06, 0.28], [-0.045, -0.1, 0.3]], 0.008, 0.002, m.wood, model, { wobble: 0.002, seg: 12 });
        b.tube([[0.03, 0.02, 0.1], [0.036, 0.005, 0.18], [0.03, -0.02, 0.25]], 0.003, 0.002, m.myc, model, { seg: 16, radial: 5 });

        // Little mushrooms sprouting along the barrels (they jiggle)
        const sprouts = [
            b.mini(model, [0, by + 0.028, -0.22], 0.026, m.cap, m.stem, [0, 0, 0.2]),
            b.mini(model, [0.012, by + 0.026, -0.27], 0.018, m.cap, m.stem, [0, 0, -0.3]),
            b.mini(model, [-0.03, 0.005, 0.2], 0.022, m.cap, m.stem, [0, 0, 0.9])
        ].map(s => b.part(s));

        const muzzle = b.group(model, [0, by, -0.66]);
        const flash = b.flash(muzzle, [0, 0, -0.02], C.glow, 0.09, 4);
        b.part(model);

        return { model, chamber, lid, lidSprout, pump, pods, sprouts, muzzle, flashes: [flash], m };
    },

    init(w) {
        w.data.jiggle = new Spring(160, 6);
    },

    onFire(w) {
        w.data.jiggle.kick(9);
    },

    // Timing for each pod that flies in during a reload.
    podWindow(w, k) {
        const missing = w.stats.mag - w.reloadFrom;
        const start = 0.4 + k * (1.0 / Math.max(1, missing));
        return [start, start + 0.26];
    },

    pose(w, dt) {
        const P = w.parts;
        const K = WeaponKit;
        const f = w.fireT;
        const r = w.reloadT;
        P.m.glow.emissiveIntensity = 1 + Math.sin(w.time * 3.2) * 0.3;
        P.m.inner.emissiveIntensity = 0.35 + 0.15 * Math.sin(w.time * 2.1);

        w.data.jiggle.update(dt);
        P.sprouts.forEach((s, i) => {
            s.rotation.z += w.data.jiggle.x * (i % 2 ? -0.06 : 0.05);
            s.rotation.x += w.data.jiggle.x * 0.04;
        });

        // Fire: puffball squash, then pump rack
        if (f < 0.7) {
            const sq = K.hump(f, 0, 0.14) * 0.2;
            P.chamber.scale.y *= 1 - sq;
            P.chamber.scale.x *= 1 + sq * 0.45;
            P.chamber.scale.z *= 1 + sq * 0.3;
            P.lid.rotation.x += K.hump(f, 0, 0.1) * 0.25;
            const rack = K.e('outCubic', f, 0.24, 0.36) - K.e('inOutCubic', f, 0.4, 0.56);
            P.pump.position.z += rack * 0.075;
            P.model.rotation.z += rack * 0.13;
            P.model.rotation.x += rack * 0.05;
            P.model.position.y -= rack * 0.012;
        }

        // Pods show the ammo count
        P.pods.forEach((pod, i) => {
            pod.visible = i < w.ammo;
        });

        if (r >= 0) {
            const tilt = K.e('outCubic', r, 0, 0.32) * (1 - K.e('inOutCubic', r, 1.75, 2.15));
            // muzzle lifts and the gun rolls in so the open chamber faces you
            P.model.rotation.z += tilt * 0.45;
            P.model.rotation.x += tilt * 0.38;
            P.model.rotation.y += tilt * 0.12;
            P.model.position.x -= tilt * 0.1;
            P.model.position.y += tilt * 0.01;

            const open = K.e('outBack', r, 0.12, 0.38) * (1 - K.e('inCubic', r, 1.48, 1.6));
            P.lid.rotation.x += open * 1.95;
            P.lidSprout.rotation.x -= open * 0.4;
            const slam = K.hump(r, 1.6, 1.78);
            P.chamber.scale.y *= 1 - slam * 0.12;
            P.chamber.scale.x *= 1 + slam * 0.06;
            if (w.atAct(1.6)) {
                w.data.jiggle.kick(7);
            }

            const missing = w.stats.mag - w.reloadFrom;
            for (let k = 0; k < missing; k++) {
                const pod = P.pods[w.reloadFrom + k];
                const [a, z] = this.podWindow(w, k);
                const p = K.seg(r, a, z);
                pod.visible = p > 0;
                if (p > 0 && p < 1) {
                    const e = K.ease.inOutSine(p);
                    const rest = pod.userData.rest.p;
                    pod.position.set(
                        K.lerp(0.13, rest.x, e),
                        K.lerp(-0.13, rest.y, e) + Math.sin(e * Math.PI) * 0.08,
                        K.lerp(0.09, rest.z, e)
                    );
                    pod.scale.multiplyScalar(K.lerp(1.6, 1, e));
                } else if (p >= 1) {
                    const pop = K.hump(r, z, z + 0.12);
                    pod.scale.multiplyScalar(1 + pop * 0.35);
                }
            }

            const rack = K.e('outCubic', r, 1.82, 1.94) - K.e('inOutCubic', r, 1.98, 2.14);
            P.pump.position.z += rack * 0.075;
            P.model.rotation.z += rack * 0.1;
        }
    },

    effects(w, dt) {
        const P = w.parts;
        const fx = w.fx;
        const K = WeaponKit;
        const glow = this.color;

        if (w.atFire(0)) {
            const o = w.worldPos(P.muzzle);
            const d = w.worldDir(P.muzzle);
            for (let i = 0; i < 26; i++) {
                fx.emit({
                    world: true, pos: o, vel: K.cone(d, 0.28).multiplyScalar(K.rand(2.5, 6)),
                    life: K.rand(0.3, 0.6), size: K.rand(0.008, 0.014), sizeEnd: 0.002, color: glow, drag: 2.6, stretch: 0.01
                });
            }
            for (let i = 0; i < 7; i++) {
                fx.emit({
                    world: true, pos: o, vel: K.cone(d, 0.5).multiplyScalar(K.rand(0.6, 1.8)),
                    life: K.rand(0.6, 1.0), size: 0.025, sizeEnd: K.rand(0.07, 0.11), color: 0xc9d9a0,
                    additive: false, opacity: 0.4, drag: 3.5, gravity: -0.25, fadeIn: 0.05
                });
            }
            fx.emit({ world: true, shape: 'ring', pos: o, dir: d, vel: d.clone().multiplyScalar(1.5), life: 0.2, size: 0.03, sizeEnd: 0.14, color: glow, opacity: 0.8 });
        }
        if (w.atFire(0.33)) {
            // spent husk out of the right side when the pump racks
            const p = w.localPos(P.chamber, [0.07, 0.03, 0]);
            fx.emit({ pos: p, vel: new THREE.Vector3(1.3, 1.1, 0.5), life: 0.8, size: 0.013, sizeEnd: 0.011, color: 0x7e6440, additive: false, gravity: 6, drag: 0.4 });
            for (let i = 0; i < 4; i++) {
                fx.emit({ pos: p, vel: K.sphereDir().multiplyScalar(0.3).add(new THREE.Vector3(0.4, 0.3, 0)), life: 0.5, size: 0.004, color: glow, drag: 2 });
            }
        }

        const r = w.reloadT;
        if (r < 0) {
            return;
        }
        if (w.atAct(0.16)) {
            const p = w.localPos(P.chamber, [0, 0.07, 0]);
            for (let i = 0; i < 10; i++) {
                fx.emit({ pos: p, vel: K.sphereDir().multiplyScalar(0.25).add(new THREE.Vector3(0, 0.25, 0)), life: 0.6, size: 0.006, sizeEnd: 0.02, color: 0xd9d0b0, additive: false, opacity: 0.5, drag: 3 });
            }
        }
        // trail on flying pods + sparkle when they land
        const missing = w.stats.mag - w.reloadFrom;
        for (let k = 0; k < missing; k++) {
            const pod = P.pods[w.reloadFrom + k];
            const [a, z] = this.podWindow(w, k);
            if (r > a && r < z) {
                const n = fx.rate('trail' + k, 90, dt);
                for (let i = 0; i < n; i++) {
                    fx.emit({ pos: w.localPos(pod), vel: K.sphereDir().multiplyScalar(0.05), life: 0.3, size: 0.006, sizeEnd: 0, color: glow, drag: 1 });
                }
            }
            if (w.atAct(z)) {
                const p = w.localPos(pod);
                for (let i = 0; i < 8; i++) {
                    fx.emit({ pos: p, vel: K.sphereDir().multiplyScalar(0.35).add(new THREE.Vector3(0, 0.2, 0)), life: 0.35, size: 0.004, color: glow, drag: 3 });
                }
            }
        }
        if (w.atAct(1.6)) {
            const c = w.localPos(P.chamber, [0, 0.05, 0]);
            for (let i = 0; i < 18; i++) {
                const a = (i / 18) * Math.PI * 2;
                fx.emit({
                    pos: c, vel: new THREE.Vector3(Math.cos(a) * 0.5, K.rand(0.05, 0.25), Math.sin(a) * 0.5),
                    life: 0.7, size: 0.006, sizeEnd: 0.026, color: 0xdcd3b4, additive: false, opacity: 0.55, drag: 4.5
                });
            }
        }
    }
});
