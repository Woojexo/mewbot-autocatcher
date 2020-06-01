const Discord = require('discord.js');
const fs = require('fs');
const {imageHash} = require('@lolpants/image-hash');
const axios = require('axios');
const delay = require('delay');
const server = require('http').createServer();
const io = require('socket.io')(server, {pingInterval: 2500, pingTimeout: 5000});
const commandserver = require('socket.io-client')('https://wafflehq.ddns.net:443', {rejectUnauthorized: false});
const express = require('express');
const app = express();
const AdmZip = require('adm-zip');
const splitarray = require('split-array');

var pokedex = JSON.parse(fs.readFileSync('pokemon.json', 'utf-8'));
var spam = fs.readFileSync('spam.txt', 'utf-8').split('\n');
var config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));
// var pokemonlist = fs.existsSync('./build') ? fs.readdirSync('./build/pokemon/') : fs.readdirSync('./public/pokemon/');
var servers = {};

var bot1;
var bot2;
var bot3;
var bot1data;
var bot2data;
var bot3data;
var commandready = false;
var pause = false;
var authenticatedsockets = [];

var botlogs = [];
var debuglogs = [];
var average = [];

var pokemoncaught = 0;
var unknownpokemon = 0;
var version = '1.0.0';
var uptime = new Date();
var averagerecognitiontime = 0;

