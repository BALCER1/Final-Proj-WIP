// CHANTERELLE TWINS - dual pistols.
// Each pistol's slide is a golden chanterelle trumpet that flares into a wavy, ridged muzzle,
// on a pale stem grip with a curled-cap hammer and a glowing teal spore sac at the base.
// Fire:   alternates right/left; each gun flicks up on its own spring and the hammer snaps.
//         The sacs shrink as their share of ammo runs down.
// Reload: both pistols twirl backwards and fling their spent sacs, swing together grip-to-grip,
//         mycelium tendrils grow out of the grips, fresh sacs SPROUT and swell with an elastic pop,
//         the tendrils retract and both hammers are cocked.

Weapons.register('pistols', {
    name: 'Chanterelle Twins',
    offset: [0, -0.16, -0.46],
    sprintYaw: 0.2,
    stats: {
        mag: 16, rate: 7, auto: false, damage: 13, pellets: 1, spread: 0.02, range: 70,
        reloadTime: 2.4, drawTime: 0.4,
        kick: { back: 0.012, up: 0.015, roll: 0.01 }
    },
    color: 0x45ffc8,

    build(b) {
        const C = {
            chant: 0xf2a23a, chantDeep: 0xd9822a, stem: 0xf4e3c0, gill: 0xe8b060,
            glow: 0x45ffc8, dark: 0x1a1008, myc: 0xf2fff9
        };
        const m = {
            chant: b.mat('chant', { color: C.chant, roughness: 0.5, flatShading: true, side: THREE.DoubleSide }),
            deep: b.mat('deep', { color: C.chantDeep, roughness: 0.6 }),
            stem: b.mat('stem', { color: C.stem }),
            gill: b.mat('gill', { color: C.gill, side: THREE.DoubleSide }),
            dark: b.mat('dark', { color: C.dark, roughness: 1, side: THREE.DoubleSide }),
            tendril: b.glow('tendril', C.glow, 0.5, { color: C.myc })
        };
        const model = b.group();
        const guns = [];

        for (const side of [-1, 1]) {
            const g = b.group(model, [side * 0.24, 0, 0], [0, side * 0.055, -side * 0.06]);
            const gun = { g, side };

            // Chanterelle trumpet slide: lathe along Y, then laid along -Z
            const prof = [];
            for (let i = 0; i <= 14; i++) {
                const y = (i / 14) * 0.18;
                prof.push([0.017 + Math.pow(y / 0.18, 3.2) * 0.026 + y * 0.02, y]);
            }
            prof.push([0.047, 0.183], [0.044, 0.186]);
            const slide = b.lathe(prof, m.chant, g, [0, 0.03, 0.035], [-Math.PI / 2, 0, 0], { seg: 30 });
            b.displace(slide.geometry, v => {
                const a = Math.atan2(v.z, v.x);
                const rim = Math.max(0, (v.y - 0.14) / 0.046);
                return 0.0016 * Math.sin(a * 16) * (0.3 + v.y * 5) + rim * rim * 0.006 * Math.sin(a * 6 + 1);
            });
            b.tubeZ(0.009, 0.009, 0.06, m.dark, g, [0, 0.03, -0.12], { seg: 10 });
            b.disc(0.01, m.dark, g, [0, 0.03, -0.11], [0, Math.PI, 0]);
            b.sphere(0.0175, m.deep, g, [0, 0.03, 0.035], [1, 1, 0.7]);

            // sights + rail
            b.tubeZ(0.005, 0.005, 0.12, m.stem, g, [0, 0.05, -0.04], { seg: 6 });
            b.mini(g, [0, 0.052, -0.105], 0.012, m.deep, m.stem);
            b.box(0.012, 0.008, 0.005, m.stem, g, [0, 0.055, 0.02]);

            // hammer: little curled cap at the back
            gun.hammer = b.part(b.group(g, [0, 0.042, 0.045]));
            b.mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.016, 6), m.stem, gun.hammer, [0, 0.006, 0.004], [-0.5, 0, 0]);
            b.cap(0.01, 0.008, m.deep, m.gill, gun.hammer, [0, 0.013, 0.01], [-1.1, 0, 0], { fins: 0, seg: 12 });

            // grip, trigger guard, trigger
            b.tube([[0, 0.02, 0.022], [0, -0.035, 0.035], [0, -0.085, 0.05]], 0.0165, 0.0145, m.stem, g, { wobble: 0.0015, ends: true });
            for (const y of [-0.01, -0.035, -0.06]) {
                b.ring(0.0165, 0.0025, m.gill, g, [0, y, 0.031 - y * 0.25], [Math.PI / 2 - 0.3, 0, 0]);
            }
            b.ring(0.02, 0.0028, m.stem, g, [0, 0.008, -0.012], [0, Math.PI / 2, 0], { arc: Math.PI });
            b.box(0.004, 0.016, 0.006, m.gill, g, [0, 0.0, -0.008], [0.3, 0, 0]);

            // spore sac (glass bulb + glowing core)
            gun.sac = b.part(b.group(g, [0, -0.102, 0.056]));
            gun.glass = b.glass('glass' + side, 0xdffff5, 0.3);
            gun.core = b.glow('core' + side, C.glow, 1.2);
            b.sphere(0.021, gun.glass, gun.sac, null, [1, 1.15, 1]);
            gun.coreMesh = b.part(b.sphere(0.015, gun.core, gun.sac, null, [1, 1.1, 1], { wobble: 0.0015, freq: 120 }));
            b.ring(0.012, 0.003, m.gill, gun.sac, [0, 0.019, 0], [Math.PI / 2, 0, 0]);

            // mycelium tendrils that grow out during reload (hidden at rest)
            gun.tendrils = [];
            for (let k = 0; k < 3; k++) {
                const a = (k / 3) * Math.PI * 2 + (side > 0 ? 0.4 : 1.2);
                const pts = [[0, -0.09, 0.052]];
                for (let i = 1; i <= 6; i++) {
                    const tt = i / 6;
                    const curl = a + tt * 2.4 * (k % 2 ? 1 : -1);
                    pts.push([Math.cos(curl) * 0.03 * tt, -0.09 - tt * 0.06, 0.052 + Math.sin(curl) * 0.03 * tt]);
                }
                const t = b.tube(pts, 0.003, 0.0008, m.tendril, g, { seg: 30, radial: 5 });
                t.visible = false;
                gun.tendrils.push(t);
            }

            gun.muzzle = b.group(g, [0, 0.03, -0.155]);
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
    // How many rounds each gun has left.
    share(w, side) {
        return side ? Math.floor(w.ammo / 2) : Math.ceil(w.ammo / 2);
    },

    pose(w, dt) {
        const P = w.parts;
        const K = WeaponKit;
        const r = w.reloadT;
        const half = w.stats.mag / 2;
        P.m.tendril.emissiveIntensity = 0.4 + Math.sin(w.time * 5) * 0.2;

        P.guns.forEach((gun, s) => {
            const kick = w.data.kick[s];
            const twist = w.data.twist[s];
            kick.update(dt);
            twist.update(dt);
            w.data.gunFireT[s] += dt;
            const ft = w.data.gunFireT[s];
            const g = gun.g;
            const sign = s ? 1 : -1;

            g.rotation.x += kick.x * 0.1;
            g.position.z += kick.x * 0.006;
            g.position.y += kick.x * 0.002;
            g.rotation.z += twist.x * 0.02;
            // hammer snaps forward, then springs back
            if (ft < 0.25) {
                gun.hammer.rotation.x -= (1 - K.e('outBack', ft, 0.03, 0.2)) * 0.9;
            }

            const share = this.share(w, s);
            let sacScale = 0.35 + 0.65 * share / half;
            gun.core.emissiveIntensity = 0.3 + 1.1 * share / half + Math.sin(w.time * 3 + s) * 0.15;
            gun.coreMesh.scale.multiplyScalar(sacScale);
            gun.coreMesh.rotation.y += w.time * 0.8;

            if (r < 0) {
                gun.tendrils.forEach(t => {
                    t.visible = false;
                });
                return;
            }
            const d = s * 0.08;
            // twirl backwards around the trigger finger
            const spin = K.e('inOutCubic', r, 0 + d, 0.45 + d);
            g.rotation.x += spin * Math.PI * 2;
            g.position.y += K.hump(r, d, 0.45 + d) * 0.04;

            // old sac is flung off mid-spin and is gone until the new one grows
            const dropAt = 0.24 + d;
            const growP = K.seg(r, 1.15 + d * 0.5, 1.75 + d * 0.5);
            if (r > dropAt) {
                gun.sac.visible = growP > 0;
                const grow = K.ease.outElastic(growP);
                gun.sac.scale.multiplyScalar(Math.max(0.001, grow));
                sacScale = WeaponKit.lerp(0.35 + 0.65 * (s ? Math.floor(w.reloadFrom / 2) : Math.ceil(w.reloadFrom / 2)) / half, 1, growP);
                gun.coreMesh.scale.copy(gun.coreMesh.userData.rest.s).multiplyScalar(Math.max(0.35, sacScale));
                gun.core.emissiveIntensity = 0.6 + growP * 1.2 + K.hump(r, 1.6, 1.95) * 2.2;
            }

            // swing together, grips angled towards each other
            const gather = K.e('inOutCubic', r, 0.45, 0.8) * (1 - K.e('inOutCubic', r, 1.85, 2.25));
            g.position.x -= sign * gather * 0.13;
            g.position.y += gather * 0.1;
            g.position.z -= gather * 0.03;
            g.rotation.z -= sign * gather * 0.55;
            g.rotation.x += gather * 0.3;
            g.rotation.y -= sign * gather * 0.15;

            const grow = K.e('outCubic', r, 0.72 + d * 0.5, 1.3 + d * 0.5) * (1 - K.e('inCubic', r, 1.75, 2.0));
            gun.tendrils.forEach((t, k) => WeaponKit.grow(t, grow * (1 - k * 0.12)));

            // cock the hammer on the way back
            gun.hammer.rotation.x += K.hump(r, 2.1 + d, 2.3 + d) * 0.7;
            g.rotation.x += K.hump(r, 2.15 + d, 2.32 + d) * 0.06;
        });
    },

    effects(w, dt) {
        const P = w.parts;
        const fx = w.fx;
        const K = WeaponKit;
        const glow = this.color;

        if (w.atFire(0)) {
            const mz = P.guns[w.lastSide].muzzle;
            const o = w.worldPos(mz);
            const d = w.worldDir(mz);
            fx.emit({ world: true, pos: o, vel: d.clone().multiplyScalar(40), life: 0.1, size: 0.004, sizeEnd: 0.003, color: 0xc8fff0, drag: 0, stretch: 0.005 });
            for (let i = 0; i < 9; i++) {
                fx.emit({ world: true, pos: o, vel: K.cone(d, 0.4).multiplyScalar(K.rand(1.2, 3)), life: K.rand(0.2, 0.4), size: 0.005, sizeEnd: 0.001, color: i % 3 ? glow : 0xffe1a0, drag: 3, stretch: 0.008 });
            }
            fx.emit({ world: true, shape: 'ring', pos: o, dir: d, vel: d.clone().multiplyScalar(0.8), life: 0.12, size: 0.012, sizeEnd: 0.05, color: glow, opacity: 0.7 });
            fx.emit({ world: true, pos: o, vel: d.clone().multiplyScalar(0.6), life: 0.45, size: 0.01, sizeEnd: 0.035, color: 0xd6e8d8, additive: false, opacity: 0.3, drag: 3, gravity: -0.2 });
        }

        const r = w.reloadT;
        if (r < 0) {
            return;
        }
        P.guns.forEach((gun, s) => {
            const d = s * 0.08;
            const sign = s ? 1 : -1;
            const sp = w.localPos(gun.sac, null, w.data.sacPos[s]);
            if (w.atAct(0.24 + d)) {
                fx.emit({ pos: sp, vel: new THREE.Vector3(sign * 0.9, 0.7, 0.4), life: 0.9, size: 0.016, sizeEnd: 0.012, color: 0x52786a, additive: false, gravity: 5, drag: 0.3 });
                for (let i = 0; i < 8; i++) {
                    fx.emit({ pos: sp, vel: K.sphereDir().multiplyScalar(0.3).add(new THREE.Vector3(sign * 0.4, 0.3, 0)), life: 0.5, size: 0.004, color: glow, drag: 2 });
                }
            }
            if (r > 0.8 && r < 1.7) {
                const n = fx.rate('mote' + s, 45, dt);
                for (let i = 0; i < n; i++) {
                    const pos = sp.clone().addScaledVector(K.sphereDir(), K.rand(0.05, 0.11));
                    fx.emit({ pos, vel: K.sphereDir().multiplyScalar(0.05), attract: sp, pull: 2.2, swirl: 2.5 * sign, life: 0.9, size: K.rand(0.003, 0.005), sizeEnd: 0.001, color: glow, drag: 1.5, fadeIn: 0.12 });
                }
            }
            if (w.atAct(1.68 + d * 0.5)) {
                for (let i = 0; i < 14; i++) {
                    fx.emit({ pos: sp, vel: K.sphereDir().multiplyScalar(0.45), life: 0.35, size: 0.004, color: i % 2 ? glow : 0xffffff, drag: 3 });
                }
            }
        });
    }
});
