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

app.post('/api/upload', upload.single('image'), async (req, res) => {
  if (req.file) {
    // Calculate the Git hash
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileHash = gitHash(fileBuffer);

    // Create the subfolder
    const hashFolder = path.join('uploads', fileHash);
    if (!fs.existsSync(hashFolder)) {
      fs.mkdirSync(hashFolder);
    }

    // Move the file to the subfolder and rename it to "asset"
    const assetName = 'asset' + path.extname(req.file.originalname);
    const newPath = path.join(hashFolder, assetName);
    fs.renameSync(req.file.path, newPath);

    res.json({ success: true, message: 'Image uploaded successfully' });
  } else {
    res.json({ success: false, message: 'Image upload failed' });
  }
});

const getImagesRecursively = async (dir) => {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map(async (dirent) => {
      const res = path.join(dir, dirent.name);
      return dirent.isDirectory() ? getImagesRecursively(res) : res;
    })
  );
  return Array.prototype.concat(...files);
};

app.get('/api/images', async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    const filePaths = await getImagesRecursively(uploadsDir);
    const relativePaths = filePaths.map((filePath) => path.relative(uploadsDir, filePath));
    res.json(relativePaths);
  } catch (error) {
    console.error('Error reading uploaded images:', error);
    res.status(500).json({ message: 'Error reading uploaded images' });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});