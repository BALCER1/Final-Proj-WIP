// Boss room. Placeholder: a plain crimson box with an exit door. Build the real room here.
Rooms.register('boss', {
    name: 'Boss',
    color: 0x8e1b1b,
    build(b, node) {
        RoomKit.basicRoom(b, { color: this.color, width: 30, length: 40, height: 9 });
    }
});
