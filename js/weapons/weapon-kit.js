// Shared toolkit for the mushroom weapons. Plain script, global THREE (r128), no modules.
//
//   WeaponKit      easing + timeline helpers the animation code is written with
//   Spring         small damped spring (recoil, look sway, jiggles)
//   WeaponBuilder  makes every mesh/material for one weapon and remembers "parts" that animate
//   SporeFX        pooled spore particles (muzzle bursts, poured powder, charge motes, husks)
//   Weapon         one gun instance: state machine, firing, reload timing, sway, bob, recoil, draw
//   Weapons        registry - each weapon file calls Weapons.register(id, def)
//
// Coordinate convention: a weapon's model points down -Z (same as the camera), +Y up, units in metres.
// weapon.root is meant to be added to the camera: camera.add(weapon.root) (and the camera added to the scene).

const WeaponKit = {
    clamp: (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)),
    lerp: (a, b, t) => a + (b - a) * t,

    // Progress of t through the window [a, b], clamped to 0..1.
    seg(t, a, b) {
        return WeaponKit.clamp((t - a) / (b - a));
    },
    // 0 -> 1 -> 0 across [a, b].
    hump(t, a, b) {
        return Math.sin(WeaponKit.seg(t, a, b) * Math.PI);
    },
    // Eased progress through [a, b].
    e(name, t, a, b) {
        return WeaponKit.ease[name](WeaponKit.seg(t, a, b));
    },

    ease: {
        linear: t => t,
        inQuad: t => t * t,
        outQuad: t => 1 - (1 - t) * (1 - t),
        inCubic: t => t * t * t,
        outCubic: t => 1 - Math.pow(1 - t, 3),
        inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
        inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
        outBack: t => {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        },
        outElastic: t => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1)
    },

    // Cheap smooth pseudo-noise in roughly -1..1, deterministic for a given position.
    noise(x, y, z) {
        return (
            Math.sin(x * 1.3 + Math.sin(y * 1.7) * 1.2) * Math.cos(y * 1.1 + Math.sin(z * 1.9)) +
            Math.sin(z * 1.5 + Math.cos(x * 0.9) * 1.3)
        ) * 0.5;
    },

    // Seeded RNG so models look the same every time they are built.
    rng(seed) {
        let a = seed >>> 0;
        return () => {
            a = (a + 0x6d2b79f5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    },

    // Grow a tube made by WeaponBuilder.tube() along its length (0 = hidden, 1 = full).
    grow(mesh, p) {
        const { tub, rad } = mesh.userData.tube;
        const segs = Math.floor(WeaponKit.clamp(p) * tub);
        mesh.geometry.setDrawRange(0, segs * rad * 6);
        mesh.visible = segs > 0;
    },

    rand: (a, b) => a + Math.random() * (b - a),

    // Random unit vector.
    sphereDir(out = new THREE.Vector3()) {
        const u = Math.random() * 2 - 1;
        const a = Math.random() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        return out.set(Math.cos(a) * s, u, Math.sin(a) * s);
    },

    // Direction inside a cone of half-angle `spread` (radians-ish) around `dir`.
    cone(dir, spread, out = new THREE.Vector3()) {
        const r = spread * Math.sqrt(Math.random());
        const a = Math.random() * Math.PI * 2;
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
        return out.set(Math.cos(a) * r, Math.sin(a) * r, -1).normalize().applyQuaternion(q);
    }
};

class Spring {
    constructor(stiffness = 220, damping = 16) {
        this.k = stiffness;
        this.c = damping;
        this.x = 0;
        this.v = 0;
    }
    kick(v) {
        this.v += v;
    }
    update(dt) {
        // Fixed sub-steps keep stiff springs stable at low frame rates.
        let left = dt;
        while (left > 0) {
            const h = Math.min(left, 1 / 120);
            this.v += (-this.k * this.x - this.c * this.v) * h;
            this.x += this.v * h;
            left -= h;
        }
    }
}

class WeaponBuilder {
    constructor() {
        this.mats = {};
        this.parts = [];
    }

    // ---- materials -------------------------------------------------------
    mat(key, opts) {
        if (!this.mats[key]) {
            this.mats[key] = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.75, metalness: 0 }, opts));
        }
        return this.mats[key];
    }
    glow(key, color, intensity = 1, opts = {}) {
        return this.mat(key, Object.assign({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 }, opts));
    }
    glass(key, color = 0xffffff, opacity = 0.28) {
        return this.mat(key, { color, transparent: true, opacity, roughness: 0.08, depthWrite: false, side: THREE.DoubleSide });
    }

    // ---- placement -------------------------------------------------------
    place(obj, parent, pos, rot, scale) {
        if (pos) {
            obj.position.set(pos[0], pos[1], pos[2]);
        }
        if (rot) {
            obj.rotation.set(rot[0], rot[1], rot[2]);
        }
        if (scale !== undefined && scale !== null) {
            if (typeof scale === 'number') {
                obj.scale.setScalar(scale);
            } else {
                obj.scale.set(scale[0], scale[1], scale[2]);
            }
        }
        if (parent) {
            parent.add(obj);
        }
        return obj;
    }
    group(parent, pos, rot, scale) {
        return this.place(new THREE.Group(), parent, pos, rot, scale);
    }
    mesh(geo, mat, parent, pos, rot, scale) {
        return this.place(new THREE.Mesh(geo, mat), parent, pos, rot, scale);
    }
    // Remember an object's rest transform; the Weapon resets every part to rest each frame,
    // so animation code only ever adds offsets on top of the rest pose.
    part(obj) {
        obj.userData.rest = {
            p: obj.position.clone(),
            r: obj.rotation.clone(),
            s: obj.scale.clone(),
            v: obj.visible
        };
        this.parts.push(obj);
        return obj;
    }

    // ---- geometry tweaks --------------------------------------------------
    // Move each vertex along its normal by fn(position, normal). Recomputes normals (use with flatShading).
    displace(geo, fn) {
        const pos = geo.attributes.position;
        const nor = geo.attributes.normal;
        const v = new THREE.Vector3();
        const n = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i);
            n.fromBufferAttribute(nor, i);
            const d = fn(v, n);
            pos.setXYZ(i, v.x + n.x * d, v.y + n.y * d, v.z + n.z * d);
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
        return geo;
    }
    // Organic lumpiness. Offsets depend only on position so seams never crack; normals are kept.
    wobble(geo, amp, freq = 40, seed = 0) {
        const pos = geo.attributes.position;
        const N = WeaponKit.noise;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i) * freq + seed;
            const y = pos.getY(i) * freq;
            const z = pos.getZ(i) * freq - seed;
            pos.setXYZ(
                i,
                pos.getX(i) + amp * N(x, y, z),
                pos.getY(i) + amp * N(y + 31, z, x),
                pos.getZ(i) + amp * N(z - 17, x, y + 67)
            );
        }
        pos.needsUpdate = true;
        return geo;
    }

    // ---- primitives -------------------------------------------------------
    // Cylinder lying along Z. rFront is the -Z end (towards the muzzle). Seam is hidden underneath.
    tubeZ(rFront, rBack, len, mat, parent, pos, opts = {}) {
        const geo = new THREE.CylinderGeometry(
            rFront, rBack, len,
            opts.seg || 16,
            opts.hseg || Math.max(1, Math.round(len / 0.04)),
            !!opts.open,
            Math.PI
        );
        geo.rotateX(-Math.PI / 2);
        if (opts.wobble) {
            this.wobble(geo, opts.wobble, opts.freq || 40, opts.seed || 0);
        }
        return this.mesh(geo, mat, parent, pos, opts.rot, opts.scale);
    }
    sphere(r, mat, parent, pos, scale, opts = {}) {
        const geo = new THREE.SphereGeometry(r, opts.ws || 18, opts.hs || 12, 0, Math.PI * 2, opts.t0 || 0, opts.tl || Math.PI);
        if (opts.wobble) {
            this.wobble(geo, opts.wobble, opts.freq || 40, opts.seed || 0);
        }
        return this.mesh(geo, mat, parent, pos, opts.rot, scale);
    }
    ring(r, tube, mat, parent, pos, rot, opts = {}) {
        const geo = new THREE.TorusGeometry(r, tube, opts.rs || 8, opts.ts || 28, opts.arc || Math.PI * 2);
        return this.mesh(geo, mat, parent, pos, rot, opts.scale);
    }
    disc(r, mat, parent, pos, rot) {
        return this.mesh(new THREE.CircleGeometry(r, 20), mat, parent, pos, rot);
    }
    lathe(points, mat, parent, pos, rot, opts = {}) {
        const geo = new THREE.LatheGeometry(points.map(p => new THREE.Vector2(p[0], p[1])), opts.seg || 24);
        return this.mesh(geo, mat, parent, pos, rot, opts.scale);
    }
    box(w, h, d, mat, parent, pos, rot) {
        return this.mesh(new THREE.BoxGeometry(w, h, d), mat, parent, pos, rot);
    }

    // Tapered tube along a smooth curve through `points` (roots, stems, mycelium threads, tendrils).
    tube(points, r0, r1, mat, parent, opts = {}) {
        const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2])));
        const tub = opts.seg || 24;
        const rad = opts.radial || 8;
        const geo = new THREE.TubeGeometry(curve, tub, 1, rad, false);
        const pos = geo.attributes.position;
        const c = new THREE.Vector3();
        const v = new THREE.Vector3();
        for (let i = 0; i <= tub; i++) {
            curve.getPointAt(i / tub, c);
            const r = WeaponKit.lerp(r0, r1, i / tub);
            for (let j = 0; j <= rad; j++) {
                const k = i * (rad + 1) + j;
                v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
                pos.setXYZ(k, v.x, v.y, v.z);
            }
        }
        pos.needsUpdate = true;
        if (opts.wobble) {
            this.wobble(geo, opts.wobble, opts.freq || 40, opts.seed || 0);
        }
        const m = this.mesh(geo, mat, parent);
        m.userData.tube = { tub, rad, curve, r0, r1 };
        if (opts.ends) {
            const a = points[0];
            const b = points[points.length - 1];
            this.sphere(r0, mat, parent, a, null, { ws: 10, hs: 8 });
            this.sphere(r1, mat, parent, b, null, { ws: 10, hs: 8 });
        }
        return m;
    }

    // Rounded box centred on its position: w along X, h along Y, d along Z.
    rbox(w, h, d, r, mat, parent, pos, rot) {
        const bev = Math.min(r * 0.5, w * 0.2, h * 0.2, d * 0.2);
        const W = w - 2 * bev;
        const H = h - 2 * bev;
        const R = Math.min(r, W / 2, H / 2);
        const s = new THREE.Shape();
        s.moveTo(-W / 2 + R, -H / 2);
        s.lineTo(W / 2 - R, -H / 2);
        s.quadraticCurveTo(W / 2, -H / 2, W / 2, -H / 2 + R);
        s.lineTo(W / 2, H / 2 - R);
        s.quadraticCurveTo(W / 2, H / 2, W / 2 - R, H / 2);
        s.lineTo(-W / 2 + R, H / 2);
        s.quadraticCurveTo(-W / 2, H / 2, -W / 2, H / 2 - R);
        s.lineTo(-W / 2, -H / 2 + R);
        s.quadraticCurveTo(-W / 2, -H / 2, -W / 2 + R, -H / 2);
        const geo = new THREE.ExtrudeGeometry(s, {
            depth: Math.max(0.0001, d - 2 * bev), bevelEnabled: true,
            bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 4
        });
        geo.center();
        return this.mesh(geo, mat, parent, pos, rot);
    }

    // Mushroom cap with the dome pointing +Y; the origin sits on the rim plane.
    // gillMat adds the underside and radial gill fins.
    cap(r, h, mat, gillMat, parent, pos, rot, opts = {}) {
        const g = this.group(parent, pos, rot, opts.scale);
        const seg = opts.seg || 26;
        const flat = opts.flat === undefined ? 0.8 : opts.flat;
        const pts = [[r * 0.92, -h * 0.14]];
        for (let i = 0; i <= 12; i++) {
            const a = (i / 12) * Math.PI / 2;
            pts.push([r * Math.pow(Math.cos(a), flat), h * Math.sin(a)]);
        }
        const dome = this.lathe(pts, mat, g, null, null, { seg });
        if (opts.wobble) {
            this.wobble(dome.geometry, opts.wobble, opts.freq || 60, opts.seed || 0);
        }
        if (gillMat) {
            const stemR = opts.stemR === undefined ? r * 0.18 : opts.stemR;
            this.lathe([[stemR, h * 0.3], [r * 0.6, h * 0.08], [r * 0.92, -h * 0.14]], gillMat, g, null, null, { seg });
            const n = opts.fins === undefined ? (r > 0.03 ? 20 : 0) : opts.fins;
            if (n) {
                const len = r * 0.92 - stemR;
                const finGeo = new THREE.BoxGeometry(len, h * 0.16, Math.max(0.0012, r * 0.018));
                const slope = Math.atan2(h * 0.44, len);
                for (let i = 0; i < n; i++) {
                    const a = (i / n) * Math.PI * 2;
                    const mid = stemR + len / 2;
                    this.mesh(finGeo, gillMat, g, [Math.cos(a) * mid, h * 0.04, Math.sin(a) * mid], [0, -a, slope]);
                }
            }
        }
        g.userData.capInfo = { r, h, flat };
        return g;
    }

    // Raised warts/spots scattered over a cap made by cap().
    spots(capGroup, count, mat, size, seed = 1, minA = 0.2, maxA = 1.42) {
        const { r, h, flat } = capGroup.userData.capInfo;
        const rnd = WeaponKit.rng(seed);
        const geo = new THREE.SphereGeometry(1, 8, 6);
        const up = new THREE.Vector3(0, 1, 0);
        const out = [];
        for (let i = 0; i < count; i++) {
            const a = WeaponKit.lerp(minA, maxA, Math.sqrt((i + 0.5) / count));
            const phi = i * 2.39996 + seed + rnd() * 0.5;
            const ca = Math.pow(Math.cos(a), flat);
            const p = new THREE.Vector3(r * ca * Math.cos(phi), h * Math.sin(a), r * ca * Math.sin(phi));
            const n = new THREE.Vector3(p.x / (r * r), p.y / (h * h), p.z / (r * r)).normalize();
            const s = size * (0.6 + rnd() * 0.8);
            const m = this.mesh(geo, mat, capGroup, null, null, [s, s * 0.38, s]);
            m.position.copy(p).addScaledVector(n, -s * 0.05);
            m.quaternion.setFromUnitVectors(up, n);
            out.push(m);
        }
        return out;
    }

    // Tiny decorative mushroom (stem + cap) sprouting from a surface, growing along +Y.
    mini(parent, pos, size, capMat, stemMat, rot) {
        const g = this.group(parent, pos, rot);
        this.mesh(new THREE.CylinderGeometry(size * 0.2, size * 0.3, size * 0.9, 8), stemMat, g, [0, size * 0.45, 0]);
        this.cap(size * 0.62, size * 0.42, capMat, null, g, [0, size * 0.85, 0], null, { seg: 14 });
        return g;
    }

    // Muzzle flash (additive core + forward spike + point light). The Weapon animates it on fire.
    flash(parent, pos, color, size = 0.05, intensity = 3) {
        const g = this.group(parent, pos);
        const mat = new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false
        });
        const geo = new THREE.IcosahedronGeometry(1, 0);
        const core = this.mesh(geo, mat, g);
        const spike = this.mesh(geo, mat, g);
        core.visible = spike.visible = false;
        // Lights stay in the scene permanently at intensity 0 so toggling never recompiles shaders.
        const light = new THREE.PointLight(color, 0, 2.5, 2);
        g.add(light);
        return { group: g, core, spike, light, size, intensity, age: 9 };
    }
}

