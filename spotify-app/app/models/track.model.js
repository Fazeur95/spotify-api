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
});

module.exports = mongoose.model('Track', trackSchema);
