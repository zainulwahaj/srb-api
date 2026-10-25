// The services call these helpers after a booking changes. They do nothing
// until server.js hands over the Socket.IO instance, so the services and the
// seed script also work without a socket server.
let io = null;

const roomChannel = (roomCode) => `room:${roomCode}`;

function setIO(instance) {
  io = instance;
}

// Only sockets that joined this slot's room get the update.
function slotUpdated(slot) {
  if (!io || !slot) return;
  io.to(roomChannel(slot.roomCode)).emit('slot:updated', {
    slotId: String(slot._id),
    seatsLeft: slot.seats - slot.booked,
  });
}

module.exports = { setIO, slotUpdated, roomChannel };