// Pooled particle system. Particles either live in the weapon rig's space (follow the gun:
// poured powder, charging motes) or in world space (muzzle bursts that stay behind as you turn).
class SporeFX {
    constructor(local, worldParent) {
        this.local = local;
        this.worldParent = worldParent || null;
        this.live = [];
        this.pools = { dot: [], ring: [] };
        this.geos = {
            dot: new THREE.IcosahedronGeometry(1, 1),
            ring: new THREE.TorusGeometry(1, 0.07, 6, 32)
        };
        this.max = 500;
        this.layer = 0; // render layer for rig-space particles (set by WeaponView)
        this.acc = {};
        this._v = new THREE.Vector3();
        this._q = new THREE.Quaternion();
        this._z = new THREE.Vector3(0, 0, 1);
    }

    // Spawn count for a continuous emitter running at `perSecond`.
    rate(key, perSecond, dt) {
        this.acc[key] = (this.acc[key] || 0) + perSecond * dt;
        const n = Math.floor(this.acc[key]);
        this.acc[key] -= n;
        return n;
    }

    /**
     * o.pos, o.vel     THREE.Vector3 (copied). With o.world they are world-space, otherwise rig-space.
     * o.life           seconds                  o.size / o.sizeEnd   radius at birth / death
     * o.color          hex                      o.opacity            peak opacity
     * o.additive       default true (glow). false for dust/husks.
     * o.gravity        m/s^2 down (negative = rises)                  o.drag   velocity damping per second
     * o.attract        Vector3 (kept by reference, so it can move)    o.pull / o.swirl   attraction strengths
     * o.stretch        streak along velocity                          o.shape  'dot' | 'ring'
     * o.dir            ring facing direction
     */
    emit(o) {
        if (this.live.length >= this.max) {
            return null;
        }
        const shape = o.shape || 'dot';
        let p = this.pools[shape].pop();
        if (!p) {
            const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false });
            p = { mesh: new THREE.Mesh(this.geos[shape], mat), shape, pos: new THREE.Vector3(), vel: new THREE.Vector3() };
            p.mesh.frustumCulled = false;
        }
        const mat = p.mesh.material;
        mat.color.set(o.color === undefined ? 0xffffff : o.color);
        mat.blending = o.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending;

        p.pos.copy(o.pos);
        p.vel.copy(o.vel || this._v.set(0, 0, 0));
        let parent = this.local;
        if (o.world) {
            if (this.worldParent) {
                parent = this.worldParent;
                this.worldParent.worldToLocal(p.pos);
            } else {
                this.local.worldToLocal(p.pos);
                this.local.getWorldQuaternion(this._q).invert();
                p.vel.applyQuaternion(this._q);
            }
        }
        if (p.mesh.parent !== parent) {
            parent.add(p.mesh);
        }
        p.mesh.layers.set(parent === this.local ? this.layer : 0);
        p.mesh.visible = true;
        p.age = 0;
        p.life = o.life || 0.6;
        p.size = o.size || 0.01;
        p.sizeEnd = o.sizeEnd === undefined ? p.size * 0.3 : o.sizeEnd;
        p.opacity = o.opacity === undefined ? 1 : o.opacity;
        p.gravity = o.gravity || 0;
        p.drag = o.drag === undefined ? 1.5 : o.drag;
        p.attract = o.attract || null;
        p.pull = o.pull || 0;
        p.swirl = o.swirl || 0;
        p.stretch = o.stretch || 0;
        p.fadeIn = o.fadeIn === undefined ? 0.04 : o.fadeIn;
        if (shape === 'ring' && o.dir) {
            p.mesh.quaternion.setFromUnitVectors(this._z, this._v.copy(o.dir).normalize());
        } else {
            p.mesh.quaternion.identity();
        }
        this.live.push(p);
        return p;
    }

    update(dt) {
        const v = this._v;
        for (let i = this.live.length - 1; i >= 0; i--) {
            const p = this.live[i];
            p.age += dt;
            let t = p.age / p.life;
            if (p.attract) {
                v.copy(p.attract).sub(p.pos);
                const d = v.length();
                if (d < 0.01) {
                    t = 1;
                } else {
                    v.multiplyScalar(1 / d);
                    p.vel.addScaledVector(v, p.pull * dt * (1 + 0.3 / (d + 0.05)));
                    // Swirl around the vertical axis through the target.
                    p.vel.x += -v.z * p.swirl * dt;
                    p.vel.z += v.x * p.swirl * dt;
                }
            }
            if (t >= 1) {
                this.kill(i);
                continue;
            }
            p.vel.y -= p.gravity * dt;
            p.vel.multiplyScalar(Math.exp(-p.drag * dt));
            p.pos.addScaledVector(p.vel, dt);
            const s = WeaponKit.lerp(p.size, p.sizeEnd, t);
            p.mesh.position.copy(p.pos);
            if (p.stretch && p.shape === 'dot') {
                const sp = p.vel.length();
                if (sp > 0.001) {
                    p.mesh.quaternion.setFromUnitVectors(this._z, v.copy(p.vel).multiplyScalar(1 / sp));
                }
                p.mesh.scale.set(s, s, s + sp * p.stretch);
            } else {
                p.mesh.scale.setScalar(s);
            }
            p.mesh.material.opacity = p.opacity * Math.min(1, p.age / p.fadeIn) * (1 - t * t);
        }
    }

    kill(i) {
        const p = this.live[i];
        p.mesh.visible = false;
        this.live.splice(i, 1);
        this.pools[p.shape].push(p);
    }

    clear() {
        for (let i = this.live.length - 1; i >= 0; i--) {
            this.kill(i);
        }
    }

    dispose() {
        this.clear();
        for (const k in this.pools) {
            for (const p of this.pools[k]) {
                if (p.mesh.parent) {
                    p.mesh.parent.remove(p.mesh);
                }
                p.mesh.material.dispose();
            }
            this.pools[k].length = 0;
        }
        this.geos.dot.dispose();
        this.geos.ring.dispose();
    }
}

