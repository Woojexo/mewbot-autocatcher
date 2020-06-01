const AdmZip = require('adm-zip');
var zip = new AdmZip();

zip.addLocalFile('config_default.json', '', 'config.json');
zip.addLocalFile('index.js');
zip.addLocalFile('package.json');
zip.addLocalFile('pokemon.json');
zip.addLocalFile('spam.txt');
zip.addLocalFolder('build', 'build');

zip.writeZip('build.zip');