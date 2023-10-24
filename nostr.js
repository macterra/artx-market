
const WebSocket = require('ws');
const config = require('./config');

const {
    finishEvent,
    validateEvent,
    verifySignature,
    getPublicKey
} = require('nostr-tools');

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
        limit: 1000,
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

module.exports = {
    closeRelays,
    countOpenRelays,
    createMessage,
    openRelay,
    sendEvent,
    sendMessage,
    subscribeToRelays,
};
