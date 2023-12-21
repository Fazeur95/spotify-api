const fs = require('fs');
const path = require('path');
const Track = require('../models/track.model.js');
const { uploadS3, deleteS3 } = require('../../utils/s3.js');

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
const Album = require('../models/album.model.js');

ffmpeg.setFfmpegPath(ffmpegPath);

const doesTrackExistInAlbum = async (trackName, albumId) => {
  const track = await Track.findOne({
    name: { $regex: new RegExp(`^${trackName}$`, 'i') },
    album: albumId,
  });
  return !!track;
};

const { AWS_CLOUDFRONT_HOST } = process.env;

// Utilisez la fonction dans votre contrôleur
exports.uploadTrack = async (req, res) => {
  // Assurez-vous qu'un fichier a été téléchargé
  if (!req.file) {
    return res.status(400).send('No files uploaded');
  }

  const trackName = req.body.name;
  const albumId = req.body.album;
  const order = req.body.order;

  if (await doesTrackExistInAlbum(trackName, albumId)) {
    return res.status(400).send({
      error: 'TrackAlreadyExists',
      message: `Track with name ${trackName} already exists in this album`,
    });
  }

  //Crer un nom de fichier unique
  const fileName = Math.floor(Math.random() * Date.now()).toString(36);

  const outputFilePath = path.join('./tmp/', `${fileName}.ogg`);

  // Convertissez le fichier .mp3 téléchargé en .ogg
  ffmpeg(req.file.path)
    .output(outputFilePath)
    .format('ogg')
    .on('error', err => {
      console.error('Error converting audio file', err);
      res.status(500).send('Error converting audio file');
    })
    .on('end', () => {
      console.log('Audio file converted successfully');

      // Téléchargez le fichier converti dans S3
      uploadS3(`${fileName}.ogg`, outputFilePath, (err, url) => {
        fs.unlink(outputFilePath, err => {
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
          // Créez un nouvel objet track
          const track = new Track({
            name: req.body.name,
            album: req.body.album,
            order: req.body.order,
            url: `${AWS_CLOUDFRONT_HOST}${fileName}.ogg`, // Utilisez l'URL du fichier S3
          });

          // Sauvegardez la piste dans la base de données
          track
            .save(track)
            .then(data => {
              if (req.body.album) {
                Album.findByIdAndUpdate(
                  req.body.album,
                  { $push: { tracks: data._id } },
                  { useFindAndModify: false }
                )
                  .then(data => {
                    console.log(data);
                  })
                  .catch(err => {
                    console.log(err);
                  });
              }

              res.send({
                message: 'Audio file converted and stored successfully',
                data: data,
              });
            })
            .catch(err => {
              console.error('Error saving track to database', err);
              res.status(500).send('Error saving track to database');
            });
        }
      });
    })
    .run();
};

exports.getTracks = (req, res) => {
  Track.find()
    .populate('album')
    .populate({
      path: 'album',
      populate: {
        path: 'artist',
        model: 'Artist',
      },
    })
    .then(tracks => {
      res.send(tracks);
    })
    .catch(err => {
      res.status(500).send({
        message: err.message || 'Some error occurred while retrieving tracks.',
      });
    });
};

exports.getTrack = (req, res) => {
  const id = req.params.id;

  Track.findById(id)
    .then(data => {
      if (!data) {
        res.status(404).send({ message: 'Not found track with id ' + id });
      } else {
        res.send(data);
      }
    })
    .catch(err => {
      res.status(500).send({ message: 'Error retrieving track with id=' + id });
    });
};

exports.updateTrack = async (req, res) => {
  if (!req.body) {
    return res.status(400).send({
      message: 'Data to update can not be empty!',
    });
  }

  const id = req.params.id;

  try {
    let data = await Track.findByIdAndUpdate(id, req.body, {
      useFindAndModify: false,
      new: true,
    });

    if (!data) {
      return res.status(404).send({
        message: `Cannot update track with id=${id}. Maybe track was not found!`,
      });
    }

    if (req.file) {
      try {
        await deleteS3(data.url);
        console.log('File deleted successfully');

        const fileName = Math.floor(Math.random() * Date.now()).toString(36);
        const outputFilePath = path.join('./tmp/', `${fileName}.ogg`);

        await new Promise((resolve, reject) => {
          ffmpeg(req.file.path)
            .output(outputFilePath)
            .format('ogg')
            .on('error', reject)
            .on('end', resolve)
            .run();
        });

        console.log('Audio file converted successfully');

        uploadS3(`${fileName}.ogg`, outputFilePath, (err, url) => {
          if (err) {
            console.error('Error uploading file to S3', err);
            res.status(500).send('Error uploading file to S3');
          }
        });

        try {
          await fs.promises.unlink(outputFilePath);
          console.log('Temporary file deleted successfully');
        } catch (err) {
          console.error('Error deleting temporary file', err);
        }

        data = await Track.findByIdAndUpdate(
          id,
          { url: `${AWS_CLOUDFRONT_HOST}${fileName}.ogg` },
          { useFindAndModify: false, new: true }
        );

        console.log(data);
      } catch (err) {
        console.error('Error processing file', err);
        return res.status(500).send('Error processing file');
      }
    }

    res.send({ message: 'Track was updated successfully.' });
  } catch (err) {
    res.status(500).send({
      message: 'Error updating track with id=' + id,
    });
  }
};

exports.deleteTrack = async (req, res) => {
  const id = req.params.id;

  try {
    const track = await Track.findById(id);
    if (!track) {
      return res.status(404).send({
        message: `Cannot delete track with id=${id}. Maybe track was not found!`,
      });
    }

    deleteS3(track.url, (err, data) => {
      if (err) {
        console.error('Error deleting file from S3', err);
      } else {
        console.log('File deleted successfully from S3');
      }
    });

    await Playlist.updateMany({}, { $pull: { tracks: id } });
    console.log('Track deleted from all playlists successfully');

    await Album.updateMany({}, { $pull: { tracks: id } });
    console.log('Track deleted from all albums successfully');

    await Track.findByIdAndRemove(id, { useFindAndModify: false });
    console.log('Track deleted from database successfully');

    res.send({
      message: 'Track was deleted successfully!',
    });
  } catch (err) {
    console.error('Error deleting track', err);
    res.status(500).send({
      message: 'Could not delete track with id=' + id,
    });
  }
};

exports.updateTracksOrder = async (req, res) => {
  const tracks = req.body.tracks;
  const albumId = req.body.albumId;

  if (!tracks || !tracks.length) {
    return res.status(400).send({
      message: 'No tracks provided',
    });
  }

  try {
    const bulkOps = tracks.map((track, index) => ({
      updateOne: {
        filter: { _id: track._id },
        update: { order: index + 1 },
      },
    }));

    await Track.bulkWrite(bulkOps);

    const album = await Album.findById(albumId).populate('tracks');
    album?.tracks?.sort((a, b) => a.order - b.order);

    await album.save();

    res.send({
      message: 'Tracks order updated successfully',
    });
  } catch (err) {
    console.error('Error updating tracks order', err);
    res.status(500).send({
      message: 'Could not update tracks order',
    });
  }
};
