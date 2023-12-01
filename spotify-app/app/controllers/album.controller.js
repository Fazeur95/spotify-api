const Album = require('../models/album.model');

exports.getAlbums = (req, res) => {
  let query = Album.find({});

  if (req.query.populate) {
    query = query.populate('artist').populate('tracks');
  }

  query.exec((err, albums) => {
    if (err) {
      return res.send({
        message: 'Error getting albums',
        error: err,
      });
    }

    return res.json(albums);
  });
};

exports.getAlbum = (req, res) => {
  Album.findById(req.params.id)
    .populate('artist')
    .populate('tracks')
    .exec((err, album) => {
      if (err) {
        return res.send({
          message: 'Error getting album',
          error: err,
        });
      }

      return res.json(album);
    });
};

exports.createAlbum = (req, res) => {
  const album = new Album({
    name: req.body.name,
    artist: req.body.artist,
    imageUrl: req.file.filename ? '/tmp/image/' + req.file.filename : '',
  });

  album.save((err, album) => {
    if (err) {
      return res.send({
        message: 'Error saving album',
        error: err,
      });
    }

    return res.json(album);
  });
};

exports.updateAlbum = (req, res) => {
  const albumId = req.params.id;
  const updateData = req.body;

  Album.findByIdAndUpdate(albumId, updateData, { new: true }, (err, album) => {
    if (err) {
      res.status(500).send(err);
      return;
    }
    if (!album) {
      res.status(404).send({ message: "Album non trouvé avec l'ID fourni" });
      return;
    }

    res.json(album);
  });
};
