// Start room. Placeholder: a plain white box with an exit door. Build the real room here.
Rooms.register('start', {
    name: 'Start',
    color: 0xf2f2f2,
    build(b, node) {
        RoomKit.basicRoom(b, { color: this.color });
    }
});
