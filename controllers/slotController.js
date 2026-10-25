const slotService = require('../services/slotService');

async function create(req, res) {
  const slot = await slotService.createSlot(req.body);
  res.status(201).location(`/api/v1/slots/${slot.id}`).json(slot);
}

async function getOne(req, res) {
  res.json(await slotService.getSlot(req.params.id));
}

async function list(req, res) {
  res.json(await slotService.listSlots(req.query));
}

module.exports = { create, getOne, list };
