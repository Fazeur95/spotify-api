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
  const playlistId = req.params.id;
  const updateData = req.body;

  Playlist.findByIdAndUpdate(
    playlistId,
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

      if (req.file) {
        if (
          playlist.imageUrl !==
          'https://d2n91ghxz89e1f.cloudfront.net/image-1702656156574'
        ) {
          deleteS3(playlist.imageUrl, (err, data) => {
            if (err) {
              console.error('Error deleting file from S3', err);
            } else {
              console.log('File deleted successfully from S3');
            }
          });
        }

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
            playlist.imageUrl = `${AWS_CLOUDFRONT_HOST}${req.file.filename}`;
            playlist.save((err, playlist) => {
              if (err) {
                return res.send({
                  message: 'Error saving playlist',
                  error: err,
                });
              }
            });
          }
        });
      }

      res.json(playlist);
    }
  );
};

exports.deletePlaylist = (req, res) => {
  const playlistId = req.params.id;

  Playlist.findByIdAndRemove(playlistId)
    .then(playlist => {
      if (!playlist) {
        res
          .status(404)
          .send({ message: "Playlist non trouvé avec l'ID fourni" });
        return;
      }

      if (
        !playlist.imageUrl ===
        'https://d2n91ghxz89e1f.cloudfront.net/image-1702656156574'
      ) {
        deleteS3(playlist.imageUrl, (err, data) => {
          if (err) {
            console.error('Error deleting file from S3', err);
          } else {
            console.log('File deleted successfully from S3');
          }
        });
      }

      res.send({ message: 'Playlist supprimé avec succès' });
    })
    .catch(err => {
      res.status(500).send({
        message: 'Impossible de supprimer l playlist avec l ID=' + playlistId,
      });
    });
};

exports.addTrackToPlaylist = async (req, res) => {
  const playlistId = req.params.id;
  const trackId = req.body.trackId;

  try {
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res
        .status(404)
        .send({ message: "Playlist non trouvée avec l'ID fourni" });
    }

    if (playlist.tracks.includes(trackId)) {
      return res
        .status(400)
        .send({ message: 'Le track est déjà dans la playlist' });
    }

    playlist.tracks.push(trackId);
    const updatedPlaylist = await playlist.save();

    const populatedPlaylist = await Playlist.populate(updatedPlaylist, {
      path: 'tracks',
      populate: {
        path: 'album',
        populate: {
          path: 'artist',
          model: 'Artist',
        },
      },
    });

    return res.json(populatedPlaylist);
  } catch (err) {
    return res.status(500).send({
      message: 'Erreur lors de la mise à jour de la playlist',
      error: err,
    });
  }
};

exports.deleteTrackFromPlaylist = async (req, res) => {
  const playlistId = req.params.id;
  const trackId = req.params.trackId;

  try {
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res
        .status(404)
        .send({ message: "Playlist non trouvée avec l'ID fourni" });
    }

    if (!playlist.tracks.includes(trackId)) {
      return res
        .status(400)
        .send({ message: "Le track n'est pas dans la playlist" });
    }

    // Remove track from playlist
    const trackIndex = playlist.tracks.indexOf(trackId);
    playlist.tracks.splice(trackIndex, 1);
    const updatedPlaylist = await playlist.save();

    const populatedPlaylist = await Playlist.populate(updatedPlaylist, {
      path: 'tracks',
      populate: {
        path: 'album',
        populate: {
          path: 'artist',
          model: 'Artist',
        },
      },
    });

    return res.json(populatedPlaylist);
  } catch (err) {
    return res.status(500).send({
      message: 'Erreur lors de la suppression du track de la playlist',
      error: err,
    });
  }
};
