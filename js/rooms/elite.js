Rooms.register('elite', {
    name: 'Elite',
    color: 0xe67e22,
    build(b, node) {
        RoomKit.basicRoom(b, { color: this.color });
    }
});
