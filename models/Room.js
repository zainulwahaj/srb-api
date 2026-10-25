const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomCode: {
      type: String,
      required: [true, 'roomCode is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^ROOM-\d{2,}$/, 'roomCode must look like ROOM-01'],
      immutable: true,
    },
    name: { type: String, required: [true, 'name is required'], trim: true, maxlength: 80 },
    building: { type: String, required: [true, 'building is required'], trim: true, maxlength: 80 },
    seats: {
      type: Number,
      required: [true, 'seats is required'],
      min: [1, 'seats must be at least 1'],
      max: [500, 'seats can be at most 500'],
      validate: { validator: Number.isInteger, message: 'seats must be a whole number' },
    },
  },
  { timestamps: true },
);

roomSchema.set('toJSON', {
  versionKey: false,
  transform(doc, ret) {
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Room', roomSchema);
