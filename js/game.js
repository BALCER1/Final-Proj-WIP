// Game state: main menu -> map -> room -> map -> ... -> boss -> run complete.
// Only the room the player is standing in exists; it is built on entry and disposed on exit.

const Game = {
    state: 'menu',
    room: null,
    def: null,
    optionsBack: 'menu',
    el: {},

    init() {
        for (const id of ['mainMenu', 'optionsMenu', 'pauseMenu', 'mapScreen', 'endScreen', 'quitScreen', 'hud', 'tip', 'mapBackBtn', 'stageLabel', 'warn', 'sens']) {
            this.el[id] = document.getElementById(id);
        }
        Input.init();
        MapView.init();

        const on = (id, fn) => document.getElementById(id).addEventListener('click', fn);
        on('singleBtn', () => this.startRun());
        on('optionsBtn', () => this.openOptions('menu'));
        on('quitBtn', () => this.quit());
        on('resumeBtn', () => this.lock());
        on('pauseOptionsBtn', () => this.openOptions('paused'));
        on('abandonBtn', () => this.toMenu());
        on('optionsBackBtn', () => this.setState(this.optionsBack));
        on('endMenuBtn', () => this.toMenu());
        on('quitBackBtn', () => this.setState('menu'));
        on('mapBackBtn', () => this.closeBrowse());

        this.el.sens.oninput = () => {
            CONFIG.sensitivity = this.el.sens.value * 0.0005;
        };
        this.el.sens.oninput();

        addEventListener('keydown', e => {
            if (e.code === 'KeyM' && !e.repeat) {
                if (this.state === 'playing') {
                    this.browseMap();
                } else if (this.state === 'mapview') {
                    this.closeBrowse();
                }
            }
            if (e.code === 'KeyE' && this.state === 'playing' && this.room.door && this.room.door.near(Player.pos)) {
                this.room.door.open();
            }
        });
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === renderer.domElement) {
                this.setState('playing');
            } else if (this.state === 'playing') {
                this.setState('paused');
            }
        });
        document.addEventListener('pointerlockerror', () => {
            this.setState('paused');
            this.el.warn.hidden = false;
        });
        document.addEventListener('mousemove', e => {
            if (this.state === 'playing') {
                Player.look(e.movementX, e.movementY);
            }
        });

        this.setState('menu');
        this.last = performance.now();
        requestAnimationFrame(t => this.loop(t));
    },

    setState(s) {
        this.state = s;
        const screens = {
            menu: 'mainMenu',
            options: 'optionsMenu',
            paused: 'pauseMenu',
            map: 'mapScreen',
            mapview: 'mapScreen',
            complete: 'endScreen',
            quit: 'quitScreen'
        };
        for (const id of new Set(Object.values(screens))) {
            this.el[id].hidden = id !== screens[s];
        }
        this.el.mapBackBtn.hidden = s !== 'mapview';
        this.el.hud.hidden = s !== 'playing';
        this.el.warn.hidden = true;
    },

    openOptions(back) {
        this.optionsBack = back;
        this.setState('options');
    },

    lock() {
        renderer.domElement.requestPointerLock();
    },

    startRun() {
        this.unloadRoom();
        RunMap.generate(CONFIG.stages);
        this.openMap();
    },

    // The full zoom-out reveal only plays at the start of a run and after a boss.
    openMap() {
        this.setState('map');
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        this.unloadRoom();
        const here = RunMap.current;
        MapView.open({
            onPick: node => this.enterRoom(node),
            animate: !here || here.type === 'boss'
        });
    },

    // M mid-room: look at the map without leaving the room.
    browseMap() {
        this.setState('mapview');
        document.exitPointerLock();
        MapView.open({ browse: true });
    },

    closeBrowse() {
        MapView.close();
        this.setState('entering');
        this.lock();
    },

    enterRoom(node) {
        RunMap.visit(node);
        this.def = Rooms.get(node.type);
        const b = new RoomBuilder();
        this.def.build(b, node);
        this.room = b;
        Player.reset(b);
        scene.background = new THREE.Color(b.background);
        scene.fog = b.fog;
        this.el.stageLabel.textContent = `Stage ${node.layer + 1} / ${RunMap.layers.length} - ${this.def.name}`;
        this.setState('entering');
        this.lock();
    },

    unloadRoom() {
        if (this.room) {
            this.room.dispose();
            this.room = null;
            this.def = null;
        }
    },

    leaveRoom() {
        if (RunMap.current.next.length) {
            this.openMap();
            return;
        }
        this.setState('complete');
        document.exitPointerLock();
        this.unloadRoom();
    },

    toMenu() {
        this.unloadRoom();
        this.setState('menu');
    },

    quit() {
        // Browsers only let a page close itself if script opened it, so fall back to a goodbye screen.
        window.close();
        this.setState('quit');
    },

    updateRoom(dt) {
        if (this.def.update) {
            this.def.update(dt, this.room);
        }
        const door = this.room.door;
        if (!door) {
            return;
        }
        door.update(dt);
        this.el.tip.hidden = door.isOpen || !door.near(Player.pos);
        if (door.passed(Player.pos)) {
            this.leaveRoom();
        }
    },

    loop(now) {
        const dt = Math.min((now - this.last) / 1000, 0.05);
        this.last = now;
        if (this.state === 'playing') {
            Player.update(dt);
            this.updateRoom(dt);
        }
        if (this.room && this.state !== 'mapview') {
            renderer.render(scene, camera);
        }
        requestAnimationFrame(t => this.loop(t));
    }
};

Game.init();
