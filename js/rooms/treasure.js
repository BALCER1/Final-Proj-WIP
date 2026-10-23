// Treasure room. Placeholder: a plain gold box with an exit door. Build the real room here.
Rooms.register('treasure', {
    name: 'Treasure',
    color: 0xf1c40f,
    build(b, node) {
        RoomKit.basicRoom(b, { color: this.color });
    }
});