// Small visual projectiles: a glowing spore that flies from the muzzle to where the shot lands and
// leaves a trail of spores behind it. Cheap on purpose: two pooled meshes per projectile (core +
// halo, sharing materials per colour) and the trail is drawn with the weapon's SporeFX pool.
// Damage stays hitscan (instant); projectiles are the visible part and splash when they arrive.
//
// def.projectile = {
//   speed, size, stretch, color, core,          head: m/s, radius, length factor, halo + core colour
//   trail: { spacing, life, size, color, drift, sparks, length },  spores every `spacing` m, for the first `length` m
//   spiral: { radius, freq, strands },          optional helix of spores around the path (sniper)
//   wobble,                                     sideways weave amplitude in metres (pistols)
//   maxDist, impact: { count, size, ring }      distance when nothing is hit, splash on arrival
// }
class SporeProjectiles {
    constructor(fx) {
        this.fx = fx;
        this.live = [];
        this.pool = [];
        this.mats = {};
        this.geo = new THREE.IcosahedronGeometry(1, 1);
        this.max = 64;
        this._a = new THREE.Vector3();
        this._b = new THREE.Vector3();
        this._p = new THREE.Vector3();
        this._z = new THREE.Vector3(0, 0, 1);
    }

    mat(color, opacity) {
        const key = color + ':' + opacity;
        if (!this.mats[key]) {
            this.mats[key] = new THREE.MeshBasicMaterial({
                color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false
            });
        }
        return this.mats[key];
    }

