// Event room. Placeholder: a plain purple box with an exit door. Build the real room here.
Rooms.register('event', {
    name: 'Event',
    color: 0x9b59b6,
    build(b, node) {
        RoomKit.basicRoom(b, { color: this.color });
    }
});
