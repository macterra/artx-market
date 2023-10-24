const nostr = require('./nostr');

console.log('nostr-test');

async function main() {
    const event = await nostr.createEvent('hello again!');

    nostr.openRelay('ws://taranis.local:4848');
    nostr.openRelay('ws://localhost:7777');

    while (nostr.countOpenRelays() < 2) {
        console.log('waiting to open relays...');
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    nostr.sendEvent(event);
    nostr.closeRelays();
}

main();
