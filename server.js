const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const passport = require('passport');
const LnurlAuth = require('passport-lnurl-auth');
const session = require('express-session');
const morgan = require('morgan');
const cron = require('node-cron');
const assert = require('assert');
const { requestInvoice } = require('lnurl-pay');
const axios = require('axios');

const config = require('./config');
const lnbits = require('./lnbits');
const xidb = require('./xidb');
const nostr = require('./nostr');

const app = express();

config.url = 'http://' + config.host + ':' + config.port;

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

app.get('/api/v1/data', (req, res) => {
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
  done(null, user.key);
});

passport.deserializeUser(function (key, done) {
  done(null, map.user.get(key) || null);
});

passport.use(new LnurlAuth.Strategy(async function (pubkey, done) {
  let user = map.user.get(pubkey);
  if (!user) {
    try {
      let agentData = xidb.getAgentFromKey(pubkey);

      if (!agentData) {
        agentData = await xidb.createAgent(pubkey);
        xidb.commitChanges({ type: 'create', agent: agentData.xid });
      }

      console.log(`passport ${pubkey} ${agentData.xid}`);
      user = { key: pubkey, xid: agentData.xid, };
      map.user.set(pubkey, user);
    }
    catch (error) {
      console.log(`error logging in ${error}`);
    }
  }
  done(null, user);
}));

app.use(passport.authenticate('lnurl-auth'));

