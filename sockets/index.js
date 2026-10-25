const crypto = require('crypto');
const { Server } = require('socket.io');
const roomService = require('../services/roomService');
const slotService = require('../services/slotService');
const realtime = require('./realtime');

const MAX_ANNOUNCEMENT = 280;

function slotForBoard(slot) {
  return {
    id: String(slot._id),
    date: slot.date,
    startHour: slot.startHour,
    seats: slot.seats,
    booked: slot.booked,
    seatsLeft: slot.seats - slot.booked,
  };
}

// Compare keys without leaking how many characters matched
function sameKey(given, expected) {
  const a = crypto.createHash('sha256').update(String(given)).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

function initSockets(httpServer, { adminKey }) {
  const io = new Server(httpServer);
  realtime.setIO(io);

  // ---- boards (default namespace)
  io.on('connection', (socket) => {
    socket.on('join:room', async (roomCode, ack) => {
      if (typeof ack !== 'function') return;
      try {
        if (typeof roomCode !== 'string' || !roomCode.trim()) throw new Error('roomCode is required');
        const room = await roomService.getRoom(roomCode);

        // a board watches one room at a time
        for (const joined of socket.rooms) {
          if (joined.startsWith('room:')) socket.leave(joined);
        }
        socket.join(realtime.roomChannel(room.roomCode));

        const slots = await slotService.findSlots({ roomCode: room.roomCode });
        ack({
          ok: true,
          room: { roomCode: room.roomCode, name: room.name, building: room.building, seats: room.seats },
          slots: slots.map(slotForBoard),
        });
      } catch (err) {
        ack({ ok: false, error: err.message });
      }
    });
  });

  // ---- admins
  const admin = io.of('/admin');

  admin.use((socket, next) => {
    const key = socket.handshake.auth && socket.handshake.auth.adminKey;
    if (!adminKey) return next(new Error('Admin access is turned off: ADMIN_KEY is not set on the server'));
    if (typeof key !== 'string' || !key) return next(new Error('An admin key is required'));
    if (!sameKey(key, adminKey)) return next(new Error('Wrong admin key, connection refused'));
    next();
  });

  admin.on('connection', (socket) => {
    socket.on('announce', (payload, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      const raw = typeof payload === 'string' ? payload : payload && payload.message;
      const message = typeof raw === 'string' ? raw.trim() : '';

      if (!message) return reply({ ok: false, error: 'Message cannot be empty' });
      if (message.length > MAX_ANNOUNCEMENT) {
        return reply({ ok: false, error: `Message can be at most ${MAX_ANNOUNCEMENT} characters` });
      }

      io.emit('announcement', { message, at: new Date().toISOString() });
      reply({ ok: true, boards: io.of('/').sockets.size });
    });
  });

  return io;
}

module.exports = initSockets;
