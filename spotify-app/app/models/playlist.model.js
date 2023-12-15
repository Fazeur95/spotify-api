const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const playlistSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
  },
  tracks: [{ type: Schema.Types.ObjectId, ref: 'Track' }],
});

module.exports = mongoose.model('Playlist', playlistSchema);