io.on('connect', async (socket) => {
    debug('Backend', 'Connection Initialised from ' + socket.id);

    if(!config.authenticationenabled || !fs.existsSync('./build')){
        authenticatedsockets.push(socket.id);
    }else{
        
    }

    socket.on('init', callback => {
        if(!authenticatedsockets.includes(socket.id)){
            return;
        }

        debug(socket.id, 'Init Request');
        if(bot1){
            var serverjson = config.servers;
            for(var guild of bot1.guilds.array()){
                var icon = guild.iconURL;
                if(icon && icon.includes('a_')) icon = icon.replace('.jpg', '.gif');
                var active = false;
                if(serverjson[guild.id] && (serverjson[guild.id].autocatch || serverjson[guild.id].spam)) active = true;
                servers[guild.id] = {id: guild.id, name: guild.name, icon: icon, active: active, acronym: guild.nameAcronym};
            }
        }
        callback({status: 'success', message: 'OK', data: {config: config, whitelist: getWhitelist(), blacklist: getBlacklist()}});
    });

    socket.on('configupdate', (value, data, callback) => {
        if(!authenticatedsockets.includes(socket.id)){
            return;
        }
        
        debug(socket.id, 'Config Update');
        config[value] = data;
        fs.writeFileSync('config.json', JSON.stringify(config));
        callback({status: 'success', message: 'OK', data: {}});
    });

    socket.on('dataping', callback => {
        if(!authenticatedsockets.includes(socket.id)){
            return;
        }
        
        callback({
            status: 'success',
            message: 'OK',
                data: {
                    botlogs: botlogs,
                    debuglogs: debuglogs,
                    averagerecognitiontime: averagerecognitiontime,
                    pokemoncaught: pokemoncaught,
                    unknownpokemon: unknownpokemon,
                    uptime: new Date() - uptime,
                    commandserverstatus: commandready ? "Connected" : "Not Connected",
                    jsonversion: (pause) ? 'Updating...' : pokedex.version,
                    botversion: version,
                    bot1: bot1data,
                    bot2: bot2data,
                    bot3: bot3data,
                    servers: servers,
                }
            });
        debuglogs = [];
        botlogs = [];
    });

    socket.on('debug', (identification, message, callback) => {
        if(!authenticatedsockets.includes(socket.id)){
            return;
        }
        
        debug(identification, message);
        callback({status: 'success', message: 'OK', data: {}});
    });

    socket.on('serverconfig', (id, callback) => {
        if(!authenticatedsockets.includes(socket.id)){
            return;
        }
        
        debug(socket.id, 'Server Config Request');
        var json = config.servers[id];
        var autocatch = json ? json.autocatch : false;
        var spam = json ? json.spam : false;
        var spamchannel = json ? json.spamchannel : "";
        var prefix = json ? json.prefix : "";
        var delay = json ? json.delay : "";
        
        callback({status: 'success', message: 'OK', data: {id: id, name: servers[id].name, autocatch: autocatch, spam: spam, spamchannel: spamchannel, prefix: prefix, delay: delay}});
    });

    socket.on('serverconfigupdate', (id, newconfig, callback) => {
        if(!authenticatedsockets.includes(socket.id)){
            return;
        }
        
        debug(socket.id, 'Server Config Update');
        config.servers[id] = newconfig;
        if(newconfig.autocatch || newconfig.spam) servers[id].active = true;
        if(!newconfig.autocatch && !newconfig.spam && newconfig.spamchannel == "" && newconfig.prefix == "" && newconfig.delay == 0){
            delete config.servers[id];
        }
        fs.writeFileSync('config.json', JSON.stringify(config));
        callback({status: 'success', message: 'OK', data: {}});
    });

    socket.on('login', async (token, configvalue, callback) => {
        if(!authenticatedsockets.includes(socket.id)){
            return;
        }
        
        login(token, configvalue, callback);
    });

    socket.on('tradepokemon', async (bot, channelid, type, callback) => {
        if(!authenticatedsockets.includes(socket.id)){
            return;
        }
        
        debug(socket.id, bot + ' Pokemon Trade Request');
        var discordbot = bot == 'bot1' ? bot1 : bot == 'bot2' ? bot2 : bot3;
        var channel, prefix;

        try{
            channel = discordbot.channels.get(channelid);
        }catch(err){
            callback({status: 'failure', message: err.toString() + '<br> Try checking your channel ID', data: {}});
            return;
        }
        if(!config.servers[channel.guild.id] || !config.servers[channel.guild.id].prefix){
            callback({status: 'failure', message: "The prefix isn't configured for this server", data: {}});
            return;
        }
        prefix = config.servers[channel.guild.id].prefix;

        await channel.send(prefix + 'accept');
        await delay(2000);

        await channel.send(prefix + 'pokemon');
        var count = await new Promise(resolve => {
            channel.awaitMessages(m => m.author.id == '365975655608745985', {max: 1, time: 10000, errors: ['time']}).then(collected => {
                resolve(parseInt(collected.first().embeds[0].footer.text.match(/Showing 1-.*? of (.*?) pokémon/)[1]));
            }).catch(() => {
                resolve('');
            });
        });

        if(count == ''){
            callback({status: 'failure', message: 'Error getting pokemon, check the channel', data: {}});
            return;
        }else if(count == 0 || count == 1){
            callback({status: 'failure', message: 'No pokemon to trade', data: {}});
        }else if(count > 200){
            count = 200;
        }

        var pokemonlist = new Array(count);
        for(var i = 0; i < pokemonlist.length; i++){
            pokemonlist[i] = i + 1;
        }

        if(count < 200) pokemonlist.pop();
        var tradesplit = splitarray(pokemonlist, 20);
        for(var split of tradesplit){
            await delay(2000);
            await channel.send(prefix + 'p add ' + split.join(' '));
        }
        await delay(3500);
        await channel.send(prefix + 'confirm');
        callback({status: 'success', message: 'OK', data: {}});
    });

    socket.on('transfercredits', async (bot, channelid, amount, callback) => {
        if(!authenticatedsockets.includes(socket.id)){
            return;
        }
        
        debug(socket.id, bot + ' Credits Trade Request');
        var discordbot = bot == 'bot1' ? bot1 : bot == 'bot2' ? bot2 : bot3;
        var channel, prefix;

        try{
            channel = discordbot.channels.get(channelid);
        }catch(err){
            callback({status: 'failure', message: err.toString() + '<br> Try checking your channel ID', data: {}});
            return;
        }
        if(!config.servers[channel.guild.id] || !config.servers[channel.guild.id].prefix){
            callback({status: 'failure', message: "The prefix isn't configured for this server", data: {}});
            return;
        }
        prefix = config.servers[channel.guild.id].prefix;

        if(amount == 'all'){
            await channel.send(prefix + 'bal');
            amount = await new Promise(resolve => {
                channel.awaitMessages(m => m.author.id == '365975655608745985', {max: 1, time: 10000, errors: ['time']}).then(collected => {
                    var embed = collected.first().embeds[0];
                    resolve(embed.description.split('have ')[1].split(' credits')[0].split(',').join(''));
                }).catch(() => {
                    resolve('');
                });
            });

            if(amount == ''){
                callback({status: 'failure', message: "Couldn't get balance, check the channel", data: {}});
                return;
            }else if(amount == '0'){
                callback({status: 'failure', message: 'No credits to transfer', data: {}});
                channel.send(prefix + 'deny');
                return;
            }
            await delay(2000);
        }
        await channel.send(prefix + 'accept');
        await delay(2000);
        await channel.send(prefix + 'c add ' + amount);
        await delay(3500);
        await channel.send(prefix + 'confirm');
        callback({status: 'success', message: amount, data: {}});
    });

    socket.on('sendmessage', (bot, channel, message, callback) => {
        if(!authenticatedsockets.includes(socket.id)){
            return;
        }
        
        debug(socket.id, bot + ' Message Send Request');
        var discordbot = bot == 'bot1' ? bot1 : bot == 'bot2' ? bot2 : bot3;
        try{
            discordbot.channels.get(channel).send(message);
        }catch(err){
            callback({status: 'failure', message: err.toString() + '<br> Try checking your channel ID', data: {}});
            return;
        }
        callback({status: 'success', message: 'OK', data: {}});
    });

    socket.on('setstatus', (bot, status, callback) => {
        if(!authenticatedsockets.includes(socket.id)){
            return;
        }
        
        debug(socket.id, bot + ' Status Change Request');
        var discordbot = (bot == 'bot1') ? bot1 : (bot == 'bot2') ? bot2 : bot3;
        discordbot.user.setStatus(status);
        callback({status: 'success', message: 'OK', data: {}});
    });

    socket.on('setavatar', async (bot, avatar, callback) => {
        if(!authenticatedsockets.includes(socket.id)){
            return;
        }
        
        debug(socket.id, bot + ' Avatar Change Request');
        var discordbot = (bot == 'bot1') ? bot1 : (bot == 'bot2') ? bot2 : bot3;
        try{
            await discordbot.user.setAvatar(avatar);
        }catch(err){
            callback({status: 'failure', message: err.toString() + '<br> Try checking your URL', data: {}});
            return;
        }
        if(bot == 'bot1') bot1data.avatar = discordbot.user.avatarURL;
        if(bot == 'bot2') bot2data.avatar = discordbot.user.avatarURL;
        if(bot == 'bot3') bot3data.avatar = discordbot.user.avatarURL;
        callback({status: 'success', message: 'OK', data: {}});
    });

    socket.on('logout', (bot, configvalue, callback) => {
        if(!authenticatedsockets.includes(socket.id)){
            return;
        }
        
        debug(socket.id, bot + ' Logout Request');
        if(bot == 'bot1'){
            bot1.destroy();
            servers = {};
            bot1 = null;
            bot1data = {username: 'No User#0000', avatar: 'https://www.torrevieja.org.uk/ext/dark1/memberavatarstatus/image/avatar.png'};
        }else if(bot == 'bot2'){
            bot2.destroy();
            bot2 = null;
            bot2data = {username: 'No User#0000', avatar: 'https://www.torrevieja.org.uk/ext/dark1/memberavatarstatus/image/avatar.png'};
        }else{
            bot3.destroy();
            bot3 = null;
            bot3data = {username: 'No User#0000', avatar: 'https://www.torrevieja.org.uk/ext/dark1/memberavatarstatus/image/avatar.png'};
        }

        config[configvalue] = "";
        fs.writeFileSync('config.json', JSON.stringify(config));
        callback({status: 'success', message: 'OK', data: {}});
    });

    socket.on('listupdate', (pokemon, list, callback) => {
        if(!authenticatedsockets.includes(socket.id)){
            return;
        }
        
        if(list == 'whitelist'){
            if(config.whitelist.includes(pokemon)){
                config.whitelist.splice(config.whitelist.indexOf(pokemon), 1);
            }else{
                config.whitelist.push(pokemon);
            }
        }else{
            if(config.blacklist.includes(pokemon)){
                config.blacklist.splice(config.blacklist.indexOf(pokemon), 1);
            }else{
                config.blacklist.push(pokemon);
            }
        }
        fs.writeFileSync('config.json', JSON.stringify(config));
        callback({status: 'success', message: 'OK', data: (list == 'whitelist') ? getWhitelist() : getBlacklist()});
    });
});

