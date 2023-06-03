const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');
const passport = require('passport');
const LnurlAuth = require('passport-lnurl-auth');
const session = require('express-session');

const app = express();

const config = {
  host: 'localhost',
  port: 5000,
  url: null,
  data: 'data',
  uploads: 'data/uploads',
  assets: 'data/assets',
  agents: 'data/agents',
};

if (!config.url) {
  config.url = 'http://' + config.host + ':' + config.port;
}

const ensureFolderExists = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

ensureFolderExists(config.data);
ensureFolderExists(config.uploads);
ensureFolderExists(config.assets);
ensureFolderExists(config.agents);

app.use(session({
  secret: 'Satoshi',
  resave: true,
  saveUninitialized: true,
}));

// Serve the React frontend
app.use(express.static(path.join(__dirname, 'frontend/build')));

// Serve the assets
app.use('/data', express.static(path.join(__dirname, config.data)));

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
    cb(null, config.uploads);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

app.use(passport.initialize());
app.use(passport.session());

const map = {
  user: new Map(),
};

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  done(null, map.user.get(id) || null);
});

passport.use(new LnurlAuth.Strategy(function (linkingPublicKey, done) {
  let user = map.user.get(linkingPublicKey);
  if (!user) {
    user = { id: linkingPublicKey };
    map.user.set(linkingPublicKey, user);
  }
  done(null, user);
}));

app.use(passport.authenticate('lnurl-auth'));

app.get('/login',
  function (req, res, next) {
    if (req.user) {
      // Already authenticated.
      const userFolder = path.join(config.agents, req.user.id.toString());
      ensureFolderExists(userFolder);
      console.log(`user logged in ${userFolder}`);
      return res.redirect('/');
    }
    next();
  },
  new LnurlAuth.Middleware({
    callbackUrl: config.url + '/login',
    cancelUrl: config.url
  })
);

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      res.status(500).json({ message: 'Error logging out' });
    } else {
      res.json({ message: 'Logged out successfully' });
    }
  });
});

app.get('/check-auth', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ message: 'Authenticated' });
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});

const upload = multer({ storage });

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
}


const addAssetToUploads = async (userId, imageHash) => {
  const userFolder = path.join(config.agents, userId.toString());
  const agentJsonPath = path.join(userFolder, 'agent.json');

  let agentData = {};

  // Check if the agent.json file exists
  if (fs.existsSync(agentJsonPath)) {
    const agentJsonContent = await fs.promises.readFile(agentJsonPath, 'utf-8');
    agentData = JSON.parse(agentJsonContent);
  }

  // If the "collections" property doesn't exist, create it
  if (!agentData.collections) {
    agentData.collections = [];
  }

  // Find the "uploads" collection
  let uploadsCollection = agentData.collections.find((collection) => collection.name === 'uploads');

  // If the "uploads" collection doesn't exist, create it and add it to the collections list
  if (!uploadsCollection) {
    uploadsCollection = {
      name: 'uploads',
      assets: [],
    };
    agentData.collections.push(uploadsCollection);
  }

  // Add the image hash to the "uploads" collection
  uploadsCollection.assets.push(imageHash);

  // Write the updated agent data to the agent.json file
  await fs.promises.writeFile(agentJsonPath, JSON.stringify(agentData, null, 2));
};

app.post('/api/upload', ensureAuthenticated, upload.single('image'), async (req, res) => {
  if (req.file) {
    // Calculate the Git hash
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileHash = gitHash(fileBuffer);

    // Create the subfolder
    const hashFolder = path.join(config.assets, fileHash);
    if (!fs.existsSync(hashFolder)) {
      fs.mkdirSync(hashFolder);
    }

    // Move the file to the subfolder and rename it to "asset"
    const assetName = 'asset' + path.extname(req.file.originalname);
    const newPath = path.join(hashFolder, assetName);
    fs.renameSync(req.file.path, newPath);

    // Get image metadata using sharp
    const imageMetadata = await sharp(newPath).metadata();

    // Create the metadata object
    const metadata = {
      asset: {
        creator: req.user.id,
        uploadTime: new Date().toISOString(),
        fileName: assetName,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        hash: fileHash,
        type: 'image',
        path: `/${config.assets}/${fileHash}/${assetName}`
      },
      image: {
        width: imageMetadata.width,
        height: imageMetadata.height,
        depth: imageMetadata.depth,
        format: imageMetadata.format,
      }
    };

    // Write the metadata to meta.json
    const metadataPath = path.join(hashFolder, 'meta.json');
    await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    await addAssetToUploads(req.user.id, fileHash);

    res.json({ success: true, message: 'Image uploaded successfully' });
  } else {
    res.json({ success: false, message: 'Image upload failed' });
  }
});

app.get('/api/assets', async (req, res) => {
  try {
    const assetFolder = config.assets;
    const assetFolders = fs.readdirSync(assetFolder);
    const metaDataPromises = assetFolders.map((folder) => {
      const metaFilePath = path.join(assetFolder, folder, 'meta.json');
      return fs.promises.readFile(metaFilePath, 'utf-8');
    });

    const metaDataContents = await Promise.all(metaDataPromises);
    const metaDataArray = metaDataContents.map((content) => JSON.parse(content));
    res.json(metaDataArray);
  } catch (error) {
    console.error('Error reading meta.json files:', error);
    res.status(500).json({ message: 'Error fetching asset metadata' });
  }
});

app.use((req, res, next) => {
  console.warn(`Warning: Unhandled endpoint - ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: 'Endpoint not found' });
});

const PORT = process.env.PORT || config.port;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
