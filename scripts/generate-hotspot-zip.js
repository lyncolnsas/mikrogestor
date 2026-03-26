const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '..', 'public');
const templateDir = path.join(publicDir, 'hotspot-template');
const outputZip = path.join(publicDir, 'modelo-hotspot.zip');

if (!fs.existsSync(templateDir)) {
    console.error('Template directory not found');
    process.exit(1);
}

const zip = new AdmZip();
zip.addLocalFolder(templateDir);
zip.writeZip(outputZip);

console.log('ZIP created at:', outputZip);
