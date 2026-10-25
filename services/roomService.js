const Room = require('../models/Room');
const Slot = require('../models/Slot');
const ApiError = require('../utils/ApiError');
const { requireObject } = require('../utils/validate');

const EDITABLE = ['name', 'building', 'seats'];

const normalizeCode = (code) => String(code).trim().toUpperCase();

// PUT and PATCH may repeat the roomCode, but it has to be the same one.
function rejectCodeChange(code, body) {
  if (body.roomCode !== undefined && normalizeCode(body.roomCode) !== code) {
    throw ApiError.unprocessable('roomCode cannot be changed after the room is created', 'ROOMCODE_IMMUTABLE');
  }
}

function rejectUnknownFields(body) {
  const unknown = Object.keys(body).filter((k) => k !== 'roomCode' && !EDITABLE.includes(k));
  if (unknown.length) {
    throw ApiError.unprocessable(`Unknown field(s): ${unknown.join(', ')}`, 'UNKNOWN_FIELD');
  }
}

async function listRooms() {
  return Room.find().sort({ roomCode: 1 });
}

async function getRoom(roomCode) {
  const room = await Room.findOne({ roomCode: normalizeCode(roomCode) });
  if (!room) throw ApiError.notFound(`Room ${roomCode} not found`, 'ROOM_NOT_FOUND');
  return room;
}

async function createRoom(body) {
  requireObject(body);
  rejectUnknownFields(body);
  const { roomCode, name, building, seats } = body;

  if (typeof roomCode === 'string' && await Room.exists({ roomCode: normalizeCode(roomCode) })) {
    throw ApiError.conflict(`Room ${normalizeCode(roomCode)} already exists`, 'ROOM_EXISTS');
  }
  return Room.create({ roomCode, name, building, seats });
}

// PUT: the whole room is replaced, so every editable field must be sent.
async function replaceRoom(roomCode, body) {
  requireObject(body);
  const room = await getRoom(roomCode);
  rejectCodeChange(room.roomCode, body);
  rejectUnknownFields(body);

  for (const field of EDITABLE) room.set(field, body[field]);
  return room.save();
}

// PATCH: only the fields that were sent change.
async function updateRoom(roomCode, body) {
  requireObject(body);
  const room = await getRoom(roomCode);
  rejectCodeChange(room.roomCode, body);
  rejectUnknownFields(body);

  const fields = EDITABLE.filter((f) => body[f] !== undefined);
  if (!fields.length) throw ApiError.badRequest(`Send at least one of: ${EDITABLE.join(', ')}`);

  for (const field of fields) room.set(field, body[field]);
  return room.save();
}

// A room can be removed together with its slots, but not while someone
// still holds a booking in one of them.
async function deleteRoom(roomCode) {
  const room = await getRoom(roomCode);
  if (await Slot.exists({ roomCode: room.roomCode, booked: { $gt: 0 } })) {
    throw ApiError.conflict('This room still has booked slots. Cancel those bookings first.', 'ROOM_HAS_BOOKINGS');
  }
  await Slot.deleteMany({ roomCode: room.roomCode });
  await room.deleteOne();
}

module.exports = { listRooms, getRoom, createRoom, replaceRoom, updateRoom, deleteRoom, normalizeCode };
