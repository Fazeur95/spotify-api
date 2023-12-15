const dbConfig = require('../config/db.config.js');

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const db = {};
db.mongoose = mongoose;
db.url = dbConfig.url;
db.tutorials = require('./tutorial.model.js')(mongoose);
db.tracks = require('./track.model.js')(mongoose);
db.albums = require('./album.model.js')(mongoose);
db.artists = require('./artist.model.js')(mongoose);
db.playlists = require('./playlist.model.js')(mongoose);

module.exports = db;
