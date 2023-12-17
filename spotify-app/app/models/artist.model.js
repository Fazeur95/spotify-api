const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const artistSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  albums: [{ type: Schema.Types.ObjectId, ref: 'Album' }],
  imageUrl: {
    type: String,
  },
  numberListenings: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model('Artist', artistSchema);
