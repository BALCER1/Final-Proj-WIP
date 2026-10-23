// Rest room. Placeholder: a plain blue box with an exit door. Build the real room here.
Rooms.register('rest', {
    name: 'Rest',
    color: 0x3498db,
    build(b, node) {
        RoomKit.basicRoom(b, { color: this.color });
    }
});
