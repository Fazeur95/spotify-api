module.exports = app => {
  const tracks = require('../controllers/track.controller.js');
  const multer = require('multer');

  var router = require('express').Router();
  const path = require('path');

  // Set multer storage
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      if (file.fieldname === 'img') {
        cb(null, './tmp/images'); // Change this to your desired folder for images
      } else if (file.fieldname === 'track') {
        cb(null, '/tmp/'); // This is for track
      } else {
        cb(new Error('Invalid field name'));
      }
    },
    filename: function (req, file, cb) {
      let ext = '';
      if (file.fieldname === 'img') {
        ext = path.extname(file.originalname);
      }
      cb(null, Math.random().toString(36).substring(2, 15) + ext);
    },
  });

  const upload = multer({ storage: storage });

  router.post(
    '/upload',
    upload.fields([
      { name: 'track', maxCount: 1 },
      { name: 'img', maxCount: 1 },
    ]),
    tracks.uploadTrack
  );
  router.get('/', tracks.getTracks);
  router.get('/:id', tracks.getTrack);
  router.put('/:id', tracks.updateTrack);
  router.delete('/:id', tracks.deleteTrack);

  app.use('/api/track', router);
};
