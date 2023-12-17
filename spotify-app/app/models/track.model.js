const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const trackSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  album: { type: Schema.Types.ObjectId, ref: 'Album' },
  order: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  numberListenings: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model('Track', trackSchema);
