module.exports = app => {
  const playlist = require('../controllers/playlist.controller.js');
  const multer = require('multer');
  const path = require('path');

  var router = require('express').Router();

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'tmp/image');
    },
    filename: function (req, file, cb) {
      cb(
        null,
        file.fieldname + '-' + Date.now() + path.extname(file.originalname)
      ); // Ajout de l'extension
    },
  });

  const upload = multer({ storage: storage });

  router.post('/', upload.single('image'), playlist.createPlaylist);
  router.get('/', playlist.getPlaylists);
  router.get('/:id', playlist.getPlaylist);
  router.put('/:id', playlist.updatePlaylist);
  router.delete('/:id', playlist.deletePlaylist);
  router.post('/:id/track', playlist.addTrackToPlaylist);
  router.delete('/:id/track/:trackId', playlist.deleteTrackFromPlaylist);

  app.use('/api/playlist', router);
};