    spawn(from, to, cfg, hit) {
        const parent = this.fx.worldParent;
        if (!parent || this.live.length >= this.max) {
            return;
        }
        let p = this.pool.pop();
        if (!p) {
            p = {
                core: new THREE.Mesh(this.geo),
                halo: new THREE.Mesh(this.geo),
                from: new THREE.Vector3(),
                dir: new THREE.Vector3(),
                pos: new THREE.Vector3(),
                side: new THREE.Vector3(),
                up: new THREE.Vector3()
            };
            p.core.frustumCulled = p.halo.frustumCulled = false;
        }
        p.core.material = this.mat(cfg.core || 0xffffff, 1);
        p.halo.material = this.mat(cfg.color, 0.55);
        parent.add(p.core);
        parent.add(p.halo);
        p.core.visible = p.halo.visible = true;
        p.cfg = cfg;
        p.hit = hit || null;
        p.from.copy(from);
        p.dir.copy(to).sub(from);
        p.dist = Math.max(0.01, p.dir.length());
        p.dir.multiplyScalar(1 / p.dist);
        // two axes across the flight path, for spirals and weaving
        p.side.set(0, 1, 0).cross(p.dir);
        if (p.side.lengthSq() < 1e-6) {
            p.side.set(1, 0, 0);
        }
        p.side.normalize();
        p.up.copy(p.dir).cross(p.side).normalize();
        p.travelled = 0;
        p.dropped = 0;
        p.age = 0;
        p.phase = Math.random() * Math.PI * 2;
        p.pos.copy(from);
        this.live.push(p);
    }

