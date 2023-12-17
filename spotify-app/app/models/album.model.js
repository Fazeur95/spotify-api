const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const albumSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
  },
  artist: { type: Schema.Types.ObjectId, ref: 'Artist' },
  tracks: [{ type: Schema.Types.ObjectId, ref: 'Track' }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  numberListenings: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model('Album', albumSchema);
