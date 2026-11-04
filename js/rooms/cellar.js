Rooms.register('cellar', {
    name: 'Cellar',
    color: 0x8b5a2b,
    build(b, node) {
        RoomKit.basicRoom(b, { color: this.color });
    }
});