    // Point on the flight path at distance d, including the optional weave.
    at(p, d, out) {
        out.copy(p.from).addScaledVector(p.dir, d);
        const w = p.cfg.wobble;
        if (w) {
            const fade = Math.min(1, d / 2);
            out.addScaledVector(p.side, Math.sin(d * 2.2 + p.phase) * w * fade);
            out.addScaledVector(p.up, Math.cos(d * 1.7 + p.phase) * w * 0.6 * fade);
        }
        return out;
    }

    update(dt) {
        const K = WeaponKit;
        const fx = this.fx;
        for (let i = this.live.length - 1; i >= 0; i--) {
            const p = this.live[i];
            const c = p.cfg;
            p.age += dt;
            p.travelled = Math.min(p.dist, p.travelled + c.speed * dt);
            this.at(p, p.travelled, p.pos);

            // head: stretched along the path, halo flickers a little
            const s = c.size;
            const q = p.core.quaternion.setFromUnitVectors(this._z, p.dir);
            p.halo.quaternion.copy(q);
            p.core.position.copy(p.pos);
            p.halo.position.copy(p.pos);
            p.core.scale.set(s * 0.45, s * 0.45, s * 0.45 * (c.stretch || 1));
            const fl = 1 + Math.sin(p.age * 60 + p.phase) * 0.15;
            p.halo.scale.set(s * fl, s * fl, s * fl * (c.stretch || 1) * 1.2);

            // trail: drop spores at fixed spacing along the distance covered this frame
            const t = c.trail;
            if (t) {
                const spacing = t.spacing || 0.4;
                const end = Math.min(p.travelled, t.length || 25);
                let budget = 10;
                while (p.dropped + spacing <= end && budget-- > 0) {
                    p.dropped += spacing;
                    const pt = this.at(p, p.dropped, this._a);
                    if (c.spiral) {
                        const strands = c.spiral.strands || 1;
                        for (let k = 0; k < strands; k++) {
                            const a = p.phase + p.dropped * c.spiral.freq + (k / strands) * Math.PI * 2;
                            const r = c.spiral.radius * Math.min(1, p.dropped / 1.5);
                            this._b.copy(pt).addScaledVector(p.side, Math.cos(a) * r).addScaledVector(p.up, Math.sin(a) * r);
                            fx.emit({ world: true, pos: this._b, vel: this._p.set(0, 0, 0), life: t.life * 1.3, size: t.size * 0.8, sizeEnd: 0, color: c.spiral.color || t.color || c.color, drag: 1 });
                        }
                    }
                    const drift = t.drift || 0.15;
                    fx.emit({
                        world: true, pos: pt, vel: K.sphereDir(this._p).multiplyScalar(drift),
                        life: t.life * K.rand(0.7, 1.2), size: t.size * K.rand(0.7, 1.2), sizeEnd: 0,
                        color: t.color || c.color, drag: 2, fadeIn: 0.01
                    });
                    if (t.sparks && Math.random() < t.sparks) {
                        fx.emit({ world: true, pos: pt, vel: K.sphereDir(this._p).multiplyScalar(K.rand(0.4, 1.2)), life: 0.3, size: t.size * 0.5, sizeEnd: 0, color: c.core || 0xffffff, drag: 3, gravity: 1.5 });
                    }
                }
                if (budget <= 0) {
                    p.dropped = end; // skip ahead rather than flood the pool
                }
            }

            if (p.travelled >= p.dist || p.age > 4) {
                this.impact(p);
                this.recycle(i);
            }
        }
    }

