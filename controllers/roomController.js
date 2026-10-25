const roomService = require('../services/roomService');

async function list(req, res) {
  res.json(await roomService.listRooms());
}

async function getOne(req, res) {
  res.json(await roomService.getRoom(req.params.roomCode));
}

async function create(req, res) {
  const room = await roomService.createRoom(req.body);
  res.status(201).location(`/api/v1/rooms/${room.roomCode}`).json(room);
}

async function replace(req, res) {
  res.json(await roomService.replaceRoom(req.params.roomCode, req.body));
}

async function update(req, res) {
  res.json(await roomService.updateRoom(req.params.roomCode, req.body));
}

async function remove(req, res) {
  await roomService.deleteRoom(req.params.roomCode);
  res.status(204).end();
}

module.exports = { list, getOne, create, replace, update, remove };
