const AWS = require('aws-sdk');
const fs = require('fs');

const {
  AWS_ACCESS_KEY,
  AWS_SECRET_ACCESS_KEY,
  AWS_BUCKET_NAME,
  AWS_REGION,
  AWS_CLOUDFRONT_HOST,
} = process.env;

// Créez un nouvel objet S3
const s3 = new AWS.S3();

s3.config.update({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
});

// Fonction pour télécharger un flux dans S3
exports.uploadS3 = (fileName, filePath, callback) => {
  // Définissez les paramètres pour l'upload S3
  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error('Error reading file', err);
      callback(err);
    } else {
      // Définissez les paramètres pour l'upload S3
      const params = {
        Bucket: AWS_BUCKET_NAME,
        Key: fileName,
        Body: data,
      };

      // Téléchargez le fichier dans le bucket S3
      s3.upload(params, (err, data) => {
        if (err) {
          console.error('Error uploading file to S3', err);
          callback(err);
        } else {
          console.log('File uploaded to S3 successfully');
          callback(null, data.Location);
        }
      });
    }
  });
};

// Fonction pour supprimer un fichier de S3
exports.deleteS3 = (fileName, callback) => {
  // Définissez les paramètres pour l'upload S3
  const params = {
    Bucket: AWS_BUCKET_NAME,
    Key: fileName,
  };

  // Supprimez le fichier du bucket S3
  s3.deleteObject(params, (err, data) => {
    if (err) {
      callback(err);
    } else {
      callback(null, data);
    }
  });
};
