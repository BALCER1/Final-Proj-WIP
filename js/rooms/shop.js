// Shop room. Placeholder: a plain green box with an exit door. Build the real room here.
Rooms.register('shop', {
    name: 'Shop',
    icon: '$',
    color: 0x2ecc71,
    build(b, node) {
        RoomKit.basicRoom(b, { color: this.color });
    }
});
