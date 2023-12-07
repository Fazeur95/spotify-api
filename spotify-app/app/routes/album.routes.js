module.exports = app => {
  const albums = require('../controllers/album.controller.js');
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

  router.post('/', upload.single('image'), albums.createAlbum);
  router.get('/', albums.getAlbums);
  router.get('/:id', albums.getAlbum);
  router.put('/:id', albums.updateAlbum);

  app.use('/api/album', router);
};
