const fs = require('fs');
const path = require('path');
const Track = require('../models/track.model.js');

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

exports.uploadTrack = (req, res) => {
  // Ensure a file was uploaded
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }

  // Define the output path for the converted file
  const outputFilePath = path.join('./tmp/', `${req.file.filename}.ogg`);

  // Convert the uploaded .mp3 file to .wav
  ffmpeg(req.file.path)
    .output(outputFilePath)
    .format('ogg')
    .on('error', err => {
      console.error('Error converting audio file', err);
      res.status(500).send('Error converting audio file');
    })
    .on('end', () => {
      console.log('Audio file converted successfully');

      // Create a new track object
      const track = new Track({
        name: req.body.name,
        artist: req.body.artist,
        album: req.body.album,
        url: outputFilePath,
      });

      // Save track in the database
      track
        .save(track)
        .then(data => {
          res.send({
            message: 'Audio file converted and stored successfully',
            data: data,
          });
        })
        .catch(err => {
          console.error('Error saving track to database', err);
          res.status(500).send('Error saving track to database');
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

  Track.findByIdAndRemove(id)
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
