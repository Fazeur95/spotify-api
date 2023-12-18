require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

app.use(express.static('tmp'));

const db = require('./app/models');

console.log(db.url);

db.mongoose
  .connect(db.url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected to the database!');
  })
  .catch(err => {
    console.log('Cannot connect to the database!', err);
    process.exit();
  });

// simple route
app.get('/', (req, res) => {
  res.json({ message: "Welcome to Marvin's application." });
});

//create folder tmp if not exist
const fs = require('fs');
const dir = './tmp/image';
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

require('./app/routes/turorial.routes')(app);
require('./app/routes/track.routes')(app);
require('./app/routes/album.routes')(app);
require('./app/routes/artist.routes')(app);
require('./app/routes/playlist.routes')(app);

// set port, listen for requests
const PORT = process.env.NODE_DOCKER_PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
