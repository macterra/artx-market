const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');
const passport = require('passport');
const LnurlAuth = require('passport-lnurl-auth');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');

const app = express();

const config = {
  host: process.env.ARTX_HOST || 'localhost',
  port: process.env.ARTX_PORT || 5000,
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

app.use(express.json());

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
      const agentData = getAgent(req.user.id, true);
      return res.redirect('/profile');
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

app.get('/check-auth/:id?', (req, res) => {
  if (req.isAuthenticated()) {
    const userId = req.params.id;

    if (userId) {
      // Check if the logged-in user's ID is the same as the provided ID
      res.json({ message: 'Authenticated', sameId: req.user.id === userId });
    } else {
      res.json({ message: 'Authenticated' });
    }
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

const getAgent = async (userId, doCreate) => {
  const userFolder = path.join(config.agents, userId.toString());
  const agentJsonPath = path.join(userFolder, 'agent.json');

  let agentData = {};

  // Check if the agent.json file exists
  if (fs.existsSync(agentJsonPath)) {
    const agentJsonContent = await fs.promises.readFile(agentJsonPath, 'utf-8');
    agentData = JSON.parse(agentJsonContent);
  } else if (doCreate) {
    agentData = {
      id: userId,
      name: 'anon',
      tagline: '',
      description: '',
      defaultCollection: 0,
      uploads: [],
      collections: [{ name: 'uploads', description: '' }],
    };

    ensureFolderExists(userFolder);
    await fs.promises.writeFile(agentJsonPath, JSON.stringify(agentData, null, 2));
  }

  return agentData;
};

const saveAgent = async (agentData) => {
  const userFolder = path.join(config.agents, agentData.id);
  const agentJsonPath = path.join(userFolder, 'agent.json');

  await fs.promises.writeFile(agentJsonPath, JSON.stringify(agentData, null, 2));
};

const getAssets = async (userId) => {
  const userFolder = path.join(config.agents, userId.toString());
  const jsonPath = path.join(userFolder, 'assets.json');
  let assetData = [];

  if (fs.existsSync(jsonPath)) {
    const jsonContent = await fs.promises.readFile(jsonPath, 'utf-8');
    assetData = JSON.parse(jsonContent);
  }

  return assetData;
}

const addAssetToUploads = async (userId, asset) => {
  let assetData = await getAssets(userId);

  assetData.push(asset);

  const jsonPath = path.join(config.agents, userId, 'assets.json');
  await fs.promises.writeFile(jsonPath, JSON.stringify(assetData, null, 2));
};

app.post('/api/upload', ensureAuthenticated, upload.single('image'), async (req, res) => {
  if (req.file) {
    const xid = uuidv4();

    // Calculate the Git hash
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileHash = gitHash(fileBuffer);

    // Create the subfolder
    const assetFolder = path.join(config.assets, xid);
    if (!fs.existsSync(assetFolder)) {
      fs.mkdirSync(assetFolder);
    }

    // Move the file to the subfolder and rename it to "asset"
    const assetName = '_' + path.extname(req.file.originalname);
    const newPath = path.join(assetFolder, assetName);
    fs.renameSync(req.file.path, newPath);

    // Get image metadata using sharp
    const imageMetadata = await sharp(newPath).metadata();

    // Create the metadata object
    const metadata = {
      asset: {
        xid: xid,
        creator: req.user.id,
        uploadTime: new Date().toISOString(),
        fileName: assetName,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        hash: fileHash,
        type: 'image',
        path: `/${config.assets}/${xid}/${assetName}`
      },
      image: {
        width: imageMetadata.width,
        height: imageMetadata.height,
        depth: imageMetadata.depth,
        format: imageMetadata.format,
      }
    };

    // Write the metadata to meta.json
    const metadataPath = path.join(assetFolder, 'meta.json');
    await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    await addAssetToUploads(req.user.id, xid);

    res.json({ success: true, message: 'Image uploaded successfully' });
  } else {
    res.json({ success: false, message: 'Image upload failed' });
  }
});

app.get('/api/asset/:xid', async (req, res) => {
  try {
    const { xid } = req.params;
    const assetPath = path.join(config.assets, xid, 'meta.json');

    if (fs.existsSync(assetPath)) {
      const jsonContent = await fs.promises.readFile(assetPath, 'utf-8');
      const assetData = JSON.parse(jsonContent);
      res.json(assetData);
    } else {
      res.status(404).json({ message: 'Asset not found' });
    }
  } catch (error) {
    console.error('Error processing asset request:', error);
    res.status(500).json({ error: 'An error occurred while processing the request.' });
  }
});

app.post('/api/asset', ensureAuthenticated, async (req, res) => {
  const metadata = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'User not logged in' });
  }

  try {
    const assetFolder = path.join(config.assets, metadata.asset?.xid);
    const assetJsonPath = path.join(assetFolder, 'meta.json');

    let assetData = {};

    // Check if the agent.json file exists
    if (fs.existsSync(assetJsonPath)) {
      const assetJsonContent = await fs.promises.readFile(assetJsonPath, 'utf-8');
      assetData = JSON.parse(assetJsonContent);
    }

    if (userId == assetData.asset.creator) {
      assetData.asset.title = metadata.asset?.title;
      assetData.asset.description = metadata.asset?.description;
      assetData.asset.tags = metadata.asset?.tags;
      assetData.asset.collection = metadata.asset?.collection;

      // Write the updated agent data to the agent.json file
      await fs.promises.writeFile(assetJsonPath, JSON.stringify(assetData, null, 2));

      res.json({ message: 'Metadata updated successfully' });
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  } catch (error) {
    console.error('Error updating metadata:', error);
    res.status(500).json({ message: 'Error updating metadata' });
  }
});

app.get('/api/profile/:id?', async (req, res) => {
  const userId = req.params.id || req.user?.id;

  if (!userId) {
    return res.status(404).json({ message: 'Profile not found' });
  }

  try {
    const agentData = await getAgent(userId, false);

    if (agentData) {
      res.json(agentData);
    } else {
      res.status(404).json({ message: 'Profile not found' });
    }
  } catch (error) {
    console.error('Error fetching profile data:', error);
    res.status(500).json({ message: 'Error fetching profile data' });
  }
});

const readAssetMetadata = async (xid) => {
  const metadataPath = path.join(config.assets, xid, 'meta.json');
  const metadataContent = await fs.promises.readFile(metadataPath, 'utf-8');
  const metadata = JSON.parse(metadataContent);
  return metadata;
};

app.get('/api/collection/:userId/:collectionId', async (req, res) => {
  try {
    const { userId, collectionId } = req.params;
    const collectionIndex = parseInt(collectionId, 10);
    const assets = await getAssets(userId);
    const assetsInCollection = [];

    for (const assetId of assets) {
      const assetMetadata = await readAssetMetadata(assetId);
      const assetCollection = assetMetadata.asset.collection || 0;

      if (collectionIndex === assetCollection) {
        assetsInCollection.push(assetMetadata);
      }
    }

    res.json(assetsInCollection);
  } catch (error) {
    console.error('Error processing collection request:', error);
    res.status(500).json({ error: 'An error occurred while processing the request.' });
  }
});

app.post('/api/profile', ensureAuthenticated, async (req, res) => {
  try {
    const agentData = req.body;
    const userId = req.user.id;

    if (userId != agentData.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await saveAgent(agentData);
    res.json({ message: 'Metadata updated successfully' });
  } catch (error) {
    console.error('Error updating metadata:', error);
    res.status(500).json({ message: 'Error updating metadata' });
  }
});

app.post('/api/mint', ensureAuthenticated, async (req, res) => {
  try {
    const { xid, editions } = req.body;
    const userId = req.user.id;

    console.log(`mint ${xid} with ${editions} editions`)

    res.json({ message: 'Success' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error' });
  }
});

app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
  } else {
    console.warn(`Warning: Unhandled API endpoint - ${req.method} ${req.originalUrl}`);
    res.status(404).json({ message: 'Endpoint not found' });
  }
});

app.listen(config.port, () => {
  console.log(`ArtX server running on ${config.host}:${config.port}`);
});
