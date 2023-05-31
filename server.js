const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');

const app = express();

// Serve the React frontend
app.use(express.static(path.join(__dirname, 'frontend/build')));

// Serve the images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/data', (req, res) => {
    res.json({ message: 'Welcome to the ArtX!' });
});

function gitHash(fileBuffer) {
  const hasher = crypto.createHash('sha1');
  hasher.update('blob ' + fileBuffer.length + '\0');
  hasher.update(fileBuffer);
  return hasher.digest('hex');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (req.file) {
    // Calculate the Git hash and rename the file
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileHash = gitHash(fileBuffer);
    const newFilename = fileHash + path.extname(req.file.originalname);
    const newPath = path.join(req.file.destination, newFilename);

    fs.renameSync(req.file.path, newPath);

    res.json({ success: true, message: 'Image uploaded successfully' });
  } else {
    res.json({ success: false, message: 'Image upload failed' });
  }
});

app.get('/api/images', (req, res) => {
  const uploadsDir = path.join(__dirname, 'uploads');
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      res.status(500).json({ message: 'Error reading uploaded images' });
    } else {
      res.json(files);
    }
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});