    impact(p) {
        const c = p.cfg;
        const imp = c.impact || {};
        const fx = this.fx;
        const K = WeaponKit;
        if (!p.hit) {
            // faded out in the air: a small puff
            for (let i = 0; i < 3; i++) {
                fx.emit({ world: true, pos: p.pos, vel: K.sphereDir(this._p).multiplyScalar(0.3), life: 0.3, size: c.size * 0.6, sizeEnd: 0, color: c.color, drag: 3 });
            }
            return;
        }
        const n = p.hit.normal || this._b.copy(p.dir).negate();
        const count = imp.count || 6;
        const size = imp.size || 0.02;
        for (let i = 0; i < count; i++) {
            const v = K.sphereDir(this._p).multiplyScalar(0.9).addScaledVector(n, 1.3).multiplyScalar(K.rand(0.6, 1.4));
            fx.emit({ world: true, pos: p.hit.point, vel: v, life: K.rand(0.25, 0.45), size, sizeEnd: 0.003, color: i % 3 ? c.color : (c.core || 0xffffff), drag: 3, gravity: 2.5, stretch: 0.02 });
        }
        const puffPos = this._a.copy(p.hit.point).addScaledVector(n, 0.03);
        fx.emit({ world: true, pos: puffPos, vel: this._p.copy(n).multiplyScalar(0.3), life: 0.7, size: size * 2, sizeEnd: size * 6, color: 0xcfc6a8, additive: false, opacity: 0.35, drag: 3, fadeIn: 0.03 });
        fx.emit({ world: true, pos: puffPos, vel: this._p.set(0, 0, 0), life: 0.5, size: size * 1.5, sizeEnd: size * 0.5, color: c.color, opacity: 0.8, drag: 0 });
        if (imp.ring) {
            fx.emit({ world: true, shape: 'ring', pos: puffPos, dir: n, vel: this._p.set(0, 0, 0), life: 0.3, size: size * 1.5, sizeEnd: imp.ring, color: c.color, opacity: 0.9 });
        }
    }

    recycle(i) {
        const p = this.live[i];
        p.core.visible = p.halo.visible = false;
        this.live.splice(i, 1);
        this.pool.push(p);
    }

    clear() {
        for (let i = this.live.length - 1; i >= 0; i--) {
            this.recycle(i);
        }
    }

    dispose() {
        this.clear();
        for (const p of this.pool) {
            for (const m of [p.core, p.halo]) {
                if (m.parent) {
                    m.parent.remove(m);
                }
            }
        }
        this.pool.length = 0;
        for (const k in this.mats) {
            this.mats[k].dispose();
        }
        this.geo.dispose();
    }
}

const _wv = new THREE.Vector3();
const _wq = new THREE.Quaternion();

class Weapon {
    /**
     * new Weapon(id, { worldParent: scene, trace: (origin, dir, range) => hit, onShot: shot => {...} })
     * worldParent: where muzzle smoke, spores and projectiles live (usually the scene). Optional.
     * trace:       finds what each pellet hits, so projectiles fly to it and splash there. Optional.
     * onShot:      called per trigger pull with the shot, including shot.hits[i] per pellet.
     */
    constructor(id, opts = {}) {
        const def = Weapons.get(id);
        if (!def) {
            throw new Error('Unknown weapon: ' + id);
        }
        this.id = id;
        this.def = def;
        this.name = def.name;
        this.stats = Object.assign({
            mag: 10, rate: 5, auto: false, damage: 10, pellets: 1, spread: 0,
            reloadTime: 2, drawTime: 0.45, range: 100,
            kick: { back: 0.04, up: 0.06, roll: 0.01 }
        }, def.stats);

        this.b = new WeaponBuilder();
        this.root = new THREE.Group();
        this.root.name = 'weapon:' + id;
        this.root.position.fromArray(def.offset || [0.2, -0.2, -0.42]);
        this.root.scale.setScalar(def.scale || 1);
        this.rig = new THREE.Group();
        this.root.add(this.rig);

        this.data = {};
        this.parts = def.build(this.b, this);
        this.rig.add(this.parts.model);
        for (const o of this.parts.rigExtras || []) {
            this.rig.add(o);
        }
        this.fx = new SporeFX(this.rig, opts.worldParent);
        this.projectiles = new SporeProjectiles(this.fx);
        this.onShot = opts.onShot || null;
        // trace(origin, dir, range) -> { point, normal, object } | null. Decides where shots land.
        this.trace = opts.trace || null;
        this.view = null;

        this.ammo = this.stats.mag;
        this.reloadFrom = this.ammo;
        this.shots = 0;
        this.lastSide = 0;
        this.time = 0;
        this.timeScale = 1;
        this.trigger = false;
        this.buffer = 0;
        this.cooldown = 0;
        this.fireT = 99;
        this.prevFireT = 99;
        this.setState('draw');

        this.moveBlend = 0;
        this.sprintBlend = 0;
        this.airBlend = 0;
        this.bobPhase = 0;
        this.swayX = new Spring(90, 11);
        this.swayY = new Spring(90, 11);
        this.recoilZ = new Spring(240, 20);
        this.recoilX = new Spring(200, 17);
        this.recoilR = new Spring(160, 14);

        if (def.init) {
            def.init(this);
        }
    }

    // ---- control API --------------------------------------------------------
    setTrigger(down) {
        if (down && !this.trigger) {
            this.buffer = 0.18; // a click slightly before the gun is ready still counts
        }
        this.trigger = down;
    }
    reload() {
        if (this.state === 'ready' && this.ammo < this.stats.mag) {
            this.reloadFrom = this.ammo;
            this.setState('reload');
            return true;
        }
        return false;
    }
    equip() {
        this.trigger = false;
        this.buffer = 0;
        this.setState('draw');
    }
    // Feed raw mouse movement (pixels) for weapon sway.
    look(dx, dy) {
        this.swayX.kick(WeaponKit.clamp(-dx * 0.0011, -0.25, 0.25));
        this.swayY.kick(WeaponKit.clamp(-dy * 0.0011, -0.25, 0.25));
    }
    get reloading() {
        return this.state === 'reload';
    }
    get reloadProgress() {
        return this.state === 'reload' ? WeaponKit.clamp(this.actT / this.stats.reloadTime) : 0;
    }

