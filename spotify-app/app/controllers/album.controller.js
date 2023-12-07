const { uploadS3 } = require('../../utils/s3');
const Album = require('../models/album.model');
const fs = require('fs');

const { AWS_CLOUDFRONT_HOST } = process.env;

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
        res.status(500);
        return res.send({
          message: 'Error getting album',
          error: err,
        });
      }

      return res.json(album);
    });
};

exports.createAlbum = (req, res) => {
  console.log(req.file);

  uploadS3(req.file.filename, req.file.path, (err, data) => {
    fs.unlink(req.file.path, err => {
      if (err) {
        console.error('Error deleting temporary file', err);
      } else {
        console.log('Temporary file deleted successfully');
      }
    });
    if (err) {
      console.error('Error uploading file to S3', err);
      res.status(500).send('Error uploading file to S3');
    } else {
      const album = new Album({
        name: req.body.name,
        artist: req.body.artist,
        imageUrl: `${AWS_CLOUDFRONT_HOST}${req.file.filename}`,
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
    }
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
