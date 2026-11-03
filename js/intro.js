// Boot intro: "FungDung" is thrown up from below the screen and bounces to rest,
// then fades into the main menu. Click or any key skips it.
// The bounce is simulated (gravity + energy lost per bounce) rather than keyframed,
// so speed changes continuously and each bounce is naturally smaller than the last.

const Intro = {
    gravity: 4200,      // px/s^2
    peak: 150,          // px above the resting line at the top of the first rise
    restitution: 0.55,  // fraction of speed kept after each bounce
    squashMax: 0.14,

    play(done) {
        this.title = document.getElementById('introTitle');
        this.screen = document.getElementById('introScreen');
        this.done = done;

        // y is px below the resting line (positive = lower). Launch so the first rise peaks at -peak.
        this.y = innerHeight * 0.6;
        this.vy = -Math.sqrt(2 * this.gravity * (this.y + this.peak));
        this.squash = 0;
        this.squashVel = 0;
        this.settled = false;

        this.skip = () => this.finish();
        addEventListener('keydown', this.skip);
        this.screen.addEventListener('pointerdown', this.skip);

        this.last = performance.now();
        this.frame = requestAnimationFrame(t => this.tick(t));
    },

    tick(now) {
        let dt = Math.min((now - this.last) / 1000, 1 / 30);
        this.last = now;
        // Fixed substeps keep the bounce identical at any frame rate.
        const step = 1 / 240;
        while (dt > 0) {
            const h = Math.min(step, dt);
            this.simulate(h);
            dt -= h;
        }

        const s = this.squash;
        this.title.style.transform = `translate3d(0, ${this.y.toFixed(2)}px, 0) scale(${(1 + s).toFixed(4)}, ${(1 - s).toFixed(4)})`;

        if (this.settled && Math.abs(this.squash) < 0.001) {
            this.title.style.transform = 'none';
            this.timer = setTimeout(this.skip, 700);
            return;
        }
        this.frame = requestAnimationFrame(t => this.tick(t));
    },

    simulate(h) {
        if (!this.settled) {
            this.vy += this.gravity * h;
            this.y += this.vy * h;
            // Only bounce when falling onto the line, not on the way up through it.
            if (this.y >= 0 && this.vy > 0) {
                this.y = 0;
                this.squashVel += this.vy * 0.0016;
                this.vy *= -this.restitution;
                if (Math.abs(this.vy) < 120) {
                    this.vy = 0;
                    this.settled = true;
                }
            }
        }
        // Squash is a damped spring, so it eases in and out instead of snapping.
        const k = 900;
        const c = 30;
        this.squashVel += (-k * this.squash - c * this.squashVel) * h;
        this.squash = Math.max(-this.squashMax, Math.min(this.squashMax, this.squash + this.squashVel * h));
    },

    finish() {
        cancelAnimationFrame(this.frame);
        clearTimeout(this.timer);
        removeEventListener('keydown', this.skip);
        this.screen.removeEventListener('pointerdown', this.skip);
        this.screen.classList.add('out');
        this.done();
        setTimeout(() => {
            this.screen.hidden = true;
        }, 500);
    }
};
