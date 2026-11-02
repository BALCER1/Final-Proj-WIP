// CHANTERELLE EAGLES - dual pistols, full auto, firing alternately.
// Two small Desert Eagle-style hand cannons grown from mushroom parts: a chunky golden chanterelle
// slide (gill-rib serrations at the back, forking false-gill ridges down the sides, a frilly flared
// muzzle), a pale stem frame and rail, a bark grip with gill panels, a curled-cap hammer and a glowing
// teal spore sac seated in the magazine well. A spore "port" on the slide glows with the ammo left.
// Fire:   hold to fire, right/left alternating. Each gun kicks on its own spring, the slide blows
//         back and spits a spore husk, the hammer snaps. The slide locks back when a gun runs dry.
// Reload: both guns twirl and fling their spent sacs, then turn side-on to you while two mycelium
//         vines spiral out of the sac, up the grip and along the whole slide to the muzzle. Side
//         shoots curl off and pop little glowing mushrooms, new sacs swell, a pulse of light runs
//         through the vines, then they wither back and both slides are racked.

(() => {
    // The grip is angled back like a Deagle's: this maps a point in grip space into gun space.
    const GA = -0.32;
    const GP = [0, -0.002, 0.03];
    const gripPt = (x, y, z) => [
        GP[0] + x,
        GP[1] + y * Math.cos(GA) - z * Math.sin(GA),
        GP[2] + y * Math.sin(GA) + z * Math.cos(GA)
    ];

    Weapons.register('pistols', {
        name: 'Chanterelle Eagles',
        offset: [0, -0.145, -0.45],
        sprintYaw: 0.2,
        stats: {
            mag: 16, rate: 9, auto: true, damage: 13, pellets: 1, spread: 0.022, range: 70,
            reloadTime: 2.5, drawTime: 0.4,
            kick: { back: 0.012, up: 0.016, roll: 0.01 }
        },
        color: 0x45ffc8,
        // teal spore round that weaves slightly as it flies
        projectile: {
            speed: 65, size: 0.014, stretch: 3.5, color: 0x45ffc8, core: 0xe6fff8, maxDist: 50, wobble: 0.03,
            trail: { spacing: 0.32, life: 0.26, size: 0.009, drift: 0.1, sparks: 0.1, length: 16 },
            impact: { count: 6, size: 0.016 }
        },

        build(b) {
            const C = {
                chant: 0xeaa13a, deep: 0xc97a22, stem: 0xf2e3c3, gill: 0xf5d49b, bark: 0x6a4529,
                glow: 0x45ffc8, dark: 0x1a1008
            };
            const m = {
                chant: b.mat('chant', { color: C.chant, roughness: 0.5 }),
                deep: b.mat('deep', { color: C.deep, roughness: 0.55 }),
                frill: b.mat('frill', { color: C.chant, roughness: 0.5, flatShading: true, side: THREE.DoubleSide }),
                stem: b.mat('stem', { color: C.stem }),
                gill: b.mat('gill', { color: C.gill, side: THREE.DoubleSide }),
                bark: b.mat('bark', { color: C.bark, roughness: 0.95, flatShading: true }),
                dark: b.mat('dark', { color: C.dark, roughness: 1, side: THREE.DoubleSide }),
                vine: b.glow('vine', C.glow, 0.5, { color: 0xe9fff7, roughness: 0.6 }),
                bud: b.glow('bud', C.glow, 1.2),
                node: b.glow('node', C.glow, 1.6)
            };
            const model = b.group();
            const guns = [];

            for (const side of [-1, 1]) {
                const g = b.group(model, [side * 0.24, 0, 0], [0, side * 0.055, -side * 0.05]);
                const gun = { g, side };

                // ---- slide (blows back when firing) ----
                const slide = b.part(b.group(g));
                gun.slide = slide;
                b.rbox(0.034, 0.036, 0.2, 0.009, m.chant, slide, [0, 0.033, -0.065]);
                // rear serrations: gill ribs
                for (let i = 0; i < 6; i++) {
                    b.box(0.0368, 0.024, 0.0022, m.gill, slide, [0, 0.031, 0.026 - i * 0.0048]);
                }
                // forking false-gill ridges down both sides (the chanterelle's signature)
                for (const sx of [-1, 1]) {
                    for (let k = 0; k < 3; k++) {
                        const y = 0.022 + k * 0.009;
                        b.box(0.0025, 0.0022, 0.075, m.deep, slide, [sx * 0.0172, y, -0.105]);
                        b.box(0.0025, 0.0022, 0.03, m.deep, slide, [sx * 0.0172, y + 0.0032, -0.153], [0.2, 0, 0]);
                        b.box(0.0025, 0.0022, 0.026, m.deep, slide, [sx * 0.0172, y - 0.0025, -0.151], [-0.16, 0, 0]);
                    }
                }
                // glowing spore port on the right side (shows ammo)
                gun.port = b.glow('port' + side, C.glow, 1.2);
                b.box(0.0016, 0.012, 0.034, gun.port, slide, [0.0172, 0.041, -0.018]);
                // rail + sights
                b.rbox(0.012, 0.006, 0.17, 0.002, m.stem, slide, [0, 0.0535, -0.07]);
                b.mini(slide, [0, 0.056, -0.152], 0.013, m.deep, m.stem);
                for (const sx of [-1, 1]) {
                    b.box(0.0035, 0.007, 0.005, m.stem, slide, [sx * 0.0042, 0.059, 0.024]);
                }
                // frilly chanterelle flare round the muzzle + bore
                const frill = b.lathe([[0.0075, 0], [0.012, 0.0018], [0.0175, 0.0028], [0.0205, 0.0012]], m.frill, slide, [0, 0.033, -0.1655], [-Math.PI / 2, 0, 0], { seg: 28 });
                b.displace(frill.geometry, v => (Math.hypot(v.x, v.z) > 0.014 ? 0.0018 * Math.sin(Math.atan2(v.z, v.x) * 7) : 0));
                b.disc(0.0075, m.dark, slide, [0, 0.033, -0.1665], [0, Math.PI, 0]);
                b.tubeZ(0.0075, 0.0075, 0.03, m.dark, slide, [0, 0.033, -0.15], { seg: 10, open: true });

                // ---- frame ----
                b.rbox(0.03, 0.02, 0.19, 0.005, m.stem, g, [0, 0.006, -0.06]);
                b.mini(g, [-0.0155, 0.008, -0.035], 0.01, m.deep, m.stem, [0, 0, Math.PI / 2]);
                b.ring(0.018, 0.003, m.stem, g, [0, 0.0, -0.022], [0, Math.PI / 2, Math.PI], { arc: Math.PI });
                b.box(0.004, 0.016, 0.006, m.gill, g, [0, -0.004, -0.016], [0.35, 0, 0]);

                // ---- grip, angled back ----
                const grip = b.group(g, GP, [GA, 0, 0]);
                b.rbox(0.031, 0.104, 0.046, 0.01, m.bark, grip, [0, -0.052, 0]);
                for (const sx of [-1, 1]) {
                    for (let i = 0; i < 9; i++) {
                        b.box(0.0025, 0.0022, 0.032, m.gill, grip, [sx * 0.0158, -0.016 - i * 0.0085, 0]);
                    }
                }
                b.rbox(0.026, 0.01, 0.018, 0.004, m.stem, grip, [0, -0.002, 0.026]);
                b.rbox(0.033, 0.006, 0.048, 0.003, m.deep, grip, [0, -0.105, 0]);

                // spore sac in the magazine well
                gun.sac = b.part(b.group(grip, [0, -0.112, 0.002]));
                gun.glass = b.glass('glass' + side, 0xdffff5, 0.3);
                gun.core = b.glow('core' + side, C.glow, 1.2);
                b.sphere(0.019, gun.glass, gun.sac, null, [1, 0.85, 1.2]);
                gun.coreMesh = b.part(b.sphere(0.0135, gun.core, gun.sac, null, [1, 0.9, 1.15], { wobble: 0.0015, freq: 120 }));

                // hammer: little curled cap behind the slide
                gun.hammer = b.part(b.group(g, [0, 0.042, 0.038]));
                b.mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.016, 6), m.stem, gun.hammer, [0, 0.006, 0.004], [-0.5, 0, 0]);
                b.cap(0.01, 0.008, m.deep, m.gill, gun.hammer, [0, 0.013, 0.01], [-1.1, 0, 0], { fins: 0, seg: 12 });

                // ---- reload vines: two strands spiralling from the sac up the grip and along the slide ----
                gun.vines = [];
                gun.extras = []; // branches, buds and nodules, each with the vine position `u` it hangs off
                const rnd = WeaponKit.rng(side > 0 ? 11 : 23);
                const up = new THREE.Vector3(0, 1, 0);
                for (const phase of [0, Math.PI]) {
                    const pts = [];
                    const axis = [];
                    const N1 = 16;
                    const N2 = 26;
                    for (let i = 0; i <= N1; i++) {
                        const t = i / N1;
                        const yl = WeaponKit.lerp(-0.112, -0.004, t);
                        const a = phase + t * 2.2 * Math.PI * 2;
                        const rr = 1 + 0.12 * Math.sin(a * 3 + phase);
                        pts.push(gripPt(Math.cos(a) * 0.0205 * rr, yl, Math.sin(a) * 0.029 * rr));
                        axis.push(gripPt(0, yl, 0));
                    }
                    for (let i = 1; i <= N2; i++) {
                        const t = i / N2;
                        const z = WeaponKit.lerp(0.03, -0.162, t);
                        const a = phase + 2.2 * Math.PI * 2 + t * 3.2 * Math.PI * 2;
                        const rr = 1 + 0.12 * Math.sin(a * 3 + phase);
                        pts.push([Math.cos(a) * 0.022 * rr, 0.028 + Math.sin(a) * 0.034 * rr, z]);
                        axis.push([0, 0.028, z]);
                    }
                    const vine = b.tube(pts, 0.0029, 0.0014, m.vine, g, { seg: 160, radial: 5 });
                    vine.visible = false;
                    gun.vines.push(vine);

                    const n = pts.length - 1;
                    // side shoots ending in tiny glowing mushrooms
                    for (let k = 0; k < 4; k++) {
                        const idx = Math.round(WeaponKit.lerp(0.18, 0.92, (k + rnd() * 0.5) / 4) * n);
                        const base = new THREE.Vector3(...pts[idx]);
                        const out = base.clone().sub(new THREE.Vector3(...axis[idx])).normalize();
                        const curl = new THREE.Vector3().crossVectors(out, up).normalize().multiplyScalar(rnd() < 0.5 ? 1 : -1);
                        const p1 = base.clone().addScaledVector(out, 0.008).addScaledVector(curl, 0.005);
                        const p2 = base.clone().addScaledVector(out, 0.016).addScaledVector(curl, 0.002);
                        const branch = b.tube([base.toArray(), p1.toArray(), p2.toArray()], 0.0017, 0.0008, m.vine, g, { seg: 10, radial: 4 });
                        branch.visible = false;
                        const bud = b.mini(g, p2.toArray(), 0.011, m.bud, m.vine);
                        bud.quaternion.setFromUnitVectors(up, out);
                        bud.visible = false;
                        b.part(bud);
                        gun.extras.push({ kind: 'branch', mesh: branch, u: idx / n });
                        gun.extras.push({ kind: 'bud', mesh: bud, u: idx / n });
                    }
                    // glowing nodules dotted along the vine
                    for (let k = 0; k < 6; k++) {
                        const idx = Math.round(((k + 0.5) / 6) * n);
                        const node = b.sphere(0.0036, m.node, g, pts[idx], null, { ws: 8, hs: 6 });
                        node.visible = false;
                        b.part(node);
                        gun.extras.push({ kind: 'node', mesh: node, u: idx / n });
                    }
                }

                gun.muzzle = b.group(g, [0, 0.033, -0.175]);
                gun.flash = b.flash(gun.muzzle, null, C.glow, 0.05, 2);
                b.part(g);
                guns.push(gun);
            }
            b.part(model);
            return { model, guns, flashes: [guns[0].flash, guns[1].flash], m };
        },

        init(w) {
            w.data.kick = [new Spring(260, 13), new Spring(260, 13)];
            w.data.twist = [new Spring(200, 10), new Spring(200, 10)];
            w.data.gunFireT = [9, 9];
            w.data.sacPos = [new THREE.Vector3(), new THREE.Vector3()];
            w.data.tip = new THREE.Vector3();
        },

        // Right pistol (index 1) fires on even ammo counts, left (0) on odd, so they alternate.
        side(w) {
            return w.ammo % 2 === 0 ? 1 : 0;
        },
        muzzle(w, side) {
            return w.parts.guns[side].muzzle;
        },
        onFire(w, side) {
            w.data.kick[side].kick(9);
            w.data.twist[side].kick((side ? -1 : 1) * 3);
            w.data.gunFireT[side] = 0;
        },
        // Rounds left in each gun.
        share(w, side, ammo = w.ammo) {
            return side ? Math.floor(ammo / 2) : Math.ceil(ammo / 2);
        },

        // Reload timeline for one gun (s = 0 left, 1 right; the right one runs slightly behind).
        tl(s) {
            const d = s * 0.08;
            return {
                d,
                growA: 0.62 + d * 0.5,
                growB: 1.42 + d * 0.5,
                wither: [1.86, 2.12],
                sacA: 1.15 + d * 0.5,
                sacB: 1.75 + d * 0.5,
                rack: 2.14 + d
            };
        },

        pose(w, dt) {
            const P = w.parts;
            const K = WeaponKit;
            const r = w.reloadT;
            const half = w.stats.mag / 2;
            P.m.vine.emissiveIntensity = 0.45 + Math.sin(w.time * 5) * 0.15 + (r >= 0 ? K.hump(r, 1.5, 1.85) * 2.2 : 0);
            P.m.bud.emissiveIntensity = 1 + Math.sin(w.time * 7) * 0.3;

            P.guns.forEach((gun, s) => {
                const kick = w.data.kick[s];
                const twist = w.data.twist[s];
                kick.update(dt);
                twist.update(dt);
                w.data.gunFireT[s] += dt;
                const ft = w.data.gunFireT[s];
                const g = gun.g;
                const sign = s ? 1 : -1;
                const share = this.share(w, s);

                g.rotation.x += kick.x * 0.1;
                g.position.z += kick.x * 0.006;
                g.position.y += kick.x * 0.002;
                g.rotation.z += twist.x * 0.02;

                // slide blowback, and it stays locked back once this gun is empty
                let back = K.e('outQuad', ft, 0, 0.03) * (1 - K.e('inOutCubic', ft, 0.04, 0.1));
                if (share === 0 && ft > 0.03) {
                    back = 1;
                }
                if (ft < 0.25) {
                    gun.hammer.rotation.x -= (1 - K.e('outBack', ft, 0.03, 0.2)) * 0.9;
                }
                gun.port.emissiveIntensity = 0.15 + 1.3 * share / half + Math.sin(w.time * 4 + s) * 0.1;
                gun.core.emissiveIntensity = 0.3 + 1.1 * share / half + Math.sin(w.time * 3 + s) * 0.15;
                gun.coreMesh.scale.multiplyScalar(0.35 + 0.65 * share / half);
                gun.coreMesh.rotation.y += w.time * 0.8;

                if (r < 0) {
                    gun.slide.position.z += back * 0.03;
                    gun.vines.forEach(v => {
                        v.visible = false;
                    });
                    gun.extras.forEach(x => {
                        if (x.kind === 'branch') {
                            x.mesh.visible = false;
                        }
                    });
                    return;
                }

                const T = this.tl(s);
                // twirl backwards around the trigger finger
                const spin = K.e('inOutCubic', r, T.d, 0.45 + T.d);
                g.rotation.x += spin * Math.PI * 2;
                g.position.y += K.hump(r, T.d, 0.45 + T.d) * 0.04;

                // slide pulls back at the start and is racked forward at the end
                back = Math.max(back, K.e('outCubic', r, 0.05, 0.15)) * (1 - K.e('outBack', r, T.rack, T.rack + 0.12));
                gun.slide.position.z += back * 0.03;

                // old sac is flung off mid-spin; the new one swells later
                const growSac = K.seg(r, T.sacA, T.sacB);
                if (r > 0.24 + T.d) {
                    gun.sac.visible = growSac > 0;
                    gun.sac.scale.multiplyScalar(Math.max(0.001, K.ease.outElastic(growSac)));
                    const from = 0.35 + 0.65 * this.share(w, s, w.reloadFrom) / half;
                    gun.coreMesh.scale.copy(gun.coreMesh.userData.rest.s).multiplyScalar(Math.max(0.35, K.lerp(from, 1, growSac)));
                    gun.core.emissiveIntensity = 0.6 + growSac * 1.2 + K.hump(r, 1.6, 1.95) * 2.2;
                }

                // turn side-on to you, close together, so the vines can be seen covering the gun
                const show = K.e('inOutCubic', r, 0.42, 0.75) * (1 - K.e('inOutCubic', r, 1.95, 2.3));
                // muzzles swing outward until each gun is almost side-on to the camera
                g.position.x -= sign * show * 0.075;
                g.position.y += show * 0.085;
                g.position.z += show * 0.03;
                g.rotation.y -= sign * show * 1.2;
                g.rotation.x += show * 0.1 + Math.sin(r * 3 + s) * 0.03 * show;

                // vines
                const vg = K.e('inOutSine', r, T.growA, T.growB);
                const wither = K.e('inCubic', r, T.wither[0], T.wither[1]);
                gun.vines.forEach(v => WeaponKit.grow(v, vg * (1 - wither)));
                const span = T.growB - T.growA;
                gun.extras.forEach(x => {
                    const reach = T.growA + x.u * span; // roughly when the vine tip passes this point
                    const out = 1 - K.e('inCubic', r, T.wither[0] - 0.08, T.wither[0] + 0.06);
                    if (x.kind === 'branch') {
                        WeaponKit.grow(x.mesh, K.seg(r, reach, reach + 0.15) * out);
                    } else if (x.kind === 'bud') {
                        const p = K.seg(r, reach + 0.12, reach + 0.5);
                        x.mesh.visible = p > 0 && out > 0;
                        x.mesh.scale.multiplyScalar(Math.max(0.001, K.ease.outElastic(p) * out));
                    } else {
                        const p = K.seg(r, reach, reach + 0.2);
                        x.mesh.visible = p > 0 && out > 0;
                        x.mesh.scale.multiplyScalar(Math.max(0.001, K.ease.outBack(p) * out * (1 + K.hump(r, 1.5, 1.85) * 0.8)));
                    }
                });

                // cock the hammer as the slide is racked
                gun.hammer.rotation.x += K.hump(r, T.rack - 0.02, T.rack + 0.18) * 0.7;
                g.rotation.x += K.hump(r, T.rack, T.rack + 0.16) * 0.07;
            });
        },

        effects(w, dt) {
            const P = w.parts;
            const fx = w.fx;
            const K = WeaponKit;
            const glow = this.color;

            if (w.atFire(0)) {
                const gun = P.guns[w.lastSide];
                const o = w.worldPos(gun.muzzle);
                const d = w.worldDir(gun.muzzle);
                for (let i = 0; i < 9; i++) {
                    fx.emit({ world: true, pos: o, vel: K.cone(d, 0.4).multiplyScalar(K.rand(1.2, 3)), life: K.rand(0.2, 0.4), size: 0.005, sizeEnd: 0.001, color: i % 3 ? glow : 0xffe1a0, drag: 3, stretch: 0.008 });
                }
                fx.emit({ world: true, shape: 'ring', pos: o, dir: d, vel: d.clone().multiplyScalar(0.8), life: 0.12, size: 0.012, sizeEnd: 0.05, color: glow, opacity: 0.7 });
                fx.emit({ world: true, pos: o, vel: d.clone().multiplyScalar(0.6), life: 0.45, size: 0.01, sizeEnd: 0.035, color: 0xd6e8d8, additive: false, opacity: 0.3, drag: 3, gravity: -0.2 });
                // spent spore husk out of the port
                const port = w.localPos(gun.slide, [0.02, 0.042, -0.018]);
                fx.emit({ pos: port, vel: new THREE.Vector3(K.rand(0.8, 1.2), K.rand(0.8, 1.2), 0.3), life: 0.7, size: 0.006, sizeEnd: 0.005, color: 0x5f8f80, additive: false, gravity: 6, drag: 0.4 });
            }

            const r = w.reloadT;
            if (r < 0) {
                return;
            }
            const tip = w.data.tip;
            P.guns.forEach((gun, s) => {
                const T = this.tl(s);
                const sign = s ? 1 : -1;
                const sp = w.localPos(gun.sac, null, w.data.sacPos[s]);
                if (w.atAct(0.24 + T.d)) {
                    fx.emit({ pos: sp, vel: new THREE.Vector3(sign * 0.9, 0.7, 0.4), life: 0.9, size: 0.016, sizeEnd: 0.012, color: 0x52786a, additive: false, gravity: 5, drag: 0.3 });
                    for (let i = 0; i < 8; i++) {
                        fx.emit({ pos: sp, vel: K.sphereDir().multiplyScalar(0.3).add(new THREE.Vector3(sign * 0.4, 0.3, 0)), life: 0.5, size: 0.004, color: glow, drag: 2 });
                    }
                }
                // sparkles at the growing vine tips
                if (r > T.growA && r < T.growB + 0.05) {
                    const vg = K.e('inOutSine', r, T.growA, T.growB);
                    gun.vines.forEach((v, k) => {
                        const n = fx.rate('tip' + s + k, 50, dt);
                        if (!n) {
                            return;
                        }
                        v.userData.tube.curve.getPointAt(Math.min(1, vg), tip);
                        const p = w.localPos(gun.g, [tip.x, tip.y, tip.z]);
                        for (let i = 0; i < n; i++) {
                            fx.emit({ pos: p, vel: K.sphereDir().multiplyScalar(0.12), life: 0.35, size: 0.0035, sizeEnd: 0, color: i % 2 ? glow : 0xffffff, drag: 2 });
                        }
                    });
                }
                // motes gather into the new sac
                if (r > T.sacA - 0.3 && r < T.sacB) {
                    const n = fx.rate('mote' + s, 40, dt);
                    for (let i = 0; i < n; i++) {
                        const pos = sp.clone().addScaledVector(K.sphereDir(), K.rand(0.05, 0.1));
                        fx.emit({ pos, vel: K.sphereDir().multiplyScalar(0.05), attract: sp, pull: 2.2, swirl: 2.5 * sign, life: 0.9, size: K.rand(0.003, 0.005), sizeEnd: 0.001, color: glow, drag: 1.5, fadeIn: 0.12 });
                    }
                }
                // light pulse through the vines
                if (w.atAct(1.62 + T.d * 0.5)) {
                    gun.vines.forEach(v => {
                        for (let i = 0; i < 10; i++) {
                            v.userData.tube.curve.getPointAt(Math.random(), tip);
                            fx.emit({ pos: w.localPos(gun.g, [tip.x, tip.y, tip.z]), vel: K.sphereDir().multiplyScalar(0.25), life: 0.4, size: 0.004, color: i % 2 ? glow : 0xffffff, drag: 3 });
                        }
                    });
                }
                // withering: dry flakes fall off the vines
                if (r > T.wither[0] && r < T.wither[1]) {
                    const n = fx.rate('wither' + s, 45, dt);
                    for (let i = 0; i < n; i++) {
                        gun.vines[i % 2].userData.tube.curve.getPointAt(Math.random() * (1 - K.seg(r, T.wither[0], T.wither[1])), tip);
                        fx.emit({ pos: w.localPos(gun.g, [tip.x, tip.y, tip.z]), vel: K.sphereDir().multiplyScalar(0.08), life: 0.6, size: 0.003, sizeEnd: 0.002, color: 0xa7c9b8, additive: false, opacity: 0.8, gravity: 1.2, drag: 1.5 });
                    }
                }
                if (w.atAct(T.rack + 0.1)) {
                    const port = w.localPos(gun.slide, [0.02, 0.042, -0.018]);
                    for (let i = 0; i < 6; i++) {
                        fx.emit({ pos: port, vel: K.sphereDir().multiplyScalar(0.35), life: 0.25, size: 0.003, color: glow, drag: 3 });
                    }
                }
            });
        }
    });
})();
