module.exports = app => {
  const tracks = require('../controllers/track.controller.js');
  const multer = require('multer');

  var router = require('express').Router();
  const path = require('path');

  // Set multer storage
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      if (file.fieldname === 'track') {
        cb(null, '/tmp/'); // This is for track
      }
    },
    filename: function (req, file, cb) {
      cb(null, Math.random().toString(36).substring(2, 15));
    },
  });

  const upload = multer({ storage: storage });

  router.post('/', upload.single('track'), tracks.uploadTrack);
  router.get('/', tracks.getTracks);
  router.get('/:id', tracks.getTrack);
  router.put('/:id', tracks.updateTrack);
  router.delete('/:id', tracks.deleteTrack);

  app.use('/api/track', router);
};
