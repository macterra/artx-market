const nostr = require('./nostr');

async function main() {

    nostr.openRelay('ws://taranis.local:4848');
    nostr.openRelay('ws://localhost:7777');

    while (nostr.countOpenRelays() < 1) {
        console.log('waiting to open relays...');
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    nostr.subscribeToRelays();

    while (true) {
        nostr.sendMessage(`hello again! ${new Date().toISOString()}`);
        await new Promise(resolve => setTimeout(resolve, 10000));
    }
}

main();
