const nostr = require('./nostr');

console.log('nostr-test');

async function main() {
    await nostr.sendMessage('hello!');
    await nostr.tryConnect();
}

main();
