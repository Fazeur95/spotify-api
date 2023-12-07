const fs = require('fs');
const path = require('path');
const Track = require('../models/track.model.js');
const { uploadS3 } = require('../../utils/s3.js');

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
const Album = require('../models/album.model.js');

ffmpeg.setFfmpegPath(ffmpegPath);

const { AWS_CLOUDFRONT_HOST } = process.env;

// Utilisez la fonction dans votre contrôleur
exports.uploadTrack = (req, res) => {
  // Assurez-vous qu'un fichier a été téléchargé
  if (!req.file) {
    return res.status(400).send('No files uploaded');
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

exports.updateTrack = (req, res) => {
  if (!req.body) {
    return res.status(400).send({
      message: 'Data to update can not be empty!',
    });
  }

  const id = req.params.id;

  Track.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
    .then(data => {
      if (!data) {
        res.status(404).send({
          message: `Cannot update track with id=${id}. Maybe track was not found!`,
        });
      } else res.send({ message: 'Track was updated successfully.' });
    })
    .catch(err => {
      res.status(500).send({
        message: 'Error updating track with id=' + id,
      });
    });
};

exports.deleteTrack = (req, res) => {
  const id = req.params.id;

  Track.findByIdAndRemove(id, { useFindAndModify: false })
    .then(data => {
      if (!data) {
        res.status(404).send({
          message: `Cannot delete track with id=${id}. Maybe track was not found!`,
        });
      } else {
        // Delete the converted file
        fs.unlink(data.url, err => {
          if (err) {
            console.error('Error deleting file', err);
          } else {
            console.log('File deleted successfully');
          }
        });

        res.send({
          message: 'Track was deleted successfully!',
        });
      }
    })
    .catch(err => {
      res.status(500).send({
        message: 'Could not delete track with id=' + id,
      });
    });
};
