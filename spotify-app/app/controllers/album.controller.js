const { uploadS3, deleteS3 } = require('../../utils/s3');
const Album = require('../models/album.model');
const fs = require('fs');
const Artist = require('../models/artist.model');
const Track = require('../models/track.model');

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
    .populate({
      path: 'artist',
      model: 'Artist',
    })
    .populate({
      path: 'tracks',
      model: 'Track',
      options: {
        sort: { order: 1 },
      },
    })
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

        if (!req.body.artist) {
          return res.json(album);
        }

        Artist.findById(req.body.artist).exec((err, artist) => {
          if (err) {
            return res.send({
              message: 'Error getting artist',
              error: err,
            });
          }

          artist?.albums.push(album._id);
          artist.save((err, artist) => {
            if (err) {
              return res.send({
                message: 'Error saving artist',
                error: err,
              });
            }
          });
        });

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

    if (req.file) {
      deleteS3(album.imageUrl, (err, data) => {
        if (err) {
          console.error('Error deleting file from S3', err);
        } else {
          console.log('File deleted successfully from S3');
        }
      });

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
          album.imageUrl = `${AWS_CLOUDFRONT_HOST}${req.file.filename}`;
          album.save((err, album) => {
            if (err) {
              return res.send({
                message: 'Error saving album',
                error: err,
              });
            }
          });
        }
      });
    }

    album.save((err, album) => {
      if (err) {
        res.status(500).send({ message: 'Error updating album' });
        return;
      }

      return res.send(album);
    });
  });
};

exports.deleteAlbum = (req, res) => {
  const albumId = req.params.id;

  Album.findByIdAndRemove(albumId)
    .then(album => {
      if (!album) {
        res.status(404).send({ message: "Album non trouvé avec l'ID fourni" });
        return;
      }

      // Delete album from artist
      Artist.findByIdAndUpdate(
        album.artist,
        { $pull: { albums: album._id } },
        { useFindAndModify: false }
      ).catch(err => {
        console.log(err);
      });

      // Delete album tracks
      album.tracks.forEach(trackId => {
        Track.findByIdAndRemove(trackId).catch(err => {
          console.log(err);
        });
        // Delete track from playlists
        Playlist.updateMany(
          {},
          { $pull: { tracks: trackId } },
          { useFindAndModify: false }
        ).catch(err => {
          console.log(err);
        });

        //delete track from S3
        deleteS3(track.url, (err, data) => {
          if (err) {
            console.error('Error deleting file from S3', err);
          } else {
            console.log('File deleted successfully from S3');
          }
        });
      });

      deleteS3(album.imageUrl, (err, data) => {
        if (err) {
          console.error('Error deleting file from S3', err);
        } else {
          console.log('File deleted successfully from S3');
        }
      });

      res.send({ message: 'Album supprimé avec succès' });
    })
    .catch(err => {
      res.status(500).send({
        message: 'Impossible de supprimer l album avec l ID=' + albumId,
      });
    });
};
