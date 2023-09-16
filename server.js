const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const passport = require('passport');
const LnurlAuth = require('passport-lnurl-auth');
const session = require('express-session');
const morgan = require('morgan');
const cron = require('node-cron');
const { requestInvoice } = require('lnurl-pay');
const axios = require('axios');

const config = require('./config');
const { createCharge, checkCharge, checkAddress, sendPayment } = require('./satspay');
const xidb = require('./xidb');
const { log } = require('console');

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
ensureFolderExists(config.id);

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

passport.use(new LnurlAuth.Strategy(async function (linkingPublicKey, done) {
  let user = map.user.get(linkingPublicKey);
  if (!user) {
    try {
      const agentData = await xidb.getAgentFromKey(linkingPublicKey);
      console.log(`passport ${linkingPublicKey} ${agentData.xid}`);
      user = { key: linkingPublicKey, xid: agentData.xid, };
      map.user.set(linkingPublicKey, user);
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

app.get('/check-auth/:xid?', async (req, res) => {
  if (req.isAuthenticated()) {
    const userId = req.params.xid;
    const admin = await xidb.getAdmin();
    const isAdmin = req.user.xid === admin.owner;

    if (userId) {
      res.json({
        isAuthenticated: true,
        message: 'Authenticated',
        sameId: req.user.xid === userId,
        isAdmin: isAdmin,
      });
    } else {
      res.json({
        isAuthenticated: true,
        message: 'Authenticated',
        isAdmin: isAdmin,
      });
    }
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

app.get('/api/v1/licenses', async (req, res) => {
  licenses = {
    "CC BY": "https://creativecommons.org/licenses/by/4.0/",
    "CC BY-SA": "https://creativecommons.org/licenses/by-sa/4.0/",
    "CC BY-NC": "https://creativecommons.org/licenses/by-nc/4.0/",
    "CC BY-ND": "https://creativecommons.org/licenses/by-nd/4.0/",
    "CC BY-NC-SA": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    "CC BY-NC-ND": "https://creativecommons.org/licenses/by-nc-nd/4.0/",
    "CC0": "https://creativecommons.org/publicdomain/zero/1.0/",
  };

  res.json(licenses);
});

app.get('/api/v1/admin', ensureAuthenticated, async (req, res) => {
  try {
    const adminData = await xidb.getAdmin();

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
    const adminData = await xidb.getAdmin();

    if (adminData.owner) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    adminData.owner = req.user.xid;
    const savedAdmin = await xidb.saveAdmin(adminData);
    res.json(savedAdmin);
  } catch (error) {
    console.error('Error reading metadata:', error);
    res.status(404).json({ message: 'Asset not found' });
  }
});

app.get('/api/v1/admin/save', ensureAuthenticated, async (req, res) => {
  try {
    const adminData = await xidb.getAdmin();

    if (!adminData.owner || adminData.owner !== req.user.xid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const savedAdmin = await xidb.saveAdmin(adminData);
    res.json(savedAdmin);
  } catch (error) {
    console.error('Error reading metadata:', error);
    res.status(404).json({ message: 'Asset not found' });
  }
});

app.get('/api/v1/admin/register', ensureAuthenticated, async (req, res) => {
  try {
    const adminData = await xidb.getAdmin();

    if (!adminData.owner || adminData.owner !== req.user.xid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (adminData.latest) {
      return res.status(500).json({ message: 'Already registered' });
    }

    const savedAdmin = await xidb.registerState(adminData);
    res.json(savedAdmin);
  } catch (error) {
    console.error('Error reading metadata:', error);
    res.status(404).json({ message: 'Asset not found' });
  }
});

app.get('/api/v1/admin/notarize', ensureAuthenticated, async (req, res) => {
  try {
    const adminData = await xidb.getAdmin();

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
    res.json(savedAdmin);
  } catch (error) {
    console.error('Error reading metadata:', error);
    res.status(404).json({ message: 'Asset not found' });
  }
});

app.get('/api/v1/admin/certify', ensureAuthenticated, async (req, res) => {
  try {
    const adminData = await xidb.getAdmin();

    if (!adminData.owner || adminData.owner !== req.user.xid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!adminData.pending) {
      return res.status(500).json({ message: 'No authorization pending' });
    }

    const savedAdmin = await xidb.certifyState(adminData);
    res.json(savedAdmin);
  } catch (error) {
    console.error('Error reading metadata:', error);
    res.status(404).json({ message: 'Asset not found' });
  }
});

app.get('/api/v1/admin/walletinfo', ensureAuthenticated, async (req, res) => {
  try {
    const adminData = await xidb.getAdmin();

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

app.get('/api/v1/admin/assets', ensureAuthenticated, async (req, res) => {
  try {
    const adminData = await xidb.getAdmin();

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
    const adminData = await xidb.getAdmin();

    if (!adminData.owner || adminData.owner !== req.user.xid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    res.json(xidb.allAgents());
  } catch (error) {
    console.error('Error:', error);
    res.status(404).json({ message: 'Agents not found' });
  }
});

app.get('/api/v1/admin/verify/asset/:xid', async (req, res) => {
  try {
    const adminData = await xidb.getAdmin();

    if (!adminData.owner || adminData.owner !== req.user.xid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const verify = await xidb.verifyAsset(req.params.xid);
    res.json(verify);
  } catch (error) {
    console.error('Error:', error);
    res.status(404).json({ error: 'Asset cannot be verified' });
  }
});

app.get('/api/v1/admin/fix/asset/:xid', async (req, res) => {
  try {
    const adminData = await xidb.getAdmin();

    if (!adminData.owner || adminData.owner !== req.user.xid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const verify = await xidb.fixAsset(req.params.xid);
    res.json(verify);
  } catch (error) {
    console.error('Error:', error);
    res.status(404).json({ error: 'Asset cannot be fixed' });
  }
});

app.get('/api/v1/admin/verify/agent/:xid', async (req, res) => {
  try {
    const adminData = await xidb.getAdmin();

    if (!adminData.owner || adminData.owner !== req.user.xid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const verify = await xidb.verifyAgent(req.params.xid);
    res.json(verify);
  } catch (error) {
    console.error('Error:', error);
    res.status(404).json({ error: 'Agent cannot be verified' });
  }
});

app.get('/api/v1/admin/fix/agent/:xid', async (req, res) => {
  try {
    const adminData = await xidb.getAdmin();

    if (!adminData.owner || adminData.owner !== req.user.xid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const verify = await xidb.fixAgent(req.params.xid);
    res.json(verify);
  } catch (error) {
    console.error('Error:', error);
    res.status(404).json({ error: 'Asset cannot be fixed' });
  }
});

app.get('/api/v1/admin/pin/asset/:xid', async (req, res) => {
  try {
    const adminData = await xidb.getAdmin();

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
    const cert = await xidb.getCert(req.params.xid);
    res.json(cert);
  } catch (error) {
    console.error('Error:', error);
    res.status(404).json({ message: 'Cert not found' });
  }
});

app.get('/api/v1/asset/:xid', async (req, res) => {
  try {
    const assetData = await xidb.getAsset(req.params.xid);
    assetData.userIsOwner = await xidb.isOwner(assetData, req.user?.xid);
    res.json(assetData);
  } catch (error) {
    console.error('Error reading metadata:', error);
    res.status(404).json({ message: 'Asset not found' });
  }
});

app.patch('/api/v1/asset/:xid', ensureAuthenticated, async (req, res) => {
  const { xid } = req.params;
  const { title, collection } = req.body;
  const userId = req.user.xid;

  try {
    let assetData = await xidb.getAsset(xid);

    if (userId != assetData.asset.owner) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (assetData.mint) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (title) {
      assetData.asset.title = title;
    }

    if (collection) {
      // TBD verify valid collection
      assetData.asset.collection = collection;
    }

    await xidb.commitAsset(assetData);

    res.json({ message: 'Metadata updated successfully' });
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
    const assetData = await xidb.getAsset(xid);

    if (assetData.asset.owner != userId) {
      console.log('mint unauthorized');
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (assetData.token) {
      console.log('already minted');
      return res.status(500).json({ message: 'Error' });
    }

    const record = {
      "type": "mint",
      "creator": userId,
    };

    xidb.saveHistory(xid, record);

    const mint = await xidb.createToken(userId, xid, editions, license, royalty / 100);

    const txn = {
      'type': 'mint',
      'xid': xid,
      'credits': mint.mintFee,
    };
    xidb.saveTxnLog(userId, txn);

    res.json(mint);
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
    const assetData = await xidb.getAsset(xid);

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
        "type": "list",
        "seller": userId,
        "edition": xid,
        "price": newPrice
      };

      xidb.saveHistory(assetData.nft.asset, record);
      await xidb.commitAsset(assetData, 'Listed');
    }

    res.json({ ok: true, message: 'Success' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error' });
  }
});

app.post('/api/v1/asset/:xid/buy', ensureAuthenticated, async (req, res) => {
  try {
    const xid = req.params.xid;
    const buyerId = req.user.xid;
    const { chargeId } = req.body;
    const assetData = await xidb.getAsset(xid);

    if (!assetData.nft) {
      return res.status(500).json({ message: 'Error' });
    }

    if (assetData.asset.owner == buyerId) {
      return res.status(500).json({ message: "Already owned" });
    }

    const buyer = await xidb.getAgent(buyerId);
    const sellerId = assetData.asset.owner;
    const seller = await xidb.getAgent(sellerId);

    // TBD associate this charge with this asset for validation
    const chargeData = await checkCharge(chargeId);

    if (!chargeData.paid) {
      console.log(`charge ${chargeId} not paid`);
      return res.status(500).json({ message: 'Error' });
    }

    const price = chargeData.amount;

    if (price != assetData.nft.price) {
      console.log(`price mismatch between charge ${price} and nft ${assetData.nft.price}`);
      return res.status(500).json({ message: 'Error' });
    }

    await xidb.transferAsset(xid, buyerId);

    const tokenData = await xidb.getAsset(assetData.nft.asset);
    const assetName = `"${tokenData.asset.title}" (${assetData.asset.title})`;
    console.log(`audit: ${buyer.name} buying ${assetName} for ${price} from ${seller.name}`);

    let audit = {
      "type": "sale",
      "charge": chargeData,
    };

    const royaltyRate = tokenData.token?.royalty || 0;
    let royalty = 0;
    let royaltyPaid = false;
    const creatorId = tokenData.asset.owner;

    let royaltyTxn = {
      "type": "royalty",
      "edition": xid,
      "buyer": buyerId,
      "seller": sellerId,
    };

    if (creatorId !== seller.xid) {
      const creator = await xidb.getAgent(creatorId);
      royalty = Math.round(price * royaltyRate);

      if (royalty > 0) {
        if (creator.deposit) {
          try {
            await sendPayment(creator.deposit, royalty, `royalty for asset ${assetName}`);
            console.log(`audit: royalty ${royalty} to ${creator.deposit}`);
            audit.royalty = {
              "address": creator.deposit,
              "amount": royalty,
            };
            royaltyPaid = true;
            royaltyTxn.address = creator.deposit;
            royaltyTxn.sats = royalty;
          }
          catch (error) {
            console.log(`payment error: ${error}`);
          }
        }

        if (!royaltyPaid) {
          await xidb.addCredits(creator.xid, royalty);
          console.log(`audit: royalty ${royalty} credits to ${creator.xid}`);
          audit.royalty = {
            "address": creator.xid,
            "amount": royalty,
          };
          royaltyTxn.address = creatorId;
          royaltyTxn.credits = royalty;
          royaltyPaid = true;
        }
      }
    }

    const txnFee = Math.round(config.txnFeeRate * price);
    const payout = price - royalty - txnFee;
    let payoutPaid = false;
    let payoutSats = 0;
    let payoutCredits = 0;

    if (seller.deposit) {
      try {
        await sendPayment(seller.deposit, payout, `sale of asset ${assetName}`);
        console.log(`audit: payout ${payout} to ${seller.deposit}`);
        audit.payout = {
          "address": seller.deposit,
          "amount": payout,
        };
        payoutPaid = true;
        payoutSats = payout;
      }
      catch (error) {
        console.log(`payment error: ${error}`);
      }
    }

    if (!payoutPaid) {
      await xidb.addCredits(seller.xid, payout);
      console.log(`audit: payout ${payout} credits to ${seller.xid}`);
      audit.payout = {
        "address": seller.xid,
        "amount": payout,
      };
      payoutPaid = true;
      payoutCredits = payout;
    }

    if (txnFee > 0 && config.depositAddress) {
      try {
        await sendPayment(config.depositAddress, txnFee, `txn fee for asset ${assetName}`);
        console.log(`audit: txn fee ${txnFee} to ${config.depositAddress}`);
        audit.txnfee = {
          "address": config.depositAddress,
          "amount": txnFee,
        };
      }
      catch (error) {
        console.log(`payment error: ${error}`);
      }
    }

    const record = {
      "type": "sale",
      "buyer": buyerId,
      "seller": sellerId,
      "edition": xid,
      "price": price,
    };

    const sellTxn = {
      "type": "sell",
      "buyer": buyerId,
      "edition": xid,
      "sats": payoutSats || null,
      "credits": payoutCredits || null,
    };

    const buyTxn = {
      "type": "buy",
      "seller": sellerId,
      "edition": xid,
      "sats": price,
    };

    xidb.saveHistory(assetData.nft.asset, record);
    xidb.saveTxnLog(sellerId, sellTxn);
    xidb.saveTxnLog(buyerId, buyTxn);

    if (royaltyPaid) {
      xidb.saveTxnLog(creatorId, royaltyTxn);
    }

    await xidb.saveAuditLog(audit);
    res.json({ ok: true, message: 'Success' });
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
    const agentData = await xidb.getAgentAndCollections(profileId, userId);

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
    const { name, tagline, pfp, deposit, collections, links } = req.body;
    const userId = req.user.xid;

    const agentData = await xidb.getAgent(userId);

    if (userId != agentData.xid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (name) {
      agentData.name = name;
    }

    if (tagline !== undefined) {
      agentData.tagline = tagline;
    }

    if (pfp) {
      agentData.pfp = pfp;
    }

    if (deposit) {
      const scan = await checkAddress(deposit);

      if (scan) {
        agentData.deposit = deposit;
        agentData.depositScan = scan;
      }
      else {
        res.status(400).json({ message: `Invalid address: ${deposit}` });
        return;
      }
    }

    if (collections) {
      // TBD verify collections
      agentData.collections = collections;
    }

    if (links) {
      // TBD verify links
      agentData.links = links;
    }

    await xidb.saveAgent(agentData);
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
    const agentData = await xidb.getAgent(profileId);

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
  const { charge } = req.body;

  try {
    const agentData = await xidb.buyCredits(userId, charge);

    if (agentData) {

      const txn = {
        'type': 'credits',
        'credits': charge.amount,
      };

      xidb.saveTxnLog(req.user.xid, txn);
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
    const collection = await xidb.createCollection(userId, "new");
    res.json(collection);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'An error occurred while processing the request.' });
  }
});

app.get('/api/v1/collections/:xid', async (req, res) => {
  try {
    const userId = req.user?.xid;
    const collection = await xidb.getCollection(req.params.xid, userId);
    res.json(collection);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'An error occurred while processing the request.' });
  }
});

app.post('/api/v1/collections/:xid', ensureAuthenticated, async (req, res) => {
  try {
    const collection = req.body;

    if (req.user.xid != collection.asset.owner) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (req.params.xid != collection.xid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const ok = await xidb.saveCollection(collection);
    res.json({ message: 'Collection updated successfully' });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'An error occurred while processing the request.' });
  }
});

app.patch('/api/v1/collections/:xid', ensureAuthenticated, async (req, res) => {
  try {
    const { thumbnail } = req.body;
    const collection = await xidb.getAsset(req.params.xid);

    if (req.user.xid != collection.asset.owner) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (thumbnail) {
      collection.collection.thumbnail = thumbnail;
    }

    await xidb.commitAsset(collection);
    res.json({ message: 'Collection updated successfully' });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'An error occurred while processing the request.' });
  }
});

app.delete('/api/v1/collections/:xid', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.xid;
    const collection = await xidb.getCollection(req.params.xid, userId);

    if (req.user.xid != collection.asset.owner) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (collection.collection.assets.length > 0) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await xidb.removeCollection(collection);
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
    const txn = {
      'type': 'upload',
      'xid': collectionId,
      'files': upload.filesUploaded,
      'bytes': upload.bytesUploaded,
      'credits': upload.creditsDebited,
    };
    xidb.saveTxnLog(req.user.xid, txn);
    res.status(200).json(upload);
  } catch (error) {
    console.error('Error processing files:', error);
    res.status(500).json({ message: 'Error processing files' });
  }
});

app.get('/api/v1/charge/:chargeId', ensureAuthenticated, async (req, res) => {
  try {
    const chargeData = await checkCharge(req.params.chargeId);

    res.status(200).json({
      id: chargeData.id,
      description: chargeData.description,
      amount: chargeData.amount,
      paid: chargeData.paid,
      time_elapsed: chargeData.time_elapsed,
      time_left: chargeData.time_left,
    });
  }
  catch (error) {
    console.error('Error:', error);
    res.status(500).json({ ok: false, message: 'Error' });
  }
});

app.post('/api/v1/charge', ensureAuthenticated, async (req, res) => {
  try {
    const { description, amount } = req.body;
    const chargeData = await createCharge(description, amount);

    res.status(200).json({
      ok: true,
      id: chargeData.id,
      url: chargeData.url,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ ok: false, message: 'Error' });
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
  const adminData = await xidb.getAdmin();
  if (adminData.pending) {
    console.log(`Pending txn ${adminData.pending}...`);
    const savedAdmin = await xidb.certifyState(adminData);
    if (!savedAdmin.pending) {
      console.log(`New certificate ${adminData.latest}`);
    }
  }
});

// Notarize market state at midnight
cron.schedule('0 0 * * *', async () => {
  const adminData = await xidb.getAdmin();
  if (!adminData.pending) {
    console.log(`Notarizing market state...`);
    const savedAdmin = await xidb.notarizeState(adminData);
    if (savedAdmin.pending) {
      console.log(`Pending txn ${adminData.pending}`);
    }
  }
});

xidb.integrityCheck().then(() => {
  app.listen(config.port, () => {
    console.log(`ArtX server running on ${config.host}:${config.port}`);
  });
}).catch((error) => {
  console.error('Failed to start the server:', error);
});