    // ---- helpers for weapon defs ------------------------------------------------
    setState(s) {
        this.state = s;
        this.actT = 0;
        this.prevActT = -1e-4;
    }
    // True on the frame the current action's timeline passes `t` seconds.
    atAct(t) {
        return this.prevActT < t && this.actT >= t;
    }
    // True on the frame the time since the last shot passes `t`.
    atFire(t) {
        return this.prevFireT < t && this.fireT >= t;
    }
    get reloadT() {
        return this.state === 'reload' ? this.actT : -1;
    }
    // World position of obj (+offset). With a WeaponView the gun is drawn with a different FOV,
    // so the point is re-projected to where it actually appears on screen in the world camera.
    worldPos(obj, offset, out = new THREE.Vector3()) {
        out.set(offset ? offset[0] : 0, offset ? offset[1] : 0, offset ? offset[2] : 0);
        obj.localToWorld(out);
        return this.view ? this.view.toWorld(out) : out;
    }
    // Raw world position, ignoring the view FOV correction (for rig-space maths).
    rawWorldPos(obj, offset, out = new THREE.Vector3()) {
        out.set(offset ? offset[0] : 0, offset ? offset[1] : 0, offset ? offset[2] : 0);
        return obj.localToWorld(out);
    }
    worldDir(obj, local, out = new THREE.Vector3()) {
        out.set(local ? local[0] : 0, local ? local[1] : 0, local ? local[2] : -1);
        return out.applyQuaternion(obj.getWorldQuaternion(_wq)).normalize();
    }
    // Position of obj (+offset in obj space) expressed in rig space (for rig-space particles).
    localPos(obj, offset, out = new THREE.Vector3()) {
        this.rawWorldPos(obj, offset, out);
        return this.rig.worldToLocal(out);
    }
    muzzle(side = this.lastSide) {
        return this.def.muzzle ? this.def.muzzle(this, side) : this.parts.muzzle;
    }

    // ---- firing --------------------------------------------------------------------
    fire() {
        const side = this.def.side ? this.def.side(this) : 0;
        this.lastSide = side;
        this.ammo--;
        this.shots++;
        this.cooldown = 1 / this.stats.rate;
        this.buffer = 0;
        this.fireT = 0;
        this.prevFireT = -1e-4;

        const k = this.stats.kick;
        this.recoilZ.kick(k.back * 22);
        this.recoilX.kick(k.up * 22);
        this.recoilR.kick((Math.random() * 2 - 1) * k.roll * 22);

        const fl = this.parts.flashes ? this.parts.flashes[side] || this.parts.flashes[0] : null;
        if (fl) {
            fl.age = 0;
        }
        if (this.def.onFire) {
            this.def.onFire(this, side);
        }
        const shot = this.makeShot(side);
        if (this.trace) {
            shot.hits = shot.dirs.map(d => this.trace(shot.origin, d, shot.range));
        }
        if (this.onShot) {
            this.onShot(shot);
        }
        const cfg = this.def.projectile;
        if (cfg) {
            shot.dirs.forEach((d, i) => {
                const hit = shot.hits && shot.hits[i];
                const end = hit ? hit.point : shot.origin.clone().addScaledVector(d, Math.min(shot.range, cfg.maxDist || 60));
                this.projectiles.spawn(shot.muzzle, end, cfg, hit);
            });
        }
    }

    // Drop every particle and projectile in flight (e.g. when switching weapons).
    clearEffects() {
        this.projectiles.clear();
        this.fx.clear();
    }

    // Hitscan info: rays start at the eye (the camera this weapon is attached to) so shots
    // land on the crosshair; `muzzle` is where tracers/effects should start.
    makeShot(side) {
        const eye = this.root.parent || this.root;
        eye.updateWorldMatrix(true, false);
        const origin = new THREE.Vector3().setFromMatrixPosition(eye.matrixWorld);
        const aim = new THREE.Vector3(0, 0, -1).applyQuaternion(eye.getWorldQuaternion(new THREE.Quaternion()));
        const dirs = [];
        for (let i = 0; i < this.stats.pellets; i++) {
            dirs.push(this.stats.spread ? WeaponKit.cone(aim, this.stats.spread) : aim.clone());
        }
        this.root.updateWorldMatrix(true, true);
        return {
            weapon: this.id,
            origin,
            aim,
            dirs,
            damage: this.stats.damage,
            range: this.stats.range,
            muzzle: this.worldPos(this.muzzle(side)),
            side
        };
    }

    // ---- per frame ---------------------------------------------------------------
    /**
     * move: { speed: horizontal speed m/s, sprinting: bool, grounded: bool }
     */
    update(dt, move = {}) {
        if (this.view) {
            this.view.sync();
        }
        dt *= this.timeScale;
        this.time += dt;
        this.cooldown -= dt;
        this.buffer -= dt;
        const st = this.stats;

        if (this.state === 'draw' && this.actT >= st.drawTime) {
            this.setState('ready');
        }
        if (this.state === 'reload' && this.actT >= st.reloadTime) {
            this.ammo = st.mag;
            this.setState('ready');
        }
        const wants = (this.trigger && st.auto) || this.buffer > 0;
        if (wants && this.state === 'ready' && this.cooldown <= 0 && !move.sprinting) {
            if (this.ammo > 0) {
                this.fire();
            } else {
                this.buffer = 0;
                this.reload();
            }
        }

        this.pose(dt, move);
        this.root.updateWorldMatrix(true, true);
        if (this.def.effects) {
            this.def.effects(this, dt);
        }
        this.projectiles.update(dt);
        this.fx.update(dt);

        this.prevActT = this.actT;
        this.actT += dt;
        this.prevFireT = this.fireT;
        this.fireT += dt;
    }

