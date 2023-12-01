const Artist = require('../models/artist.model');
const Album = require('../models/album.model');
const Track = require('../models/track.model');
const fs = require('fs');
const path = require('path');

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

      return res.json(artist);
    });
};

exports.createArtist = (req, res) => {
  const artist = new Artist({
    name: req.body.name,
    albums: req.body.albums || [],
    imageUrl: req.file.filename ? '/tmp/image/' + req.file.filename : '',
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

    // Si une nouvelle image est téléchargée et que l'artist a déjà une image, supprimer l'ancienne image
    if (req.file && artist.imageUrl) {
      const oldImagePath = path.join(artist.imageUrl);
      fs.unlink(oldImagePath, unlinkErr => {
        if (unlinkErr) {
          console.error(unlinkErr);
          return;
        }
        // L'ancienne image a été supprimée
      });
    }

    // Si une image est téléchargée, ajouter l'URL de l'image aux données de mise à jour
    if (req.file) {
      updateData.imageUrl = '/tmp/image/' + req.file.filename;
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

    //Supromer l'image de l'artist
    try {
      artist.imageUrl &&
        fs.unlinkSync(path.join(__dirname, '..', '..', artist.imageUrl));
    } catch (err) {
      console.error(err);
    }

    // Supprimer les images des albums de l'artist
    artist.albums.forEach(album => {
      if (album.imageUrl) {
        try {
          const imagePath = path.join(__dirname, album.imageUrl);
          fs.unlinkSync(imagePath);
        } catch (err) {
          console.error(err);
        }
      }
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
