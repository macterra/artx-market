const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const passport = require('passport');
const LnurlAuth = require('passport-lnurl-auth');
const session = require('express-session');
const morgan = require('morgan');
const {
  getAgent,
  saveAgent,
  getAgentAndCollections,
  getCollection,
  getAsset,
  saveAsset,
  createAssets,
  createToken,
  createCollection,
  collectionRemoveAsset,
  collectionAddAsset,
} = require('./xidb');

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

app.use(morgan('dev'));
app.use(express.json());

// Serve the React frontend
app.use(express.static(path.join(__dirname, 'frontend/build')));

// Serve the assets
app.use('/data', express.static(path.join(__dirname, config.data)));

app.get('/api/data', (req, res) => {
  res.json({ message: 'Welcome to the ArtX!' });
});

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
    res.json({ message: 'Unauthorized' });
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

app.post('/api/upload', ensureAuthenticated, upload.array('images', 100), async (req, res) => {
  try {
    const { collectionId } = req.body;

    await createAssets(req.user.id, req.files, collectionId);

    // Send a success response after processing all files
    res.status(200).json({ success: true, message: 'Files uploaded successfully' });
  } catch (error) {
    console.error('Error processing files:', error);
    res.status(500).json({ success: false, message: 'Error processing files' });
  }
});

app.get('/api/asset/:xid', async (req, res) => {
  try {
    const { xid } = req.params;
    const assetData = await getAsset(xid);
    res.json(assetData);
  } catch (error) {
    console.error('Error reading metadata:', error);
    res.status(404).json({ message: 'Asset not found' });
  }
});

app.patch('/api/asset/:xid', ensureAuthenticated, async (req, res) => {
  const { xid } = req.params;
  const { title, collection } = req.body;
  const userId = req.user.id;

  try {
    let assetData = await getAsset(xid);

    if (userId != assetData.asset.owner) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!assetData.mint) {
      assetData.asset.title = title;
    }

    if (collection && collection !== assetData.asset.collection) {
      await collectionRemoveAsset(assetData.asset.collection, assetData.asset.xid);
      assetData.asset.collection = collection;
      await collectionAddAsset(assetData.asset.collection, assetData.asset.xid);
    }

    await saveAsset(assetData);

    res.json({ message: 'Metadata updated successfully' });
  } catch (error) {
    console.error('Error updating metadata:', error);
    res.status(500).json({ message: 'Error updating metadata' });
  }
});

app.post('/api/asset/:xid/mint', ensureAuthenticated, async (req, res) => {
  try {
    const xid = req.params.xid;
    const { editions } = req.body;
    const userId = req.user.id;
    const assetData = await getAsset(xid);

    console.log(`mint ${xid} with ${editions} editions`);

    if (assetData.asset.owner != userId) {
      return req.status(401).json({ message: "Unauthorized" });
    }

    await createToken(userId, xid, editions);
    res.json({ message: 'Success' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error' });
  }
});

app.get('/api/profiles/', async (req, res) => {
  const agentsDir = config.agents;
  const profiles = [];

  try {
    const agentFolders = fs.readdirSync(agentsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const folder of agentFolders) {
      const metaFilePath = path.join(agentsDir, folder, 'agent.json');

      if (fs.existsSync(metaFilePath)) {
        const metaContent = fs.readFileSync(metaFilePath, 'utf-8');
        const metaData = JSON.parse(metaContent);
        profiles.push(metaData);
      }
    }

    res.json(profiles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while reading agent profiles.' });
  }
});

app.get('/api/profile/:id?', async (req, res) => {
  const userId = req.params.id || req.user?.id;

  if (!userId) {
    return res.status(404).json({ message: 'Profile not found' });
  }

  try {
    const agentData = await getAgentAndCollections(userId);

    if (agentData) {
      agentData.isUser = (req.user?.id == agentData.id);
      res.json(agentData);
    } else {
      res.status(404).json({ message: 'Profile not found' });
    }
  } catch (error) {
    console.error('Error fetching profile data:', error);
    res.status(500).json({ message: 'Error fetching profile data' });
  }
});

app.get('/api/collections/:xid', async (req, res) => {
  try {
    // const metadata = await getAsset(req.params.xid);

    // const authId = req.user?.id;
    // const isOwner = (authId == metadata.asset.owner);
    // const assetsInCollection = [];

    // for (const assetId of metadata.collection.assets) {
    //   const assetMetadata = await getAsset(assetId);
    //   const isToken = !!assetMetadata.token;

    //   if (isOwner || isToken) {
    //     assetsInCollection.push(assetMetadata);
    //   }
    // }

    // metadata.isOwnedByUser = isOwner;
    // metadata.collection.assets = assetsInCollection;

    // if (assetsInCollection.length > 0 && !metadata.thumbnail) {
    //   metadata.thumbnail = assetsInCollection[0].file.path;
    // }

    const metadata = await getCollection(req.params.xid);
    const count = metadata.collection.assets.length;

    if (count > 0 && !metadata.thumbnail) {
      metadata.thumbnail = metadata.collection.assets[0].file.path;
    }

    res.json(metadata);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'An error occurred while processing the request.' });
  }
});

app.post('/api/collections/', ensureAuthenticated, async (req, res) => {
  try {
    const { name } = req.body;
    const collection = await createCollection(req.user.id, name);
    console.log(`created collection ${collection}`);
    res.json(collection);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'An error occurred while processing the request.' });
  }
});

app.patch('/api/collections/:xid', ensureAuthenticated, async (req, res) => {
  try {
    const { title, defaultTitle } = req.body;
    const collection = await getAsset(req.params.xid);

    if (req.user.id != collection.asset.owner) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (title) {
      collection.asset.title = title;
    }

    if (defaultTitle) {
      collection.collection.default.title = defaultTitle;
    }

    await saveAsset(collection);
    res.json({ message: 'Collection updated successfully' });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'An error occurred while processing the request.' });
  }
});

app.patch('/api/profile/', ensureAuthenticated, async (req, res) => {
  try {
    const { name, tagline, collections } = req.body;
    const userId = req.user.id;

    const agentData = await getAgent(userId);

    if (userId != agentData.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (name) {
      agentData.name = name;
    }

    if (tagline !== undefined) {
      agentData.tagline = tagline;
    }

    if (collections) {
      // TBD verify collections
      agentData.collections = collections;
    }

    await saveAgent(agentData);
    res.json({ message: 'Metadata updated successfully' });
  } catch (error) {
    console.error('Error updating metadata:', error);
    res.status(500).json({ message: 'Error updating metadata' });
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