    pose(dt, move) {
        const K = WeaponKit;
        for (const o of this.b.parts) {
            const r = o.userData.rest;
            o.position.copy(r.p);
            o.rotation.copy(r.r);
            o.scale.copy(r.s);
            o.visible = r.v;
        }

        // Shared feel: sway, bob, breathing, recoil, sprint and draw all happen on the rig.
        const speed = move.speed || 0;
        const grounded = move.grounded !== false;
        const sprint = !!move.sprinting && this.state !== 'reload';
        this.moveBlend = K.lerp(this.moveBlend, K.clamp(speed / 6) * (grounded ? 1 : 0.2), Math.min(1, dt * 8));
        this.sprintBlend = K.lerp(this.sprintBlend, sprint ? 1 : 0, Math.min(1, dt * 7));
        this.airBlend = K.lerp(this.airBlend, grounded ? 0 : 1, Math.min(1, dt * 6));
        this.bobPhase += dt * (5.5 + speed * 0.75);
        for (const s of [this.swayX, this.swayY, this.recoilZ, this.recoilX, this.recoilR]) {
            s.update(dt);
        }

        const rig = this.rig;
        const bob = 0.011 * this.moveBlend * (1 + this.sprintBlend * 0.8);
        const t = this.time;
        rig.position.set(
            Math.sin(this.bobPhase) * bob + this.swayX.x * 0.05,
            -Math.abs(Math.cos(this.bobPhase)) * bob + Math.sin(t * 1.6) * 0.0018 + this.swayY.x * 0.04 + this.airBlend * 0.015,
            this.recoilZ.x
        );
        rig.rotation.set(
            this.recoilX.x + this.swayY.x * 0.5 + Math.sin(t * 1.3) * 0.004 - this.sprintBlend * 0.32,
            this.swayX.x * 0.6 + this.sprintBlend * (this.def.sprintYaw === undefined ? 0.6 : this.def.sprintYaw),
            this.recoilR.x + this.swayX.x * 0.5 + Math.sin(this.bobPhase) * 0.012 * this.moveBlend
        );
        rig.position.y += this.recoilX.x * 0.08 - this.sprintBlend * 0.05;
        rig.position.x -= this.sprintBlend * 0.04;

        if (this.state === 'draw') {
            const p = K.e('outCubic', this.actT, 0, this.stats.drawTime);
            rig.position.y -= (1 - p) * 0.32;
            rig.rotation.x -= (1 - p) * 0.9;
            rig.rotation.z += (1 - p) * 0.35;
        }

        for (const f of this.parts.flashes || []) {
            f.age += dt;
            const k = Math.max(0, 1 - f.age / 0.07);
            f.core.visible = f.spike.visible = k > 0;
            if (k > 0) {
                const s = f.size * (0.7 + Math.random() * 0.6) * (0.5 + k * 0.5);
                f.core.scale.setScalar(s);
                f.core.rotation.z = Math.random() * 6;
                f.spike.scale.set(s * 0.45, s * 0.45, s * 2.6);
                f.spike.position.z = -s * 1.4;
            }
            f.light.intensity = k * f.intensity;
        }

        if (this.def.pose) {
            this.def.pose(this, dt);
        }
    }

    dispose() {
        if (this.root.parent) {
            this.root.parent.remove(this.root);
        }
        this.projectiles.dispose();
        this.fx.dispose();
        const geos = new Set();
        const mats = new Set();
        this.root.traverse(o => {
            if (o.geometry) {
                geos.add(o.geometry);
            }
            if (o.material) {
                mats.add(o.material);
            }
        });
        geos.forEach(g => g.dispose());
        mats.forEach(m => m.dispose());
    }
}

// Draws weapons in a second pass with their own camera: a narrower FOV (so guns don't get
// stretched by the world camera's wide FOV) and a cleared depth buffer (so they never clip into walls).
//
//   const view = new WeaponView(camera, { fov: 55 });
//   view.shareLights(scene);            // let the scene's lights light the guns too
//   view.attach(weapon);                // after camera.add(weapon.root)
//   ...each frame: renderer.render(scene, camera); view.render(renderer, scene);
class WeaponView {
    constructor(camera, opts = {}) {
        this.camera = camera;
        this.layer = opts.layer || 1;
        this.cam = new THREE.PerspectiveCamera(opts.fov || 55, camera.aspect, opts.near || 0.01, opts.far || 50);
        this.cam.layers.set(this.layer);
        this._p = new THREE.Vector3();
        this._d = new THREE.Vector3();
    }
    // Put every mesh/light of a weapon on the weapon layer. Flash lights stay on both layers so
    // muzzle flashes light up the room as well as the gun.
    attach(weapon) {
        weapon.view = this;
        weapon.fx.layer = this.layer;
        weapon.root.traverse(o => {
            if (o.isLight) {
                o.layers.enable(0);
                o.layers.enable(this.layer);
            } else {
                o.layers.set(this.layer);
            }
        });
    }
    detach(weapon) {
        weapon.view = null;
        weapon.fx.layer = 0;
        weapon.root.traverse(o => o.layers.set(0));
    }
    shareLights(scene) {
        scene.traverse(o => {
            if (o.isLight) {
                o.layers.enable(this.layer);
            }
        });
    }
    sync() {
        const c = this.camera;
        c.updateMatrixWorld();
        c.getWorldPosition(this.cam.position);
        c.getWorldQuaternion(this.cam.quaternion);
        if (this.cam.aspect !== c.aspect) {
            this.cam.aspect = c.aspect;
            this.cam.updateProjectionMatrix();
        }
        this.cam.updateMatrixWorld();
    }
    // A point on the gun -> the world point that appears at the same spot on screen.
    toWorld(v) {
        const eye = this._p.setFromMatrixPosition(this.cam.matrixWorld);
        const dist = v.distanceTo(eye);
        v.project(this.cam);
        this._d.set(v.x, v.y, 0.5).unproject(this.camera).sub(eye).normalize();
        return v.copy(eye).addScaledVector(this._d, dist);
    }
    render(renderer, scene) {
        this.sync();
        const auto = renderer.autoClear;
        renderer.autoClear = false;
        renderer.clearDepth();
        // A colour/texture background makes three.js clear the frame on every render call,
        // which would wipe out the world pass, so hide it for the gun pass.
        const bg = scene.background;
        scene.background = null;
        renderer.render(scene, this.cam);
        scene.background = bg;
        renderer.autoClear = auto;
    }
}

const Weapons = {
    defs: {},
    order: [],
    register(id, def) {
        def.id = id;
        this.defs[id] = def;
        this.order.push(id);
    },
    get(id) {
        return this.defs[id];
    },
    create(id, opts) {
        return new Weapon(id, opts);
    }
};
