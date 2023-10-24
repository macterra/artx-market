
const WebSocket = require('ws');

const {
    finishEvent,
    relayInit,
    validateEvent,
    verifySignature,
    getSignature,
    getEventHash,
    getPublicKey
} = require('nostr-tools');

const config = {
    nostr_relay: 'strfry:7777',
    nostr_sk: '531622b8f6eb29937abfea6029d70a00ec925a081e565d5875661002b49551fb',
};

config.nostr_pk = getPublicKey(config.nostr_sk);

const createEvent = async (message) => {
    let event = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: message,
        pubkey: getPublicKey(config.nostr_sk),
    };

    finishEvent(event, config.nostr_sk);

    let ok = validateEvent(event);
    let veryOk = verifySignature(event);

    console.log('Event:', event);
    console.log('Validation result:', ok);
    console.log('Signature verification result:', veryOk);

    return event;
};

const RELAYS = {};

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

module.exports = {
    createEvent,
    openRelay,
    closeRelays,
    countOpenRelays,
    sendEvent,
};