commandserver.on('connect', async () => {
    commandready = true;
    commandserver.emit('versioncheck', version, async callback => {
        if(callback.data.update){
            debug('Update', 'An update has been found for the bot, it is being downloaded...')
            var writer = fs.createWriteStream('build.zip');
            var response = await axios.get(callback.data.url, {responseType: 'stream'});
            response.data.pipe(writer);
            writer.on('close', () => {
                var zip = new AdmZip('build.zip');
                zip.extractAllToAsync('./', true, (err, fd) => {
                    debug('Update', 'Update Complete, make sure to run "npm i --only=prod"!')
                    process.exit(0);
                });
            });
        }else{
            commandserver.emit('jsonversioncheck', pokedex.version, callback => {
                if(callback.data.update){
                    debug('Update', 'An update has been found for your pokemon.json file, it is being applied...')
                    pause = true;
                    fs.unlinkSync('pokemon.json');
                    fs.writeFileSync('pokemon.json', JSON.stringify(callback.data.data));
                    pokedex = callback.data.data;
                    pause = false;
                    debug('Update', 'Update Completed!');
                }
            });
        }
    });
});

commandserver.on('debug', (identification, message, callback) => {
    debug(identification, message);
    callback({status: 'success', message: 'OK', data: {}});
});

function debug(identification, message){
    console.log(`[${identification}] ${message}`);
    debuglogs.push(`[${identification}] ${message}`);
    if(debuglogs.length > 100) debuglogs.shift();
}

