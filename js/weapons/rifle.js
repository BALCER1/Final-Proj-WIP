// MOREL CARBINE - automatic rifle.
// A honeycombed morel receiver, a long stalk barrel with gill collars, bracket fungi along the
// handguard, a glass spore vial for a magazine and a flat mushroom-cap butt pad.
// Fire:   quick kicks, the side gills flash, the vial's golden powder sloshes and drains.
// Reload: gun rolls over, the cap hatch on top flips open, a spore pouch swings in, tips and
//         POURS a stream of glowing powder in while the vial visibly fills, then hatch snaps shut
//         and the mushroom-knob bolt is racked.

Weapons.register('rifle', {
    name: 'Morel Carbine',
    offset: [0.27, -0.17, -0.58],
    stats: {
        mag: 24, rate: 8.5, auto: true, damage: 14, pellets: 1, spread: 0.014, range: 120,
        reloadTime: 2.6, drawTime: 0.45,
        kick: { back: 0.028, up: 0.04, roll: 0.02 }
    },
    color: 0xffc44a,

    build(b) {
        const C = {
            stem: 0xdfcaa6, morel: 0x7a5434, gill: 0xb48a63, cap: 0x8b5a34, bracket: 0xc77b3a,
            bracket2: 0xe9c48a, wood: 0x4f3422, gold: 0xffc44a, dark: 0x1b120b, pouch: 0xc8b083, myc: 0xf6f2e8
        };
        const m = {
            stem: b.mat('stem', { color: C.stem }),
            morel: b.mat('morel', { color: C.morel, flatShading: true, roughness: 0.9 }),
            gill: b.mat('gill', { color: C.gill, side: THREE.DoubleSide }),
            cap: b.mat('cap', { color: C.cap, roughness: 0.55 }),
            bracket: b.mat('bracket', { color: C.bracket, roughness: 0.6, side: THREE.DoubleSide }),
            bracket2: b.mat('bracket2', { color: C.bracket2, roughness: 0.6, side: THREE.DoubleSide }),
            wood: b.mat('wood', { color: C.wood, flatShading: true, roughness: 0.95 }),
            dark: b.mat('dark', { color: C.dark, roughness: 1, side: THREE.DoubleSide }),
            glass: b.glass('glass', 0xfff4dd, 0.3),
            liquid: b.glow('liquid', C.gold, 1.1),
            gills: b.glow('gillGlow', C.gold, 0.2, { color: C.gill }),
            hatchGlow: b.glow('hatchGlow', C.gold, 0.6),
            pouch: b.mat('pouch', { color: C.pouch, flatShading: true, roughness: 0.95 }),
            myc: b.mat('myc', { color: C.myc })
        };
        const model = b.group();

        // Barrel with gill collars and a morel-tip muzzle
        b.tubeZ(0.0135, 0.017, 0.58, m.stem, model, [0, 0.012, -0.43], { wobble: 0.0015 });
        for (const z of [-0.47, -0.58, -0.66]) {
            b.ring(0.018, 0.005, m.gill, model, [0, 0.012, z]);
        }
        const tip = b.lathe([[0.016, 0], [0.022, 0.012], [0.02, 0.03], [0.014, 0.048], [0.011, 0.052]], m.morel, model, [0, 0.012, -0.71], [-Math.PI / 2, 0, 0], { seg: 18 });
        b.displace(tip.geometry, v => 0.002 * Math.sin(Math.atan2(v.z, v.x) * 7) * Math.sin(v.y * 300));
        b.disc(0.011, m.dark, model, [0, 0.012, -0.76], [0, Math.PI, 0]);
        b.part(b.mini(model, [0, 0.026, -0.645], 0.02, m.cap, m.stem));

        // Handguard + bracket fungi stacked on both sides
        b.tubeZ(0.027, 0.031, 0.22, m.stem, model, [0, 0.008, -0.27], { wobble: 0.002 });
        const brackets = [];
        for (const side of [-1, 1]) {
            [[-0.2, 0.028, 0.03, m.bracket], [-0.255, 0.012, 0.026, m.bracket2], [-0.31, 0.024, 0.022, m.bracket]].forEach(([z, y, r, mat], i) => {
                // half-dome shelf fungus sticking out sideways (+x before the side flip)
                const g = b.group(model, [side * 0.026, y, z], [0, side > 0 ? 0 : Math.PI, 0]);
                b.mesh(new THREE.SphereGeometry(r, 16, 6, Math.PI / 2, Math.PI, 0, Math.PI / 2), mat, g, null, null, [1, 0.32, 1]);
                b.ring(r * 0.98, 0.0025, m.gill, g, null, [Math.PI / 2, 0, -Math.PI / 2], { arc: Math.PI, ts: 14 });
                brackets.push(b.part(g));
            });
        }

        // Frame
        b.tubeZ(0.03, 0.033, 0.32, m.stem, model, [0, -0.002, -0.02], { wobble: 0.0015 });

        // Morel receiver: elongated honeycombed cap lying along the gun
        const L = 0.26;
        const pts = [];
        for (let i = 0; i <= 18; i++) {
            const y = (i / 18) * L;
            // closed at both ends so the hollow inside never shows
            pts.push([0.052 * Math.pow(Math.sin(Math.PI * y / L), 0.65) + 0.004 * (y / L), y]);
        }
        const morel = b.lathe(pts, m.morel, model, [0, 0.036, 0.11], [-Math.PI / 2, 0, 0], { seg: 34 });
        b.displace(morel.geometry, v => {
            const f = 150;
            const n = Math.sin(v.x * f) * Math.sin(v.y * f * 0.9) * Math.sin(v.z * f);
            return 0.006 * Math.pow(1 - Math.abs(n), 5) - 0.0025;
        });

        // Hatch on top (a flat cap hinged at the back)
        const hz = -0.035;
        const hy = 0.087;
        b.disc(0.022, m.dark, model, [0, hy - 0.001, hz], [-Math.PI / 2, 0, 0]);
        const hatchRim = b.ring(0.024, 0.003, m.hatchGlow, model, [0, hy, hz], [Math.PI / 2, 0, 0]);
        const hatch = b.part(b.group(model, [0, hy, hz + 0.028]));
        b.cap(0.03, 0.012, m.cap, m.gill, hatch, [0, 0.002, -0.028], null, { fins: 12, flat: 0.6 });
        b.sphere(0.005, m.stem, hatch, [0, 0.015, -0.028]);

        // Side gills that flash when firing
        for (const side of [-1, 1]) {
            for (let i = 0; i < 6; i++) {
                b.box(0.003, 0.02, 0.011, m.gills, model, [side * 0.031, 0.0, -0.11 + i * 0.024], [0, 0, side * 0.15]);
            }
        }

        // Spore vial magazine (liquid level = ammo)
        const vial = b.part(b.group(model, [0, -0.07, -0.085], [0.22, 0, 0]));
        b.mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.1, 18, 1, true), m.glass, vial);
        b.sphere(0.021, m.glass, vial, [0, -0.05, 0], null, { t0: Math.PI / 2, tl: Math.PI / 2 });
        const liqGeo = new THREE.CylinderGeometry(0.0165, 0.0165, 0.1, 16);
        liqGeo.translate(0, 0.05, 0);
        const liquid = b.part(b.mesh(liqGeo, m.liquid, vial, [0, -0.052, 0]));
        b.sphere(0.0165, m.liquid, vial, [0, -0.052, 0], null, { t0: Math.PI / 2, tl: Math.PI / 2, ws: 14, hs: 6 });
        b.ring(0.022, 0.004, m.gill, vial, [0, 0.048, 0], [Math.PI / 2, 0, 0]);
        b.ring(0.022, 0.003, m.gill, vial, [0, -0.02, 0], [Math.PI / 2, 0, 0]);

        // Mushroom-knob bolt on the right side
        const bolt = b.part(b.group(model, [0.03, 0.012, 0.02]));
        b.mesh(new THREE.CylinderGeometry(0.005, 0.006, 0.03, 8), m.stem, bolt, [0.015, 0, 0], [0, 0, Math.PI / 2]);
        b.cap(0.014, 0.012, m.cap, m.gill, bolt, [0.028, 0, 0], [0, 0, -Math.PI / 2], { fins: 0, seg: 14 });

        // Grip, trigger, stock with a mushroom-cap butt pad
        b.tube([[0, -0.02, 0.07], [0, -0.07, 0.09], [0, -0.13, 0.115]], 0.019, 0.017, m.wood, model, { wobble: 0.002, ends: true });
        b.ring(0.022, 0.0032, m.stem, model, [0, -0.03, 0.03], [0, Math.PI / 2, 0], { arc: Math.PI });
        b.box(0.004, 0.02, 0.007, m.gill, model, [0, -0.03, 0.035], [0.3, 0, 0]);
        b.tube([[0, 0.0, 0.13], [0, -0.008, 0.21], [0, -0.03, 0.3]], 0.028, 0.034, m.stem, model, { wobble: 0.002, ends: true });
        b.tube([[0, 0.028, 0.07], [0, 0.03, 0.2], [0, 0.0, 0.29]], 0.012, 0.016, m.wood, model, { wobble: 0.002, ends: true });
        // knuckle + collars covering the joint where the frame, morel and stock meet
        b.sphere(0.036, m.stem, model, [0, 0.004, 0.132], [1, 1, 0.9], { ws: 20, hs: 14, wobble: 0.0015 });
        b.ring(0.034, 0.0065, m.gill, model, [0, 0.003, 0.112]);
        b.ring(0.031, 0.0055, m.gill, model, [0, -0.002, 0.155], [0.12, 0, 0]);
        b.cap(0.05, 0.016, m.cap, m.gill, model, [0, -0.032, 0.3], [Math.PI / 2, 0, 0], { fins: 16, flat: 0.5 });

        const muzzle = b.group(model, [0, 0.012, -0.77]);
        const flash = b.flash(muzzle, null, C.gold, 0.05, 2.5);

        // Spore pouch used during reload (lives on the rig so it can move independently)
        const pouch = b.group();
        pouch.visible = false;
        b.part(pouch); // rest pose = hidden
        const sack = b.lathe([[0.001, 0], [0.024, 0.008], [0.036, 0.03], [0.033, 0.055], [0.016, 0.075], [0.011, 0.082], [0.015, 0.09], [0.013, 0.094]], m.pouch, pouch, null, null, { seg: 20 });
        b.wobble(sack.geometry, 0.003, 50);
        sack.geometry.computeVertexNormals();
        b.ring(0.012, 0.003, m.myc, pouch, [0, 0.079, 0], [Math.PI / 2, 0, 0]);
        b.disc(0.012, m.hatchGlow, pouch, [0, 0.092, 0], [-Math.PI / 2, 0, 0]);
        b.tube([[0.012, 0.08, 0], [0.03, 0.07, 0.01], [0.034, 0.05, 0.02]], 0.0022, 0.0015, m.myc, pouch, { seg: 10, radial: 4 });
        const pouchMouth = b.group(pouch, [0, 0.095, 0]);
        b.part(model);

        return { model, morel, hatch, hatchRim, vial, liquid, bolt, brackets, muzzle, flashes: [flash], pouch, pouchMouth, rigExtras: [pouch], m };
    },

    init(w) {
        w.data.slosh = new Spring(120, 5);
        w.data.target = new THREE.Vector3();
    },

    onFire(w) {
        w.data.slosh.kick(2 + Math.random() * 2);
    },

    fill(w) {
        const r = w.reloadT;
        if (r < 0) {
            return w.ammo / w.stats.mag;
        }
        return WeaponKit.lerp(w.reloadFrom / w.stats.mag, 1, WeaponKit.e('inOutSine', r, 0.95, 1.85));
    },

    pose(w, dt) {
        const P = w.parts;
        const K = WeaponKit;
        const f = w.fireT;
        const r = w.reloadT;
        w.data.slosh.update(dt);

        const fill = this.fill(w);
        P.liquid.scale.y = Math.max(0.02, fill);
        P.liquid.rotation.z = w.data.slosh.x * 0.08;
        P.m.liquid.emissiveIntensity = 0.7 + fill * 0.6 + Math.sin(w.time * 4) * 0.1;
        P.m.gills.emissiveIntensity = 0.15 + Math.exp(-f * 14) * 2.6 + (r >= 0 ? K.hump(r, 0.9, 1.9) * 0.9 : 0);
        P.bolt.position.z += K.hump(f, 0, 0.07) * 0.018;
        P.brackets.forEach((g, i) => {
            g.rotation.x += w.data.slosh.x * 0.02 * (i % 3 - 1);
        });

        if (r < 0) {
            return;
        }
        const tilt = K.e('outCubic', r, 0, 0.36) * (1 - K.e('inOutCubic', r, 2.05, 2.5));
        // muzzle lifts and the gun rolls in so the hatch on top faces you
        P.model.rotation.z += tilt * 0.45;
        P.model.rotation.x += tilt * 0.35;
        P.model.rotation.y += tilt * 0.12;
        P.model.position.x -= tilt * 0.1;
        P.model.position.y += tilt * 0.01;

        const open = K.e('outBack', r, 0.2, 0.46) * (1 - K.e('inCubic', r, 1.98, 2.1));
        P.hatch.rotation.x += open * 1.8;
        P.m.hatchGlow.emissiveIntensity = 0.6 + open * 1.4 + K.hump(r, 0.9, 1.9) * 1.5;

        // Pouch flies in, tips over the hatch and pours, then leaves
        const inP = K.e('outCubic', r, 0.3, 0.72);
        const outP = K.e('inCubic', r, 1.86, 2.16);
        P.pouch.visible = r > 0.3 && r < 2.16;
        if (P.pouch.visible) {
            // hatch position in rig space, then hover the pouch above-left so its mouth tips over the hole
            const tgt = w.localPos(P.model, [0, 0.087, -0.04], w.data.target);
            tgt.x -= 0.088;
            tgt.y += 0.11;
            P.pouch.position.set(
                tgt.x - 0.22 * (1 - inP) + 0.05 * outP,
                tgt.y - 0.24 * (1 - inP) + 0.2 * outP,
                tgt.z + 0.06 * (1 - inP) + 0.12 * outP
            );
            const tip = K.e('outCubic', r, 0.68, 0.92) * (1 - K.e('inOutCubic', r, 1.78, 1.96));
            const pouring = K.seg(r, 0.9, 1.85) > 0 && r < 1.85;
            P.pouch.rotation.set(
                0.15 * tip,
                0,
                -tip * 2.05 + (pouring ? Math.sin(r * 38) * 0.07 : 0) + (1 - inP) * 0.8
            );
            if (pouring) {
                P.pouch.position.y += Math.sin(r * 29) * 0.003;
            }
            P.pouch.scale.multiplyScalar(K.lerp(0.4, 1, inP) * (1 - outP * 0.6));
        }

        const boltBack = K.e('outCubic', r, 2.16, 2.28) - K.e('outBack', r, 2.33, 2.45);
        P.bolt.position.z += boltBack * 0.05;
        P.model.rotation.z += boltBack * 0.06;
    },

    effects(w, dt) {
        const P = w.parts;
        const fx = w.fx;
        const K = WeaponKit;
        const gold = this.color;

        if (w.atFire(0)) {
            const o = w.worldPos(P.muzzle);
            const d = w.worldDir(P.muzzle);
            fx.emit({ world: true, pos: o, vel: d.clone().multiplyScalar(45), life: 0.12, size: 0.005, sizeEnd: 0.004, color: 0xffe9a8, drag: 0, stretch: 0.005 });
            for (let i = 0; i < 7; i++) {
                fx.emit({ world: true, pos: o, vel: K.cone(d, 0.35).multiplyScalar(K.rand(1.5, 3.5)), life: K.rand(0.2, 0.4), size: 0.006, sizeEnd: 0.001, color: gold, drag: 3, stretch: 0.01 });
            }
            fx.emit({ world: true, pos: o, vel: d.clone().multiplyScalar(0.8), life: 0.5, size: 0.015, sizeEnd: 0.045, color: 0xd8c9a0, additive: false, opacity: 0.3, drag: 3, gravity: -0.2 });
            fx.emit({ world: true, shape: 'ring', pos: o, dir: d, vel: d.clone().multiplyScalar(1.2), life: 0.12, size: 0.015, sizeEnd: 0.06, color: gold, opacity: 0.7 });
            // gill vents puff a little dust out of the sides
            for (const side of [-1, 1]) {
                const p = w.localPos(P.model, [side * 0.034, 0, -0.05]);
                fx.emit({ pos: p, vel: new THREE.Vector3(side * 0.4, 0.1, 0), life: 0.3, size: 0.004, sizeEnd: 0.012, color: gold, opacity: 0.5, drag: 4 });
            }
        }

        const r = w.reloadT;
        if (r < 0) {
            return;
        }
        // The pour: powder streams from the pouch mouth down into the open hatch
        if (r > 0.9 && r < 1.85) {
            const mouth = w.localPos(P.pouchMouth);
            const n = fx.rate('pour', 160, dt);
            for (let i = 0; i < n; i++) {
                fx.emit({
                    pos: mouth.clone().add(new THREE.Vector3(K.rand(-0.004, 0.004), 0, K.rand(-0.004, 0.004))),
                    vel: new THREE.Vector3(K.rand(0.05, 0.2), K.rand(-0.15, 0), K.rand(-0.03, 0.03)),
                    life: 0.28, size: K.rand(0.0025, 0.0045), sizeEnd: 0.002, color: Math.random() < 0.8 ? gold : 0xfff2c8,
                    gravity: 3.2, drag: 0.6, fadeIn: 0.01
                });
            }
            const hatchPos = w.localPos(P.model, [0, 0.09, -0.035]);
            const g = fx.rate('glint', 30, dt);
            for (let i = 0; i < g; i++) {
                fx.emit({ pos: hatchPos, vel: K.sphereDir().multiplyScalar(0.12).add(new THREE.Vector3(0, 0.15, 0)), life: 0.4, size: 0.003, color: 0xfff2c8, drag: 2 });
            }
            const dust = fx.rate('dust', 12, dt);
            for (let i = 0; i < dust; i++) {
                fx.emit({ pos: hatchPos, vel: K.sphereDir().multiplyScalar(0.05).add(new THREE.Vector3(0, 0.08, 0)), life: 0.7, size: 0.006, sizeEnd: 0.022, color: 0xe9d9a8, additive: false, opacity: 0.3, drag: 2 });
            }
        }
        if (w.atAct(2.1)) {
            const p = w.localPos(P.model, [0, 0.095, -0.035]);
            for (let i = 0; i < 12; i++) {
                fx.emit({ pos: p, vel: K.sphereDir().multiplyScalar(0.3).add(new THREE.Vector3(0, 0.15, 0)), life: 0.5, size: 0.005, sizeEnd: 0.018, color: 0xe9d9a8, additive: false, opacity: 0.45, drag: 4 });
            }
        }
        if (w.atAct(2.42)) {
            const p = w.localPos(P.bolt, [0.03, 0, 0]);
            for (let i = 0; i < 6; i++) {
                fx.emit({ pos: p, vel: K.sphereDir().multiplyScalar(0.4), life: 0.25, size: 0.003, color: gold, drag: 3 });
            }
        }
    }
});
