const Intro = {
    gravity: 4200,
    peak: 150,
    restitution: 0.55,
    squashMax: 0.14,

    play(done) {
        this.title = document.getElementById('introTitle');
        this.screen = document.getElementById('introScreen');
        this.done = done;

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
