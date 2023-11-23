const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const trackSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  artist: {
    type: String,
    required: true,
  },
  album: {
    type: String,
    required: true,
  },
  photo: {
    data: Buffer,
    contentType: String,
  },
  url: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('Track', trackSchema);