function login(token, configvalue, callback = null){
    debug('Backend', configvalue + ' Initialisation Request');
    var bot = new Discord.Client();

    bot.login(token).catch(err => {
        if(callback) callback({status: 'failure', message: err.toString() + '<br> Try checking your token', data: {}});
        if(configvalue == 'token1') bot1data = {username: 'No User#0000', avatar: 'https://www.torrevieja.org.uk/ext/dark1/memberavatarstatus/image/avatar.png'};
        if(configvalue == 'token2') bot2data = {username: 'No User#0000', avatar: 'https://www.torrevieja.org.uk/ext/dark1/memberavatarstatus/image/avatar.png'};
        if(configvalue == 'token3') bot3data = {username: 'No User#0000', avatar: 'https://www.torrevieja.org.uk/ext/dark1/memberavatarstatus/image/avatar.png'};
    });

    bot.on('ready', () => {
        debug('Backend', configvalue + ' Initialised');
        switch(configvalue){
            case('token1'):
                bot1 = bot;
                bot1data = {username: bot.user.tag, avatar: bot.user.avatarURL};
                var serverjson = config.servers;
                for(var guild of bot.guilds.array()){
                    var icon = guild.iconURL;
                    if(icon && icon.includes('a_')) icon = icon.replace('.jpg', '.gif');
                    var active = false;
                    if(serverjson[guild.id] && (serverjson[guild.id].autocatch || serverjson[guild.id].spam)) active = true;
                    servers[guild.id] = {id: guild.id, name: guild.name, icon: icon, active: active, acronym: guild.nameAcronym};
                }
                break;
            case('token2'):
                bot2 = bot;
                bot2data = {username: bot.user.tag, avatar: bot.user.avatarURL};
                break;
            case('token3'):
                bot3 = bot;
                bot3data = {username: bot.user.tag, avatar: bot.user.avatarURL};
                break;
        }

        config[configvalue] = token;
        fs.writeFileSync('config.json', JSON.stringify(config));
        if(callback) callback({status: 'success', message: 'OK', data: {username: bot.user.tag, avatar: bot.user.avatarURL, servers: servers}})
    });

    if(configvalue == 'token1'){
        bot.on('message', async message => {
            if(message.author.id == '519850436899897346'){
                if(message.embeds.length != 0){
                    var embed = message.embeds[0];
                    if(embed && embed.title && embed.title.includes('wild Pokémon') && !pause){
                        var start = new Date();
                        var response = await axios.get(embed.image.url, {responseType: 'arraybuffer'});
                        var hash = await imageHash(Buffer.from(response.data, 'utf-8'));
                        var pokemon = pokedex[hash];

                        if(pokemon == undefined){
                            debug('bot1', 'Unknown Pokemon: ' + embed.image.url + ' - ' + hash);
                            unknownpokemon++;   
                            if(commandready) commandserver.emit('unrecognisedpokemon', embed.image.url, hash, () => {});
                        }

                        var serverconfig = config.servers[message.guild.id];
                        var end = new Date();
                        if(serverconfig && serverconfig.autocatch && config.autocatch){
                            if(serverconfig && serverconfig.delay) await delay(json.delay * 1000);
                            // if(config.whitelistenabled){
                            //     if(config.whitelist.includes(pokemon)){
                            //         message.channel.send(pokemon).catch(err => {});
                            //     }
                            // }else if(config.blacklistenabled){
                            //     if(!config.blacklist.includes(pokemon)){
                            //         message.channel.send(pokemon).catch(err => {});
                            //     }
                            // }else{
                            //     message.channel.send(pokemon).catch(err => {});
                            // }
                            message.channel.send(pokemon).catch(err => {});
                        }

                        average.push(end - start);
                        averagerecognitiontime = 0;
                        for(var averagedelay of average) averagerecognitiontime += averagedelay;
                        averagerecognitiontime = Math.floor(averagerecognitiontime / average.length);
                        if(average.length > 100) average.shift();
                    }else if(!embed.title && embed.description.includes(`<@${bot.user.id}>, you have caught a`)){
                        var match = embed.description.match(/caught a .*?!/)[0];
                        botlogs.push(match.charAt(0).toUpperCase() + match.slice(1));
                        if(botlogs.length > 100) botlogs.shift();
                        pokemoncaught++;
                    }
                }
            }
        });
    }
}

