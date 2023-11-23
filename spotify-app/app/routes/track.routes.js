module.exports = app => {
  const tracks = require('../controllers/track.controller.js');
  const multer = require('multer');

  var router = require('express').Router();

  // Set multer storage

  const upload = multer({ dest: '/tmp/' });
  // Upload a new track
  router.post('/upload', upload.single('track'), tracks.uploadTrack);
  router.get('/', tracks.getTracks);
  router.get('/:id', tracks.getTrack);
  router.put('/:id', tracks.updateTrack);
  router.delete('/:id', tracks.deleteTrack);

  app.use('/api/track', router);
};
