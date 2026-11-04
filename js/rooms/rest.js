Rooms.register('rest', {
    name: 'Rest',
    color: 0x3498db,
    build(b, node) {
        RoomKit.basicRoom(b, { color: this.color });
    }
});
