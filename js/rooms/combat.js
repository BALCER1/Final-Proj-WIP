// Combat room. Placeholder: a plain red box with an exit door. Build the real room here.
Rooms.register('combat', {
    name: 'Combat',
    color: 0xd9534f,
    build(b, node) {
        RoomKit.basicRoom(b, { color: this.color });
    }
});
