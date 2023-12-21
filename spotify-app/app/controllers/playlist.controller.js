const { uploadS3, deleteS3 } = require('../../utils/s3');
const Playlist = require('../models/playlist.model');
const fs = require('fs');

const { AWS_CLOUDFRONT_HOST } = process.env;

exports.getPlaylists = (req, res) => {
  let query = Playlist.find({});

  if (req.query.populate) {
    query = query.populate('tracks');
  }

  query.exec((err, playlists) => {
    if (err) {
      return res.send({
        message: 'Error getting playlists',
        error: err,
      });
    }

    return res.json(playlists);
  });
};

exports.getPlaylist = (req, res) => {
  Playlist.findById(req.params.id)
    .populate({
      path: 'tracks',
      populate: {
        path: 'album',
        populate: {
          path: 'artist',
          model: 'Artist',
        },
      },
    })
    .exec((err, playlist) => {
      if (err) {
        res.status(500);
        return res.send({
          message: 'Error getting playlist',
          error: err,
        });
      }

      return res.json(playlist);
    });
};

exports.createPlaylist = (req, res) => {
  console.log(req.file);

  if (!req.body.name) {
    return res.status(400).send({
      message: 'Playlist name can not be empty',
    });
  }

  const playlist = new Playlist({
    name: req.body.name,
    imageUrl: `https://d2n91ghxz89e1f.cloudfront.net/image-1702656156574`,
  });

  playlist.save((err, playlist) => {
    if (err) {
      return res.send({
        message: 'Error saving playlist',
        error: err,
      });
    }

    return res.json(playlist);
  });
};

exports.updatePlaylist = (req, res) => {
  const albumId = req.params.id;
  const updateData = req.body;

  Playlist.findByIdAndUpdate(
    albumId,
    updateData,
    { new: true },
    (err, playlist) => {
      if (err) {
        res.status(500).send(err);
        return;
      }
      if (!playlist) {
        res
          .status(404)
          .send({ message: "Playlist non trouvé avec l'ID fourni" });
        return;
      }

      res.json(playlist);
    }
  );
};

exports.deletePlaylist = (req, res) => {
  const albumId = req.params.id;

  Playlist.findByIdAndRemove(albumId)
    .then(playlist => {
      if (!playlist) {
        res
          .status(404)
          .send({ message: "Playlist non trouvé avec l'ID fourni" });
        return;
      }

      deleteS3(playlist.imageUrl, (err, data) => {
        if (err) {
          console.error('Error deleting file from S3', err);
        } else {
          console.log('File deleted successfully from S3');
        }
      });

      res.send({ message: 'Playlist supprimé avec succès' });
    })
    .catch(err => {
      res.status(500).send({
        message: 'Impossible de supprimer l playlist avec l ID=' + albumId,
      });
    });
};

exports.addTrackToPlaylist = (req, res) => {
  const playlistId = req.params.id;
  const trackId = req.body.trackId;

  Playlist.findByIdAndUpdate(
    playlistId,
    { $push: { tracks: trackId } },
    { new: true }
  )
    .populate({
      path: 'tracks',
      populate: {
        path: 'album',
        populate: {
          path: 'artist',
          model: 'Artist',
        },
      },
    })
    .exec((err, playlist) => {
      if (err) {
        res.status(500);
        return res.send({
          message: 'Error getting playlist',
          error: err,
        });
      }

      return res.json(playlist);
    });
};
