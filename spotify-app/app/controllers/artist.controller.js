const Artist = require('../models/artist.model');
const Album = require('../models/album.model');
const Track = require('../models/track.model');
const fs = require('fs');
const path = require('path');
const { uploadS3, deleteS3 } = require('../../utils/s3');

const { AWS_CLOUDFRONT_HOST } = process.env;

exports.getArtists = (req, res) => {
  let query = Artist.find({});

  if (req.query.populate) {
    query = query.populate('albums');
  }

  query.exec((err, artists) => {
    if (err) {
      return res.send({
        message: 'Error getting artists',
        error: err,
      });
    }

    return res.json(artists);
  });
};

exports.getArtist = (req, res) => {
  Artist.findById(req.params.id)
    .populate('albums')
    .exec((err, artist) => {
      if (err) {
        return res.send({
          message: 'Error getting artist',
          error: err,
        });
      }

      if (!artist) {
        return res.status(404).send({ message: 'Artist not found' });
      }

      return res.json(artist);
    });
};

exports.createArtist = (req, res) => {
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
      const artist = new Artist({
        name: req.body.name,
        albums: req.body.albums || [],
        imageUrl: `${AWS_CLOUDFRONT_HOST}${req.file.filename}`,
      });

      artist.save((err, artist) => {
        if (err) {
          return res.send({
            message: 'Error saving artist',
            error: err,
          });
        }

        return res.json(artist);
      });
    }
  });
};

exports.updateArtist = (req, res) => {
  const artistId = req.params.id;
  const updateData = req.body;

  Artist.findById(artistId, (err, artist) => {
    if (err) {
      res.status(500).send(err);
      return;
    }
    if (!artist) {
      res.status(404).send({ message: 'Artiste non trouvé' });
      return;
    }

    if (req.file) {
      deleteS3(artist.imageUrl, (err, data) => {
        if (err) {
          console.error('Error deleting file from S3', err);
          return;
        }
        console.log('File deleted from S3 successfully');
      });
    }

    if (req.file) {
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
          updateData.imageUrl = `${AWS_CLOUDFRONT_HOST}${req.file.filename}`;
        }
      });
    }

    // Mettre à jour l'artist avec les nouvelles données
    Object.assign(artist, updateData);

    artist.save((saveErr, updatedArtist) => {
      if (saveErr) {
        res.status(500).send(saveErr);
        return;
      }
      res.json(updatedArtist);
    });
  });
};

exports.deleteArtist = async (req, res) => {
  try {
    const artistId = req.params.id;

    // Trouver l'artist et ses albums
    const artist = await Artist.findById(artistId).populate('albums');
    if (!artist) {
      return res.status(404).send({ message: 'Artist non trouvé' });
    }

    const fileName = artist.imageUrl.split('/').pop();

    deleteS3(fileName, (err, data) => {
      if (err) {
        console.error('Error deleting file from S3', err);
        return;
      }
      console.log('File deleted from S3 successfully');
    });

    // Supprimer les titres des albums de l'artist
    for (const album of artist.albums) {
      await Track.deleteMany({ _id: { $in: album.track } });
    }

    // Supprimer les albums de l'artist
    await Album.deleteMany({ _id: { $in: artist.albums } });

    // Supprimer l'artist
    await artist.remove();

    res.send({ message: 'Artiste et données associées supprimés avec succès' });
  } catch (err) {
    res.status(500).send(err);
  }
};
