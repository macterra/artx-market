
const { WebSocket } = require('websocket-polyfill');

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
    nostr_sk: '80ac742bbc82d1b53fb9518d20beb32545e0265b184a007e57c00da8f81f3973',
};

config.nostr_pk = getPublicKey(config.nostr_sk);

const sendMessage = async (message) => {
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
};

const tryConnect = async () => {

    //const relay = relayInit('wss://taranis.local:4848');
    const relay = relayInit('wss://localhost:7777');

    relay.on('connect', () => {
        console.log(`connected to ${relay.url}`);
    });

    relay.on('error', () => {
        console.log(`failed to connect to ${relay.url}`); S
    });

    await relay.connect();

    return relay;
};

module.exports = {
    sendMessage,
    tryConnect,
};
