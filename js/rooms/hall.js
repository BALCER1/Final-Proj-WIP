// Great Hall: the original medieval hall map, rebuilt as a room.
// The standalone version still lives in prototypes/Medieval Hall.html.

(() => {
    const HALL = {
        halfW: 30,
        halfL: 50,
        wallH: 14,
        balconyY: 6,
        balconyDepth: 8,
        slab: 0.5,
        stepH: 0.4,
        stepCount: 15
    };

    function arch(b, span, rise, x, z, alongZ) {
        const hw = span / 2;
        const t = 0.7;
        const inner = rise - t * 1.4;
        const s = new THREE.Shape();
        s.moveTo(-hw, 0);
        s.quadraticCurveTo(-hw, rise * 0.45, 0, rise);
        s.quadraticCurveTo(hw, rise * 0.45, hw, 0);
        s.lineTo(hw - t, 0);
        s.quadraticCurveTo(hw - t, inner * 0.45, 0, inner);
        s.quadraticCurveTo(-hw + t, inner * 0.45, -hw + t, 0);
        s.closePath();
        const geo = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 10 });
        const mesh = new THREE.Mesh(geo, b.mat(0x6a5844));
        if (alongZ) {
            mesh.rotation.y = Math.PI / 2;
            mesh.position.set(x - 0.5, HALL.wallH - rise, z);
        } else {
            mesh.position.set(x, HALL.wallH - rise, z - 0.5);
        }
        b.group.add(mesh);
    }

    function pillar(b, x, z) {
        const H = HALL.wallH;
        const shaft = 0x6e6559;
        const trim = 0x80766a;
        b.box(x, 0, z, 3.2, 0.45, 3.2, trim);
        b.deco(x, 0.45, z, 2.6, 0.6, 2.6, trim);
        b.box(x, 0, z, 2, H, 2, shaft);
        b.deco(x, 7, z, 2.5, 0.35, 2.5, trim);
        b.deco(x, H - 2.2, z, 2.6, 0.5, 2.6, trim);
        b.deco(x, H - 1.7, z, 3.2, 1.7, 3.2, trim);
    }

    function fenceZ(b, x, z0, z1, y) {
        const wood = 0x4a3426;
        const len = z1 - z0;
        const zc = (z0 + z1) / 2;
        b.solid(x, y, zc, 0.2, 1.2, len);
        b.deco(x, y + 1.1, zc, 0.18, 0.12, len, wood);
        b.deco(x, y + 0.55, zc, 0.1, 0.08, len, wood);
        const n = Math.round(len / 2.5);
        for (let i = 0; i <= n; i++) {
            b.deco(x, y, z0 + len * i / n, 0.18, 1.2, 0.18, wood);
        }
    }

    function fenceX(b, z, x0, x1, y) {
        const wood = 0x4a3426;
        const len = x1 - x0;
        const xc = (x0 + x1) / 2;
        b.solid(xc, y, z, len, 1.2, 0.2);
        b.deco(xc, y + 1.1, z, len, 0.12, 0.18, wood);
        b.deco(xc, y + 0.55, z, len, 0.08, 0.1, wood);
        const n = Math.round(len / 2.5);
        for (let i = 0; i <= n; i++) {
            b.deco(x0 + len * i / n, y, z, 0.18, 1.2, 0.18, wood);
        }
    }

    // The hall's big double door. Same interface as Door in room-kit.js.
    class HallDoor {
        constructor(b) {
            const L = HALL.halfL;
            const dark = 0x2e231a;
            const wood = 0x5b4130;
            this.x = 0;
            this.z = -L;
            this.t = 0;
            this.isOpen = false;
            b.deco(this.x - 2.3, 0, -L + 0.25, 0.5, 5.4, 0.5, dark);
            b.deco(this.x + 2.3, 0, -L + 0.25, 0.5, 5.4, 0.5, dark);
            b.deco(this.x, 5, -L + 0.25, 5.1, 0.4, 0.5, dark);
            this.left = new THREE.Group();
            this.left.position.set(this.x - 2, 0, -L + 0.12);
            const leafL = new THREE.Mesh(new THREE.BoxGeometry(2, 5, 0.15), b.mat(wood));
            leafL.position.set(1, 2.5, 0);
            this.left.add(leafL);
            this.right = new THREE.Group();
            this.right.position.set(this.x + 2, 0, -L + 0.12);
            const leafR = new THREE.Mesh(new THREE.BoxGeometry(2, 5, 0.15), b.mat(wood));
            leafR.position.set(-1, 2.5, 0);
            this.right.add(leafR);
            b.group.add(this.left, this.right);
            this.collider = b.solid(this.x, 0, -L + 0.12, 4, 5, 0.3);
        }
        near(pos) {
            return Math.hypot(pos.x - this.x, pos.z - this.z) < 7;
        }
        open() {
            this.isOpen = true;
            this.collider.off = true;
        }
        passed(pos) {
            return pos.z < this.z - 2.5;
        }
        update(dt) {
            if (this.isOpen && this.t < 1) {
                this.t = Math.min(1, this.t + dt * 0.8);
                const e = this.t * this.t * (3 - 2 * this.t);
                this.left.rotation.y = -e * 1.75;
                this.right.rotation.y = e * 1.75;
            }
        }
    }

    Rooms.register('hall', {
        name: 'Great Hall',
        icon: 'H',
        color: 0x8b7d6b,
        build(b, node) {
            const W = HALL.halfW;
            const L = HALL.halfL;
            const H = HALL.wallH;
            const BY = HALL.balconyY;
            const BD = HALL.balconyDepth;
            const slab = HALL.slab;
            const SH = HALL.stepH;
            const SC = HALL.stepCount;

            const stone = 0x8b7d6b;
            const wood = 0x5b4130;
            const rib = 0x5a4a3a;

            b.background = 0x15110e;
            b.fog = new THREE.Fog(0x15110e, 40, 140);
            b.spawn = { x: 0, z: 42, yaw: 0 };

            b.deco(0, -0.1, 0, W * 2, 0.1, L * 2, 0x6f6a62);
            b.box(-W - 1, 0, 0, 2, H, L * 2 + 4, stone);
            b.box(W + 1, 0, 0, 2, H, L * 2 + 4, stone);
            b.box(0, 0, L + 1, W * 2, H, 2, stone);
            b.box(0, H, 0, W * 2 + 4, 1, L * 2 + 4, 0x3d2f24);

            // Back wall with a doorway, and darkness beyond it.
            const dw = 4;
            const dh = 5;
            const side = W - dw / 2;
            b.box(-(dw / 2 + side / 2), 0, -L - 1, side, H, 2, stone);
            b.box(dw / 2 + side / 2, 0, -L - 1, side, H, 2, stone);
            b.box(0, dh, -L - 1, dw, H - dh, 2, stone);
            const depth = 4;
            const cz = -L - 2 - depth / 2;
            b.dark(0, -0.1, cz, dw + 1, 0.1, depth, false);
            b.dark(0, dh, cz, dw + 1, 0.1, depth, false);
            b.dark(-dw / 2 - 0.25, 0, cz, 0.5, dh, depth);
            b.dark(dw / 2 + 0.25, 0, cz, 0.5, dh, depth);
            b.dark(0, 0, -L - 2 - depth - 0.25, dw + 1, dh, 0.5);

            for (let z = -40; z <= 40; z += 10) {
                pillar(b, -12, z);
                pillar(b, 12, z);
                arch(b, 24, 5, 0, z, false);
                arch(b, 18, 4, -21, z, false);
                arch(b, 18, 4, 21, z, false);
            }
            for (const x of [-12, 12]) {
                for (let z = -35; z <= 35; z += 10) {
                    arch(b, 10, 3, x, z, true);
                }
            }
            for (const x of [-21, 0, 21]) {
                b.deco(x, H - 0.6, 0, 0.7, 0.6, L * 2, rib);
            }

            const stairStart = L - 5;
            const zNear = stairStart + 0.5;
            const zFar = stairStart - (SC - 1) - 0.5;
            const slabEnd = zFar;
            const slabLen = slabEnd + L;
            const slabCenter = (slabEnd - L) / 2;

            for (const s of [-1, 1]) {
                const cx = s * (W - BD / 2);
                const innerX = s * (W - BD);
                const sx = s * (W - (BD - 1) / 2);
                const hallX = s * (W - (BD - 1));

                b.box(cx, BY - slab, slabCenter, BD, slab, slabLen, wood);
                fenceZ(b, innerX + s * 0.2, -L + BD - 0.2, slabEnd, BY);

                for (let z = -40; z <= slabEnd - 10; z += 10) {
                    b.box(innerX + s * 0.8, 0, z, 1, BY - slab, 1, 0x6e6559);
                }

                for (let i = 0; i < SC; i++) {
                    b.deco(sx, 0, stairStart - i, BD - 1, (i + 1) * SH, 1, stone);
                }

                const xa = s * W;
                const xb = hallX + s * 0.1;
                b.ramps.push({
                    x0: Math.min(xa, xb),
                    x1: Math.max(xa, xb),
                    zNear,
                    zFar,
                    zRef: stairStart + 1,
                    slope: SH,
                    top: SC * SH
                });

                b.solid(hallX, 0, (zNear + zFar) / 2, 0.2, BY, zNear - zFar);
                b.solid(cx, 0, zFar, BD, BY, 0.2);

                const rise = SC * SH;
                const run = zNear - zFar;
                const rail = b.deco(hallX, 0, (zNear + zFar) / 2, 0.15, 0.12, Math.hypot(run, rise), 0x4a3426);
                rail.position.y = rise / 2 + SH / 2 + 1.1;
                rail.rotation.x = Math.atan2(rise, run);
                for (let k = 0; k <= 5; k++) {
                    const z = zNear - k * (run / 5);
                    b.deco(hallX, SH * (stairStart + 1 - z), z, 0.15, 1.1, 0.15, 0x4a3426);
                }
            }

            b.box(0, BY - slab, -L + BD / 2, (W - BD) * 2, slab, BD, wood);
            fenceX(b, -L + BD - 0.2, -(W - BD) - 0.2, (W - BD) + 0.2, BY);
            for (const x of [-12, 12]) {
                b.box(x, 0, -L + BD - 0.8, 1, BY - slab, 1, 0x6e6559);
            }

            b.deco(0, 0, -1, 12.8, 0.02, 94.8, 0x9a7b2f);
            b.deco(0, 0, -1, 12, 0.03, 94, 0x7a1f1f);
            b.deco(0, 0, -1, 9, 0.04, 90, 0x611818);

            b.door = new HallDoor(b);
        }
    });
})();
