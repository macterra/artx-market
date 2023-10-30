
const WebSocket = require('ws');
const assert = require('assert');
const {
    finishEvent,
    validateEvent,
    verifySignature,
    getPublicKey
} = require('nostr-tools');

const config = require('./config');
const xidb = require('./xidb');

const RELAYS = {};

function createMessage(message) {
    let event = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: message,
        pubkey: getPublicKey(config.nostr_key),
    };

    finishEvent(event, config.nostr_key);

    const valid = validateEvent(event);
    const verified = verifySignature(event);

    if (valid && verified) {
        return event;
    }
};

function openRelay(wsurl) {
    const ws = new WebSocket(wsurl);

    ws.on('open', () => {
        console.log(`ws open ${wsurl}`);
        RELAYS[wsurl] = ws;
    });

    ws.on('error', (error) => {
        console.log(`ws error from ${wsurl}: ${error}`);
    });

    ws.on('message', (event) => {
        console.log(`ws message from ${wsurl}: ${event} `);
    });

    ws.on('close', () => {
        console.log(`ws close ${wsurl}`);
        delete RELAYS[wsurl];
    });
}

function closeRelays() {
    for (let key in RELAYS) {
        const ws = RELAYS[key];
        ws.close();
    }
}

function countOpenRelays() {
    let count = 0;

    for (let key in RELAYS) {
        const ws = RELAYS[key];

        if (ws.readyState === WebSocket.OPEN) {
            count++;
        }
    }

    return count;
}

function subscribeToRelays() {
    const filters = {
        kinds: [1],
        limit: 0,
    };

    sendRequest(filters);
}

function sendEvent(event) {
    const message = JSON.stringify(["EVENT", event]);

    for (let key in RELAYS) {
        const ws = RELAYS[key];

        if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
            console.log(`ws event sent to ${key}`);
        }
        else {
            console.log(`ws ${key} not open`);
        }
    }
}

function sendMessage(message) {
    const event = createMessage(message);

    if (event) {
        sendEvent(event);
    }
}

function sendRequest(filters) {
    const sub = "foo";
    const message = JSON.stringify(["REQ", sub, filters]);

    for (let key in RELAYS) {
        const ws = RELAYS[key];

        if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
            console.log(`ws req sent to ${key}`);
        }
        else {
            console.log(`ws ${key} not open`);
        }
    }
}

function createAnnouncement(event) {
    if (event.type === 'list') {
        const nft = xidb.getNft(event.asset);

        assert.ok(nft);
        assert.ok(nft.token.asset.title);
        assert.ok(nft.asset.title);
        assert.ok(nft.creator.name);
        assert.ok(event.price);
        assert.ok(nft.nft.link);
        assert.ok(nft.nft.preview);

        const announcement = `New listing! "${nft.token.asset.title} (${nft.asset.title})" by ${nft.creator.name} for ${event.price} sats\n\n${nft.nft.link}\n\n${nft.nft.preview}`;
        return createMessage(announcement);
    }

    if (event.type === 'sale') {
        const nft = xidb.getNft(event.asset);

        assert.ok(nft);
        assert.ok(nft.owner.name);
        assert.ok(nft.token.asset.title);
        assert.ok(nft.asset.title);
        assert.ok(nft.creator.name);
        assert.ok(nft.nft.link);
        assert.ok(nft.nft.preview);

        const announcement = `Congratulations to ${nft.owner.name} for collecting "${nft.token.asset.title} (${nft.asset.title})" by ${nft.creator.name}!\n\n${nft.nft.link}\n\n${nft.nft.preview}`;
        return createMessage(announcement);
    }
};

async function announce(event) {
    try {
        console.log(`nostr: announce types ${config.nostr_announce} to relays ${config.nostr_relays}`);

        const types = config.nostr_announce.split(',');

        if (!types.includes(event.type)) {
            console.log(`nostr: ${event.type} not in ${config.nostr_announce} so no announcement`);
            return;
        }

        const message = createAnnouncement(event);
        const relays = config.nostr_relays.split(',');

        for (let relay of relays) {
            openRelay(relay);
        }

        await new Promise(resolve => setTimeout(resolve, 3000));

        subscribeToRelays();

        console.log(`nostr: announce: ${message.content} on open relays: ${countOpenRelays()}`);

        sendEvent(message);

        await new Promise(resolve => setTimeout(resolve, 3000));

        closeRelays();
    }
    catch (error) {
        console.log(`nostr announce error: ${error}`);
    }
}

module.exports = {
    announce,
    closeRelays,
    countOpenRelays,
    createMessage,
    openRelay,
    sendEvent,
    sendMessage,
    subscribeToRelays,
};
