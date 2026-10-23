// Elite room. Placeholder: a plain orange box with an exit door. Build the real room here.
Rooms.register('elite', {
    name: 'Elite',
    color: 0xe67e22,
    build(b, node) {
        RoomKit.basicRoom(b, { color: this.color });
    }
});
