Rooms.register('shop', {
    name: 'Shop',
    icon: '$',
    color: 0x2ecc71,
    build(b, node) {
        RoomKit.basicRoom(b, { color: this.color });
    }
});