app.get('/login',
  function (req, res, next) {
    if (req.user) {
      // Already authenticated.
      return res.redirect(`/profile/${req.user.xid}`);
    }
    next();
  },
  new LnurlAuth.Middleware({
    title: 'Login with ⚡Lightning⚡',
    instruction: 'Click or scan the QR code to login',
    loginTemplateFilePath: path.join(config.data, 'login.html'),
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

app.get('/check-auth', async (req, res) => {
  if (req.isAuthenticated()) {
    const userId = req.user.xid;
    const adminData = xidb.getAdmin();
    const isAdmin = userId === adminData.owner;

    res.json({
      isAuthenticated: true,
      userId: userId,
      message: 'Authenticated',
      isAdmin: isAdmin,
    });
  } else {
    res.json({
      isAuthenticated: false,
      message: 'Unauthorized',
    });
  }
});

app.get('/ipfs/*', async (req, res) => {
  try {
    const path = req.params[0];
    const response = await axios({
      method: 'post',
      url: `http://${config.ipfs}:5001/api/v0/cat?arg=/ipfs/${path}`,
      responseType: 'stream'
    });

    res.set(response.headers);

    // Check the file extension and set the Content-Type header accordingly
    if (path.endsWith('.html')) {
      res.set('Content-Type', 'text/html');
    } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.set('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.png')) {
      res.set('Content-Type', 'image/png');
    } else if (path.endsWith('.gif')) {
      res.set('Content-Type', 'image/gif');
    } // ...add more conditions for other file types as needed

    res.removeHeader('server');
    res.removeHeader('trailer');
    res.removeHeader('vary');

    response.data.pipe(res);
  } catch (error) {
    res.status(500).send({ error: error.toString() });
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

app.get('/api/v1/rates', async (req, res) => {
  try {
    const xrResp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const xrData = await xrResp.json();
    xrData.storageRate = config.storageRate;
    xrData.editionRate = config.editionRate;
    xrData.uploadRate = config.uploadRate;
    res.json(xrData);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error fetching exchange rates' });
  }
});

const ValidLicenses = {
  "CC BY": "https://creativecommons.org/licenses/by/4.0/",
  "CC BY-SA": "https://creativecommons.org/licenses/by-sa/4.0/",
  "CC BY-NC": "https://creativecommons.org/licenses/by-nc/4.0/",
  "CC BY-ND": "https://creativecommons.org/licenses/by-nd/4.0/",
  "CC BY-NC-SA": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  "CC BY-NC-ND": "https://creativecommons.org/licenses/by-nc-nd/4.0/",
  "CC0": "https://creativecommons.org/publicdomain/zero/1.0/",
};

app.get('/api/v1/licenses', async (req, res) => {
  res.json(ValidLicenses);
});

app.get('/api/v1/admin', ensureAuthenticated, async (req, res) => {
  try {
    const adminData = xidb.getAdmin();

    if (adminData.owner && adminData.owner !== req.user.xid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    res.json(adminData);
  } catch (error) {
    console.error('Error reading metadata:', error);
    res.status(404).json({ message: 'Asset not found' });
  }
});

app.get('/api/v1/admin/claim', ensureAuthenticated, async (req, res) => {
  try {
    const adminData = xidb.getAdmin();

    if (adminData.owner) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    adminData.owner = req.user.xid;
    const savedAdmin = await xidb.saveAdmin(adminData);
    adminData.githash = await xidb.commitChanges({ type: 'claim-state', agent: req.user.xid, state: savedAdmin.xid });
    res.json(savedAdmin);
  } catch (error) {
    console.error('Error reading metadata:', error);
    res.status(404).json({ message: 'Asset not found' });
  }
});

app.get('/api/v1/admin/save', ensureAuthenticated, async (req, res) => {
  try {
    const adminData = xidb.getAdmin();

    if (!adminData.owner || adminData.owner !== req.user.xid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const savedAdmin = await xidb.saveAdmin(adminData);
    adminData.githash = await xidb.commitChanges({ type: 'save-state', agent: req.user.xid, state: savedAdmin.xid });
    res.json(savedAdmin);
  } catch (error) {
    console.error('Error reading metadata:', error);
    res.status(404).json({ message: 'Asset not found' });
  }
});

app.get('/api/v1/admin/register', ensureAuthenticated, async (req, res) => {
  try {
    const adminData = xidb.getAdmin();

    if (!adminData.owner || adminData.owner !== req.user.xid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (adminData.latest) {
      return res.status(500).json({ message: 'Already registered' });
    }

    const savedAdmin = await xidb.registerState(adminData);
    adminData.githash = await xidb.commitChanges({ type: 'register-state', agent: req.user.xid, state: savedAdmin.xid });
    res.json(savedAdmin);
  } catch (error) {
    console.error('Error reading metadata:', error);
    res.status(404).json({ message: 'Asset not found' });
  }
});

app.get('/api/v1/admin/notarize', ensureAuthenticated, async (req, res) => {
  try {
    const adminData = xidb.getAdmin();

    if (!adminData.owner || adminData.owner !== req.user.xid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!adminData.latest) {
      return res.status(500).json({ message: 'Not registered' });
    }

    if (adminData.pending) {
      return res.status(500).json({ message: 'Authorization pending' });
    }

    const savedAdmin = await xidb.notarizeState(adminData);

    if (savedAdmin.pending) {
      savedAdmin.githash = await xidb.commitChanges({ type: 'notarize-state', agent: req.user.xid, state: savedAdmin.xid, txn: savedAdmin.pending });
    }

    res.json(savedAdmin);
  } catch (error) {
    console.error('Error reading metadata:', error);
    res.status(404).json({ message: 'Asset not found' });
  }
});

app.get('/api/v1/admin/certify', ensureAuthenticated, async (req, res) => {
  try {
    const adminData = xidb.getAdmin();

    if (!adminData.owner || adminData.owner !== req.user.xid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!adminData.pending) {
      return res.status(500).json({ message: 'No authorization pending' });
    }

    const savedAdmin = await xidb.certifyState(adminData);

    if (!savedAdmin.pending) {
      savedAdmin.githash = await xidb.commitChanges({ type: 'certify-state', agent: req.user.xid, state: savedAdmin.xid, cert: savedAdmin.latest });
    }

    res.json(savedAdmin);
  } catch (error) {
    console.error('Error reading metadata:', error);
    res.status(404).json({ message: 'Asset not found' });
  }
});

app.get('/api/v1/admin/walletinfo', ensureAuthenticated, async (req, res) => {
  try {
    const adminData = xidb.getAdmin();

    if (!adminData.owner || adminData.owner !== req.user.xid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const walletinfo = await xidb.getWalletInfo();
    res.json(walletinfo);
  } catch (error) {
    console.error('Error:', error);
    res.status(404).json({ message: 'walletinfo not found' });
  }
});

app.get('/api/v1/admin/auditlog', ensureAuthenticated, async (req, res) => {
  try {
    const adminData = xidb.getAdmin();

    if (!adminData.owner || adminData.owner !== req.user.xid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const auditlog = await xidb.getAuditLog();
    res.json(auditlog);
  } catch (error) {
    console.error('Error:', error);
    res.status(404).json({ message: 'auditlog not found' });
  }
});

app.get('/api/v1/admin/assets', ensureAuthenticated, async (req, res) => {
  try {
    const adminData = xidb.getAdmin();

    if (!adminData.owner || adminData.owner !== req.user.xid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    res.json(xidb.allAssets());
  } catch (error) {
    console.error('Error:', error);
    res.status(404).json({ message: 'Assets not found' });
  }
});

app.get('/api/v1/admin/agents', ensureAuthenticated, async (req, res) => {
  try {
    const adminData = xidb.getAdmin();

    if (!adminData.owner || adminData.owner !== req.user.xid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const agentIds = xidb.allAgents();
    const agents = agentIds.map(xid => xidb.getAgent(xid));

    res.json(agents);
  } catch (error) {
    console.error('Error:', error);
    res.status(404).json({ message: 'Agents not found' });
  }
});

app.get('/api/v1/admin/pin/asset/:xid', async (req, res) => {
  try {
    const adminData = xidb.getAdmin();

    if (!adminData.owner || adminData.owner !== req.user.xid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const pin = await xidb.pinAsset(req.params.xid);
    res.json(pin);
  } catch (error) {
    console.error('Error:', error);
    res.status(404).json({ error: `Asset cannot be pinned ${error}` });
  }
});

app.get('/api/v1/cert/:xid', async (req, res) => {
  try {
    const cert = xidb.getCert(req.params.xid);
    res.json(cert);
  } catch (error) {
    console.error('Error:', error);
    res.status(404).json({ message: 'Cert not found' });
  }
});

app.get('/api/v1/nft/:xid', async (req, res) => {
  try {
    const nftData = xidb.getNft(req.params.xid);
    nftData.owned = (req.user?.xid === nftData.owner.xid);
    res.json(nftData);
  } catch (error) {
    console.error('Error:', error);
    res.status(404).json({ message: 'NFT not found' });
  }
});

app.get('/api/v1/asset/:xid', async (req, res) => {
  try {
    const assetData = xidb.getAsset(req.params.xid);

    if (assetData) {
      xidb.enrichAsset(assetData);
      // user owns the asset or any editions
      assetData.userIsOwner = xidb.isOwner(assetData, req.user?.xid);
    }
    res.json(assetData);
  } catch (error) {
    console.error('Error:', error);
    res.status(404).json({ message: 'Asset not found' });
  }
});

app.patch('/api/v1/asset/:xid', ensureAuthenticated, async (req, res) => {
  const { xid } = req.params;
  const { title, collection } = req.body;
  const userId = req.user.xid;

  try {
    let assetData = xidb.getAsset(xid);

    if (userId != assetData.asset.owner) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (assetData.mint) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (title) {
      assetData.asset.title = title.substring(0, 40);
    }

    if (collection) {
      // TBD verify valid collection
      assetData.asset.collection = collection;
    }

    xidb.saveAsset(assetData);
    xidb.commitChanges({ type: 'update', agent: userId, asset: assetData.xid });

    res.json({ message: 'Asset saved successfully' });
  } catch (error) {
    console.error('Error updating metadata:', error);
    res.status(500).json({ message: 'Error updating metadata' });
  }
});

app.post('/api/v1/asset/:xid/mint', ensureAuthenticated, async (req, res) => {
  try {
    const xid = req.params.xid;
    const { editions, license, royalty } = req.body;
    const userId = req.user.xid;
    const assetData = xidb.getAsset(xid);

    if (assetData.asset.owner != userId) {
      console.log('mint unauthorized');
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (assetData.token) {
      console.log('already minted');
      return res.status(500).json({ message: 'Error' });
    }

    const record = {
      type: "mint",
      creator: userId,
    };

    xidb.saveHistory(xid, record);

    const mint = await xidb.createToken(userId, xid, editions, license, royalty / 100);

    const txn = {
      type: 'mint',
      xid: xid,
      credits: mint.mintFee,
    };

    xidb.saveTxnLog(userId, txn);
    xidb.commitChanges({ type: 'mint', agent: userId, asset: xid, editions: editions });

    res.json(mint);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error' });
  }
});

app.get('/api/v1/asset/:xid/unmint', ensureAuthenticated, async (req, res) => {
  try {
    const xid = req.params.xid;
    const userId = req.user.xid;
    const assetData = xidb.getAsset(xid);

    if (assetData.asset.owner != userId) {
      console.log('mint unauthorized');
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!assetData.token) {
      console.log('not minted');
      return res.status(500).json({ message: 'Error' });
    }

    const unmint = await xidb.unmintToken(userId, xid);

    const txn = {
      type: 'unmint',
      xid: xid,
      credits: unmint.refund,
    };

    xidb.saveTxnLog(userId, txn);
    xidb.commitChanges({ type: 'unmint', agent: userId, asset: xid });

    res.json(unmint);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error' });
  }
});

app.post('/api/v1/asset/:xid/list', ensureAuthenticated, async (req, res) => {
  try {
    const xid = req.params.xid;
    const { price } = req.body;
    const userId = req.user.xid;
    const assetData = xidb.getAsset(xid);

    console.log(`list ${xid} with price=${price}`);

    if (assetData.asset.owner != userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!assetData.nft) {
      res.status(500).json({ message: 'Error' });
    }

    const newPrice = parseInt(price, 10);

    if (newPrice !== assetData.nft.price) {
      assetData.nft.price = newPrice;

      const record = {
        type: 'list',
        seller: userId,
        edition: xid,
        price: newPrice
      };

      xidb.saveHistory(assetData.nft.asset, record);
      xidb.saveAsset(assetData);

      const event = { type: 'list', agent: userId, asset: xid, price: newPrice };
      xidb.commitChanges(event);
      nostr.announce(event);

      res.json({ message: 'Asset listed successfully' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error' });
  }
});

app.post('/api/v1/asset/:xid/buy', ensureAuthenticated, async (req, res) => {
  try {
    const xid = req.params.xid;
    const buyerId = req.user.xid;
    const { invoice } = req.body;
    const assetData = xidb.getAsset(xid);

    if (!assetData.nft) {
      return res.status(500).json({ message: 'Error' });
    }

    if (assetData.asset.owner == buyerId) {
      return res.status(500).json({ message: "Already owned" });
    }

    const sale = await xidb.purchaseAsset(xid, buyerId, invoice);

    const event = { type: 'sale', agent: buyerId, asset: xid, price: assetData.nft.price };
    xidb.commitChanges(event);
    nostr.announce(event);

    res.json(sale);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: `Error: ${error}` });
  }
});

app.get('/api/v1/listings', async (req, res) => {
  try {
    const listings = await xidb.getListings();
    res.status(200).json(listings);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error' });
  }
});

app.get('/api/v1/profiles/', async (req, res) => {
  try {
    const profiles = await xidb.getAllAgents();
    res.json(profiles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while reading agent profiles.' });
  }
});

app.get('/api/v1/profile/:xid?', async (req, res) => {
  const profileId = req.params.xid;
  const userId = req.user?.xid;

  try {
    const agentData = xidb.getAgentAndCollections(profileId, userId);

    if (agentData) {
      agentData.collections = Object.values(agentData.collections);
      agentData.isUser = (userId === agentData.xid);
      if (agentData.isUser) {
        agentData.txnlog = xidb.getAgentTxnLog(userId);
      }
      res.json(agentData);
    } else {
      res.status(404).json({ message: 'Profile not found' });
    }
  } catch (error) {
    console.error('Error fetching profile data:', error);
    res.status(500).json({ message: 'Error fetching profile data' });
  }
});

app.patch('/api/v1/profile/', ensureAuthenticated, async (req, res) => {
  try {
    const { name, tagline, pfp, deposit, depositToCredits, collections, links } = req.body;
    const userId = req.user.xid;

    const agentData = xidb.getAgent(userId);

    if (userId != agentData.xid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (name) {
      agentData.name = name.substring(0, 30);;
    }

    if (tagline !== undefined) {
      agentData.tagline = tagline.substring(0, 30);;
    }

    if (pfp) {
      agentData.pfp = pfp;
    }

    if (deposit) {
      const scan = await lnbits.checkAddress(deposit);

      if (scan) {
        agentData.deposit = deposit;
      }
      else {
        return res.status(400).json({ message: `Invalid address: ${deposit}` });
      }
    }

    if (depositToCredits !== undefined) {
      // If deposit was set, it was valid
      agentData.depositToCredits = depositToCredits;
    }

    if (collections) {
      // TBD verify collections
      agentData.collections = collections;
    }

    if (links) {
      // TBD verify links
      agentData.links = links;
    }

    xidb.saveAgent(agentData);
    xidb.commitChanges({ type: 'update', agent: userId });
    res.json({ message: 'Metadata updated successfully' });
  } catch (error) {
    console.error('Error updating metadata:', error);
    res.status(500).json({ message: 'Error updating metadata' });
  }
});

app.post('/api/v1/profile/:xid/invoice', async (req, res) => {
  const profileId = req.params.xid;
  const { amount } = req.body;

  try {
    const agentData = xidb.getAgent(profileId);

    if (agentData) {
      const { invoice } = await requestInvoice({
        lnUrlOrAddress: agentData.deposit,
        tokens: amount,
      });
      res.json({ invoice: invoice });
    } else {
      res.status(404).json({ message: 'Profile not found' });
    }
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ message: 'Error creating invoice' });
  }
});

app.post('/api/v1/profile/credit', ensureAuthenticated, async (req, res) => {
  const userId = req.user.xid;
  const { invoice } = req.body;

  try {
    const agentData = await xidb.buyCredits(userId, invoice);

    if (agentData) {

      const txn = {
        'type': 'credits',
        'credits': invoice.amount,
      };

      xidb.saveTxnLog(userId, txn);
      xidb.commitChanges({ type: 'credits', agent: userId, credits: invoice.amount });
      res.json(agentData);
    }
    else {
      res.status(500).json({ message: 'Error adding credits' });
    }
  } catch (error) {
    console.error('Error adding credits:', error);
    res.status(500).json({ message: 'Error adding credits' });
  }
});

app.get('/api/v1/collections/', async (req, res) => {
  try {
    const userId = req.user?.xid;
    const collection = xidb.createCollection(userId, "new");
    xidb.commitChanges({ type: 'create', agent: userId, asset: collection.xid });
    res.json(collection);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'An error occurred while processing the request.' });
  }
});

app.get('/api/v1/collections/:xid', async (req, res) => {
  try {
    const userId = req.user?.xid;
    const collection = xidb.getCollection(req.params.xid, userId);
    res.json(collection);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'An error occurred while processing the request.' });
  }
});

app.patch('/api/v1/collections/:xid', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.xid;
    const collection = req.body;

    if (userId != collection.asset.owner) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (req.params.xid != collection.xid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const currentCollection = xidb.getAsset(req.params.xid);

    assert.ok(collection.xid === currentCollection.xid);
    assert.ok(currentCollection.collection);

    const title = collection.asset.title.substring(0, 40);

    if (title.length) {
      currentCollection.asset.title = title;
    }

    const thumbnail = collection.collection.thumbnail;

    if (thumbnail) {
      /// !!! validate thumbnail
      currentCollection.collection.thumbnail = thumbnail;
    }

    const defaultTitle = collection.collection.default.title.substring(0, 40);

    if (defaultTitle.length) {
      currentCollection.collection.default.title = defaultTitle;
    }

    const defaultLicense = collection.collection.default.license;

    if (ValidLicenses.hasOwnProperty(defaultLicense)) {
      currentCollection.collection.default.license = defaultLicense;
    }

    const defaultRoyalty = parseInt(collection.collection.default.royalty);

    if (defaultRoyalty >= 0 && defaultRoyalty <= 25) {
      currentCollection.collection.default.royalty = defaultRoyalty;
    }

    const defaultEditions = parseInt(collection.collection.default.editions);

    if (defaultEditions >= 0 && defaultEditions <= 100) {
      currentCollection.collection.default.editions = defaultEditions;
    }

    xidb.saveCollection(currentCollection);
    xidb.commitChanges({ type: 'update', agent: userId, asset: collection.xid });
    res.json({ message: 'Collection updated successfully' });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'An error occurred while processing the request.' });
  }
});

app.get('/api/v1/collections/:xid/mint-all', ensureAuthenticated, async (req, res) => {
  try {
    const xid = req.params.xid;
    const userId = req.user?.xid;
    const collection = xidb.getCollection(xid, userId);

    if (userId != collection.asset.owner) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const editions = collection.collection.default.editions;
    const license = collection.collection.default.license;
    const royalty = collection.collection.default.royalty;

    for (const asset of collection.collection.assets) {
      if (!asset.token) {

        const record = {
          "type": "mint",
          "creator": userId,
        };

        xidb.saveHistory(asset.xid, record);

        const mint = await xidb.createToken(userId, asset.xid, editions, license, royalty / 100);

        const txn = {
          'type': 'mint',
          'xid': asset.xid,
          'credits': mint.mintFee,
        };

        xidb.saveTxnLog(userId, txn);
      }
    }

    xidb.commitChanges({ type: 'mint-all', agent: userId, asset: xid });
    res.json({ message: 'Mint all success' });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'An error occurred while processing the request.' });
  }
});

app.delete('/api/v1/collections/:xid', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.xid;
    const collection = xidb.getCollection(req.params.xid, userId);

    if (req.user.xid != collection.asset.owner) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (collection.collection.assets.length > 0) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    xidb.removeCollection(collection);
    xidb.commitChanges({ type: 'delete', agent: userId, asset: collection.xid });
    res.json({ message: 'Collection removed successfully' });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'An error occurred while processing the request.' });
  }
});

app.post('/api/v1/collections/:xid/upload', ensureAuthenticated, upload.array('images', 100), async (req, res) => {
  try {
    const collectionId = req.params.xid;
    const upload = await xidb.createAssets(req.user.xid, req.files, collectionId);

    if (!upload.filesUploaded) {
      return res.status(500).json({ message: 'Error processing images' });
    }

    const txn = {
      'type': 'upload',
      'xid': collectionId,
      'files': upload.filesUploaded,
      'bytes': upload.bytesUploaded,
      'credits': upload.creditsDebited,
    };

    xidb.saveTxnLog(req.user.xid, txn);
    xidb.commitChanges({ type: 'upload', agent: req.user.xid, asset: collectionId, files: upload.filesUploaded, bytes: upload.bytesUploaded });
    res.status(200).json(upload);
  } catch (error) {
    console.error('Error processing files:', error);
    res.status(500).json({ message: 'Error processing images' });
  }
});

app.post('/api/v1/invoice', ensureAuthenticated, async (req, res) => {
  try {
    const { description, amount } = req.body;
    const expiry = 120; // get from config
    const invoice = await lnbits.createInvoice(amount, description, expiry);
    res.status(200).json(invoice);
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

// Check pending txn every minute
cron.schedule('* * * * *', async () => {
  const adminData = xidb.getAdmin();
  if (adminData.pending) {
    console.log(`Pending txn ${adminData.pending}...`);
    const savedAdmin = await xidb.certifyState(adminData);
    if (!savedAdmin.pending) {
      xidb.commitChanges({ type: 'certify-state', state: savedAdmin.xid, cert: savedAdmin.latest });
    }
  }
});

// Notarize market state at midnight
cron.schedule('0 0 * * *', async () => {
  const adminData = xidb.getAdmin();
  if (!adminData.pending) {
    console.log(`Notarizing market state...`);
    const savedAdmin = await xidb.notarizeState(adminData);
    if (savedAdmin.pending) {
      xidb.commitChanges({ type: 'notarize-state', state: savedAdmin.xid, txn: savedAdmin.pending });
    }
  }
});

// Check pending txn every minute
// cron.schedule('* * * * *', async () => {
//   const res = xidb.sendAnnouncements();
//   if (res.message) {
//     xidb.commitChanges(res.message);
//   }
// });

xidb.integrityCheck().then(() => {

  xidb.commitChanges({ type: 'restart' });

  app.listen(config.port, () => {
    console.log(`ArtX server running on ${config.host}:${config.port}`);
  });
}).catch((error) => {
  console.error('Failed to start the server:', error);
});
