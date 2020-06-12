const fs = require('fs');
const server = require('https').createServer({key: fs.readFileSync('/etc/letsencrypt/live/wafflehq.ddns.net/privkey.pem'), cert: fs.readFileSync('/etc/letsencrypt/live/wafflehq.ddns.net/cert.pem')});
const io = require('socket.io')(server);

io.on('connect', socket => {
    debug('Connection Initialised from ' + socket.id);
    debug('Command Connection Established', socket);

    socket.on('versioncheck', (version, callback) => {
        debug('Version Check Requested', socket);
        var latest = fs.readFileSync('latest.txt', 'utf-8').split('@');

        if(isNaN(version.split('.').join(''))){
            callback({status: 'failure', message: 'Corrputed Version, Ignoring', data:{}});
            return;
        }

        if(parseInt(version.split('.').join('')) >= parseInt(latest[0].split('.').join(''))){
            callback({status: 'success', message: 'OK', data: {update: false, url: ""}});
        }else{
            callback({status: 'success', message: 'OK', data: {update: true, url: latest[1]}});
        }
    });

    socket.on('jsonversioncheck', (version, callback) => {
        debug('JSON Version Check Requested', socket);
        var latest = JSON.parse(fs.readFileSync('pokemon.json', 'utf-8'));

        if(isNaN(version.split('.').join(''))){
            callback({status: 'failure', message: 'Corrputed Version, Ignoring', data:{}});
            return;
        }

        if(parseInt(version.split('.').join('')) >= parseInt(latest.version.split('.').join(''))){
            callback({status: 'success', message: 'OK', data: {update: false, data: ""}});
        }else{
            callback({status: 'success', message: 'OK', data: {update: true, data: latest}});
        }
    });

    socket.on('unrecognisedpokemon', (image, hash, callback) => {
        debug('Unrecognised Pokemon Reported', socket);

        var urlmatch = image.match(/http:\/\/mewbot\.skylarr\.me:5001\/.*/);
        var hashmatch = hash.match(/[a-z0-9]{64}/);
        if(!urlmatch || !hashmatch){
            callback({status: 'failure', message: 'Corrputed URL or hash, Ignoring', data:{}});
            return;
        }

        fs.appendFileSync('unrecognised.txt', `${image} - ${hash}\n`);
        callback({status: 'success', message: 'OK', data: {}});
    });
});

server.listen(443, () => {
    debug('Listening');
});

function debug(message, socket = null){
    console.log(`[${socket ? 'Command' : 'Command-Local'}] ${message}`);
    if(socket) socket.emit('debug', 'Command', message, () => {});
}