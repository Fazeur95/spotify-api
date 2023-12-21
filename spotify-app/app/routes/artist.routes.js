module.exports = app => {
  const artist = require('../controllers/artist.controller.js');
  const multer = require('multer');

  var router = require('express').Router();
  const path = require('path');

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'tmp/image');
    },
    filename: function (req, file, cb) {
      cb(
        null,
        file?.fieldname + '-' + Date.now() + path.extname(file?.originalname)
      );
    },
  });

  const upload = multer({ storage: storage });

  router.post('/', upload.single('image'), artist.createArtist);
  router.get('/', artist.getArtists);
  router.get('/:id', artist.getArtist);
  router.put('/:id', upload.single('image'), artist.updateArtist);
  router.delete('/:id', artist.deleteArtist);

  app.use('/api/artist', router);
};
