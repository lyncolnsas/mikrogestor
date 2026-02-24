
const { generateKeyPairSync } = require('crypto');

function generateKeypair() {
    const { publicKey, privateKey } = generateKeyPairSync('x25519', {
        publicKeyEncoding: { type: 'spki', format: 'der' },
        privateKeyEncoding: { type: 'pkcs8', format: 'der' }
    });

    const pubBase64 = publicKey.slice(-32).toString('base64');
    const privBase64 = privateKey.slice(-32).toString('base64');

    return { publicKey: pubBase64, privateKey: privBase64 };
}

const fs = require('fs');
const keys = generateKeypair();
fs.writeFileSync('temp_keys_utf8.json', JSON.stringify(keys));
console.log("Keys written to temp_keys_utf8.json");