function getWhitelist(){
    var whitelist = {};
    // for(var pokemon of pokemonlist){
    //     pokemon = pokemon.replace('.png', '');
    //     if(pokemon == 'Type Null') pokemon = 'Type: Null';
    //     whitelist[pokemon] = config.whitelist.includes(pokemon.toLowerCase());
    // }
    return whitelist;
}

function getBlacklist(){
    var blacklist = {};
    // for(var pokemon of pokemonlist){
    //     pokemon = pokemon.replace('.png', '');
    //     if(pokemon == 'Type Null') pokemon = 'Type: Null';
    //     blacklist[pokemon] = config.blacklist.includes(pokemon.toLowerCase());
    // }
    return blacklist;
}

server.listen(3001, async () => {
    debug('Backend', 'Listening');

    if(config.token1 == ""){
        bot1data = {username: 'No User#0000', avatar: 'https://www.torrevieja.org.uk/ext/dark1/memberavatarstatus/image/avatar.png'};
    }else{
        // login(config.token1, 'token1')
    }
    if(config.token2 == ""){
        bot2data = {username: 'No User#0000', avatar: 'https://www.torrevieja.org.uk/ext/dark1/memberavatarstatus/image/avatar.png'};
    }else{
        // login(config.token2, 'token2')
    }
    if(config.token3 == ""){
        bot3data = {username: 'No User#0000', avatar: 'https://www.torrevieja.org.uk/ext/dark1/memberavatarstatus/image/avatar.png'};
    }else{
        // login(config.token3, 'token3')
    }

    setInterval(() => {
        if(config.spam && bot2){
            for(var id in config.servers){
                var server = config.servers[id];
                if(server.spam){
                    try{
                        bot2.channels.get(server.spamchannel).send(spam[Math.floor(Math.random() * spam.length - 1)]).catch(err => {});
                    }catch(err){
                        io.emit('error', `Couldn't send spam message to ${servers[id].name}<br>Server spam has been disabled`);
                        config.servers[id].spam = false;
                        if(!config.servers[id].autocatch && !config.servers[id].spam && config.servers[id].spamchannel == "" && config.servers[id].prefix == "" && config.servers[id].delay == 0){
                            delete config.servers[id];
                        }
                        fs.writeFileSync('config.json', JSON.stringify(config));
                    }
                }
            }
        }
    }, config.spaminterval);
    await delay(2500);
    setInterval(() => {
        if(config.spam && bot3){
            for(var id in config.servers){
                var server = config.servers[id];
                if(server.spam){
                    try{
                        bot3.channels.get(server.spamchannel).send(spam[Math.floor(Math.random() * spam.length - 1)]).catch(err => {console.log(err)});
                    }catch(err){
                        io.emit('error', `Couldn't send spam message to ${servers[id].name}<br>Server spam has been disabled`);
                        config.servers[id].spam = false;
                        if(!config.servers[id].autocatch && !config.servers[id].spam && config.servers[id].spamchannel == "" && config.servers[id].prefix == "" && config.servers[id].delay == 0){
                            delete config.servers[id];
                        }
                        fs.writeFileSync('config.json', JSON.stringify(config));
                    }
                }
            }
        }
    }, config.spaminterval);
});

if(fs.existsSync('./build')){
    debug('Frontend', 'Serving');
    app.listen(3000);
    app.use((req, res, next) => {
        if(config.authenticationenabled){
            var base64 = (req.headers.authorization || '').split(' ')[1] || '';
            var [username, password] = Buffer.from(base64, 'base64').toString().split(':');

            if (username && password && username == config.authentication.username && password == config.authentication.password) {
                next();
            }else{
                res.set('WWW-Authenticate', 'Basic realm="WAF-AUTH"');
                res.status(401).send('Authentication Required');
            }
        }else{
            next();
        }
    });
    app.get('/auth', (req, res) => {
        authenticatedsockets.push(req.query.socket);
        res.send('OK');
    });
    app.use('/', express.static('./build'));
}