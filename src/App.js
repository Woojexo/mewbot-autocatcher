import React, {Component} from 'react';
import Swal from 'sweetalert2';
import { Scrollbars } from 'react-custom-scrollbars';
import io from 'socket.io-client';
import * as delay from 'delay';

class CustomScrollbars extends Component{
    constructor(props, ...rest){
        super(props, ...rest);
        this.renderThumb = this.renderThumb.bind(this);
        this.renderView = this.renderView.bind(this);
    }

    renderView({style, ...props}){
        const viewStyle = {
            overflowX: 'hidden',
            overflowY: 'scroll'
        }
        return(
            <div className="box" style={{...style, ...viewStyle}} {...props}/>
        )
    }

    renderThumb({style, ...props}){
        const thumbStyle = {
            backgroundColor: 'white',
            borderRadius: '3px'
        }
        return(
            <div style={{...style, ...thumbStyle }} {...props}/>
        )
    }

    render(){
        return(
            <Scrollbars autoHide={false} renderView={this.renderView} renderThumbHorizontal={this.renderThumb} renderThumbVertical={this.renderThumb} {...this.props}/>
        )
    }
}

class App extends Component{
    constructor(){
        super();
        this.websocket = io('ws://' + window.location.hostname + ':3001/');

        this.state = {
            config: null,
            bot1: null,
            bot2: null,
            bot3: null,
            servers: null,
            botlogs: [],
            debuglogs: [],
            averagerecognitiontime: 0,
            pokemoncaught: 0,
            pinglatency: 0,
            unknownpokemon: 0,
            uptime: 0,
            commandserverstatus: 'Not Connected',
            jsonversion: '0.0.0',
            botversion: '0.0.0',
            blacklist: {},
            whitelist: {}
        }

        this.websocket.once('connect', () => {
            this.websocket.emit('init', response => {

                this.setState({config: response.data.config, whitelist: response.data.whitelist, blacklist: response.data.blacklist}, () => {this.ping()});
            });
        });

        this.websocket.on('error', error => {
            Swal.fire({
                title: 'Error',
                html: error,
                icon: 'error',
                allowEnterKey: true
            });
        });

        this.websocket.once('disconnect', () => {
            window.location.reload();
        });
    }

    async ping(){
        var pingstart = new Date();
        this.websocket.emit('dataping', async result => {
            var pingend = new Date();
            var uptime = new Date(result.data.uptime).toISOString().substring(11, 19);

            var newstate = {
                botlogs: this.state.botlogs,
                debuglogs: this.state.debuglogs,
                pinglatency: (pingend - pingstart),
                averagerecognitiontime: result.data.averagerecognitiontime,
                pokemoncaught: result.data.pokemoncaught,
                unknownpokemon: result.data.unknownpokemon,
                uptime: uptime,
                commandserverstatus: result.data.commandserverstatus,
                jsonversion: result.data.jsonversion,
                botversion: result.data.botversion,
                bot1: result.data.bot1,
                bot2: result.data.bot2,
                bot3: result.data.bot3,
                servers: result.data.servers
            };

            for(var id in newstate.servers){
                var server = newstate.servers[id];
                if(!server.icon) server.icon = this.serverIcon(server.acronym);
                newstate.servers[id] = server;
            }

            if(result.data.botlogs.length !== 0){
                result.data.botlogs.forEach(log => {
                    if(this.state.config.botlogs) newstate.botlogs.push(log);
                });
            }
            if(result.data.debuglogs.length !== 0){
                result.data.debuglogs.forEach(log => {
                    if(this.state.config.debuglogs) newstate.debuglogs.push(log);
                });
            }

            if(result.data.botlogs.length !== 0 || result.data.debuglogs.length !== 0) {
                this.setState({newstate});
                var parent = document.getElementsByClassName('debuglogs')[0].lastChild.firstChild.firstChild;
                parent.scrollTop = parent.scrollHeight;
                parent = document.getElementsByClassName('botlogs')[0].lastChild.firstChild.firstChild;
                parent.scrollTop = parent.scrollHeight;
            }else{
                this.setState(newstate);
            }
            await delay(1000);
            this.ping();
        });
    }

    updateConfig(value, data){
        if(value === 'spam' && data === true){
            Swal.fire({
                title: 'Spam Interval',
                input: 'text',
                showCancelButton: true,
                reverseButtons: true,
                allowEnterKey: true,
                inputPlaceholder: 'Spam Interval(seconds)',
                confirmButtonText: 'Set Spam Interval',
                cancelButtonColor: '#d33',
                confirmButtonColor: '#10AA10',
                inputValidator: input => {
                    if(isNaN(input)) return "Spam Interval must be number";
                    if(parseInt(input) < 0) return "Spam Interval must be a number above 0";
                }
            }).then(result => {
                if(result.value){
                    if(result.value === "") result.value = "0";
                    result.value = parseInt(result.value) * 1000;
                    var oldconfig = this.state.config;
                    oldconfig[value] = data;
                    this.setState({config: oldconfig});
                    this.websocket.emit('configupdate', 'spaminterval', result.value, () => {
                        this.websocket.emit('configupdate', value, data, () => {
                            return;
                        });
                    });
                }
            });
        }else{
            var oldconfig = this.state.config;
            oldconfig[value] = data;
            this.setState({config: oldconfig});
            this.websocket.emit('configupdate', value, data, () => {
                return;
            });
        }
    }

    updateServer(server){
        Swal.fire({
            title: server.name + ' Config',
            html: `
            <input id="swal2-autocatch" type="checkbox" ${server.autocatch ? "checked" : ""}/>
            <label for="swal2-autocatch">Autocatch</label>&nbsp;
            <input id="swal2-spam" type="checkbox" ${server.spam ? "checked" : ""}/>
            <label for="swal2-spam">Spam</label><br>
            <input id="swal2-spamchannel" type="textbox" class="swal2-input" placeholder="Spam Channel(ID)" style="margin: 0.5vw auto" value="${server.spamchannel}">
            <input id="swal2-prefix" type="textbox" class="swal2-input" placeholder="Mewbot Prefix" style="margin: 0.5vw auto" value="${server.prefix}">
            <input id="swal2-delay" type="textbox" class="swal2-input" placeholder="Autocatch Delay(seconds)" style="margin: 0.5vw auto" value="${server.delay}">
            `,
            showCancelButton: true,
            reverseButtons: true,
            allowEnterKey: true,
            confirmButtonText: 'Update Settings',
            cancelButtonColor: '#d33',
            confirmButtonColor: '#10AA10',
            preConfirm: () => {
                return{
                    id: server.id,
                    autocatch: document.getElementById('swal2-autocatch').checked,
                    spam: document.getElementById('swal2-spam').checked,
                    spamchannel: document.getElementById('swal2-spamchannel').value,
                    prefix: document.getElementById('swal2-prefix').value,
                    delay: document.getElementById('swal2-delay').value
                };
            }
        }).then(result => {
            if(result.value){
                var failed = "";
                if(result.value.spam){
                    if(result.value.spamchannel.length !== 18) failed += "Spam Channel ID must be 18 characters<br>";
                }
                if(result.value.autocatch){
                    if(isNaN(result.value.delay)) failed += "Delay must be a number<br>";
                    if(parseFloat(result.value.delay) < 0) failed += "Delay must be a number above 0<br>";
                    if(result.value.delay === "") result.value.delay = "0";
                    result.value.delay = parseFloat(result.value.delay);
                }
                if(failed !== ""){
                    Swal.fire({
                        title: 'Error',
                        html: failed,
                        icon: 'error',
                        allowEnterKey: true
                    });
                }else{
                    this.websocket.emit('serverconfigupdate', result.value.id, result.value, () => {
                        var updatedservers = this.state.servers;
                        if(result.value.autocatch || result.value.spam){
                            updatedservers[server.id].active = true;
                        }else{
                            updatedservers[server.id].active = false;
                        }
                        this.setState({servers: updatedservers});
                        Swal.fire({
                            title: 'Success',
                            html: 'Settings Updated!',
                            icon: 'success',
                            allowEnterKey: true
                        });
                    });
                }
            }
        });
    }

    loading(color = '000'){
        return(
            <div style={{fontSize: '2vw', fontFamily: 'caviar_dreamsregular', color: '#' + color}}>Loading...</div>
        )
    }

    updatebot(configvalue, statevalue){
        if(this.state[statevalue].username === 'No User#0000'){
            Swal.fire({
                title: 'Bot Login',
                showCancelButton: true,
                reverseButtons: true,
                allowEnterKey: true,
                confirmButtonText: 'Login',
                cancelButtonColor: '#d33',
                confirmButtonColor: '#10AA10',
                input: 'text',
                inputPlaceholder: 'Token',
                inputValidator: input => {
                    var match = input.match(/.{24}\..{6}\..{27}/);
                    if(!match) return 'Invalid token format!'
                }
            }).then(result => {
                if(result.value){
                    this.websocket.emit('login', result.value, configvalue, callback => {
                        if(callback.status === 'success'){
                            Swal.fire({
                                title: 'Success',
                                html: 'Token Valid',
                                icon: 'success',
                                allowEnterKey: true
                            });
                        }else{
                            Swal.fire({
                                title: 'Error',
                                html: callback.message,
                                icon: 'error',
                                allowEnterKey: true
                            });
                        }
                    });
                }
            });
        }else{
            Swal.fire({
                title: 'Execute Command',
                showCancelButton: true,
                reverseButtons: true,
                allowEnterKey: true,
                confirmButtonText: 'Next',
                cancelButtonColor: '#d33',
                confirmButtonColor: '#10AA10',
                input: 'select',
                // inputOptions: ['Send Message', 'Change Status', 'Change Avatar', 'Trade Pokemon', 'Trade Credits', 'Logout']
                inputOptions: ['Send Message', 'Change Status', 'Change Avatar', 'Logout']
            }).then(result => {
                if(result.value){
                    if(result.value === "0"){
                        Swal.fire({
                            title: 'Send Message',
                            html: `
                            <input id="swal2-sendmessage-message" type="textbox" class="swal2-input" placeholder="Message" style="margin: 0.5vw auto">
                            <input id="swal2-sendmessage-channel" type="textbox" class="swal2-input" placeholder="Channel ID" style="margin: 0.5vw auto">
                            `,
                            showCancelButton: true,
                            reverseButtons: true,
                            allowEnterKey: true,
                            confirmButtonText: 'Send Message',
                            cancelButtonColor: '#d33',
                            confirmButtonColor: '#10AA10',
                            preConfirm: () => {
                                return{
                                    message: document.getElementById('swal2-sendmessage-message').value,
                                    channel: document.getElementById('swal2-sendmessage-channel').value,
                                };
                            }
                        }).then(result => {
                            if(result.value){
                                var failed = "";
                                if(result.value.message === '') failed += "Message must not be empty<br>";
                                if(result.value.channel.length !== 18) failed += "Channel ID must be 18 characters<br>";
                                if(failed !== ""){
                                    Swal.fire({
                                        title: 'Error',
                                        html: failed,
                                        icon: 'error',
                                        allowEnterKey: true
                                    });
                                }else{
                                    this.websocket.emit('sendmessage', statevalue, result.value.channel, result.value.message, callback => {
                                        if(callback.status === 'success'){
                                            Swal.fire({
                                                title: 'Success',
                                                html: 'Message Sent!',
                                                icon: 'success',
                                                allowEnterKey: true
                                            });
                                        }else{
                                            Swal.fire({
                                                title: 'Error',
                                                html: callback.message,
                                                icon: 'error',
                                                allowEnterKey: true
                                            });
                                        }
                                    });
                                }
                            }
                        });
                    }else if(result.value === "1"){
                        Swal.fire({
                            title: 'Change Status',
                            showCancelButton: true,
                            reverseButtons: true,
                            allowEnterKey: true,
                            confirmButtonText: 'Change Status',
                            cancelButtonColor: '#d33',
                            confirmButtonColor: '#10AA10',
                            input: 'select',
                            inputOptions: ['Online', 'Idle', 'Do Not Disturb', 'Invisible']
                        }).then(result => {
                            if(result.value){
                                this.websocket.emit('setstatus', statevalue, result.value === "0" ? "online" : result.value === "1" ? "idle" : result.value === "2" ? "dnd" : "invisible", () => {
                                    Swal.fire({
                                        title: 'Success',
                                        html: 'Status Changed!',
                                        icon: 'success',
                                        allowEnterKey: true
                                    });
                                });
                            }
                        });
                    }else if(result.value === "2"){
                        Swal.fire({
                            title: 'Change Avatar',
                            showCancelButton: true,
                            reverseButtons: true,
                            allowEnterKey: true,
                            confirmButtonText: 'Change Avatar',
                            cancelButtonColor: '#d33',
                            confirmButtonColor: '#10AA10',
                            input: 'text',
                            inputPlaceholder: 'Avatar URL'
                        }).then(result => {
                            if(result.value){
                                this.websocket.emit('setavatar', statevalue, result.value, callback => {
                                    if(callback.status === 'success'){
                                        Swal.fire({
                                            title: 'Success',
                                            html: 'Avatar Changed!',
                                            icon: 'success',
                                            allowEnterKey: true
                                        });
                                    }else{
                                        Swal.fire({
                                            title: 'Error',
                                            html: callback.message,
                                            icon: 'error',
                                            allowEnterKey: true
                                        });
                                    }
                                });
                            }
                        });
                    // }else if(result.value === "3"){
                    //     Swal.fire({
                    //         title: 'Trade Pokemon',
                    //         html: `
                    //         Make sure you have sent the bot a trade request
                    //         <br>
                    //         <select id="swal2-tradepokemon-type" class="swal2-select" style="display: flex; margin: 5px 0px !important;">
                    //             <option value="0">All</option>
                    //             <option value="1">Mythical</option>
                    //             <option value="2">Legendary</option>
                    //             <option value="3">Shiny</option>
                    //             <option value="4">Alolan</option>
                    //             <option value="5">Galarian</option>
                    //         </select>
                    //         <input id="swal2-tradepokemon-channel" type="textbox" class="swal2-input" placeholder="Channel ID" style="margin: 0.5vw auto">
                    //         `,
                    //         showCancelButton: true,
                    //         reverseButtons: true,
                    //         allowEnterKey: true,
                    //         confirmButtonText: 'Start',
                    //         cancelButtonColor: '#d33',
                    //         confirmButtonColor: '#10AA10',
                    //         preConfirm: () => {
                    //             return{
                    //                 type: document.getElementById('swal2-tradepokemon-type').options[document.getElementById('swal2-tradepokemon-type').selectedIndex].text,
                    //                 channel: document.getElementById('swal2-tradepokemon-channel').value,
                    //             };
                    //         }
                    //     }).then(result => {
                    //         if(result.value){
                    //             Swal.fire({
                    //                 title: 'Success',
                    //                 html: 'Started trading, this may take a minute...',
                    //                 icon: 'success',
                    //                 allowEnterKey: true
                    //             });
                    //             this.websocket.emit('tradepokemon', statevalue, result.value.channel, result.value.type, callback => {
                    //                 if(callback.status !== 'success'){
                    //                     Swal.fire({
                    //                         title: 'Error',
                    //                         html: callback.message,
                    //                         icon: 'error',
                    //                         allowEnterKey: true
                    //                     });
                    //                 }else{
                    //                     Swal.fire({
                    //                         title: 'Success',
                    //                         html: 'Trading Complete!',
                    //                         icon: 'success',
                    //                         allowEnterKey: true
                    //                     });
                    //                 }
                    //             });
                    //         }
                    //     });
                    // }else if(result.value === "4"){
                    //     Swal.fire({
                    //         title: 'Trade Credits',
                    //         html:
                    //         `
                    //         Make sure you have sent the bot a trade request
                    //         <input id="swal2-transfercredits-amount" type="textbox" class="swal2-input" placeholder="Amount(Leave blank for all)" style="margin: 0.5vw auto">
                    //         <input id="swal2-transfercredits-channel" type="textbox" class="swal2-input" placeholder="Channel ID" style="margin: 0.5vw auto">
                    //         `,
                    //         showCancelButton: true,
                    //         reverseButtons: true,
                    //         allowEnterKey: true,
                    //         confirmButtonText: 'Trade',
                    //         cancelButtonColor: '#d33',
                    //         confirmButtonColor: '#10AA10',
                    //         preConfirm: () => {
                    //             return{
                    //                 amount: (document.getElementById('swal2-transfercredits-amount').value === "") ? "all" : document.getElementById('swal2-transfercredits-amount').value,
                    //                 channel: document.getElementById('swal2-transfercredits-channel').value,
                    //             };
                    //         }
                    //     }).then(result => {
                    //         if(result.value){
                    //             var failed = "";
                    //             if(isNaN(result.value.amount) && result.value.amount !== "all") failed += "Amount must be a number<br>";
                    //             if(parseInt(result.value.amount) <= 0 && result.value.amount !== "all") failed += "Amount must be a number above 0<br>";
                    //             if(result.value.channel.length !== 18) failed += "Channel ID must be 18 characters<br>";
                    //             if(failed !== ""){
                    //                 Swal.fire({
                    //                     title: 'Error',
                    //                     html: failed,
                    //                     icon: 'error',
                    //                     allowEnterKey: true
                    //                 });
                    //             }else{
                    //                 this.websocket.emit('transfercredits', statevalue, result.value.channel, result.value.amount, callback => {
                    //                     if(callback.status === 'success'){
                    //                         Swal.fire({
                    //                             title: 'Success',
                    //                             html: 'Credits Transferred!',
                    //                             icon: 'success',
                    //                             allowEnterKey: true
                    //                         });
                    //                     }else{
                    //                         Swal.fire({
                    //                             title: 'Error',
                    //                             html: callback.message,
                    //                             icon: 'error',
                    //                             allowEnterKey: true
                    //                         });
                    //                     }
                    //                 });
                    //             }
                    //         }
                    //     });
                    // }else if(result.value === "5"){
                    }else if(result.value === "3"){
                        Swal.fire({
                            title: 'Are you sure?',
                            showCancelButton: true,
                            reverseButtons: true,
                            allowEnterKey: true,
                            confirmButtonText: 'Logout',
                            cancelButtonColor: '#d33',
                            confirmButtonColor: '#10AA10'
                        }).then(result => {
                            if(result.value){
                                this.websocket.emit('logout', statevalue, configvalue, () => {
                                    var newstate = {};
                                    newstate[statevalue] = null;
                                    newstate.config = this.state.config;
                                    newstate.config[configvalue] = "";
                                    if(statevalue === 'bot1') newstate.servers = null;
                                    this.setState(newstate);
                                    Swal.fire({
                                        title: 'Success',
                                        html: 'Logged Out!',
                                        icon: 'success',
                                        allowEnterKey: true
                                    });
                                });
                            }
                        });
                    }
                }
            });
        }
    }

    serverIcon(acronym){
        var canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        var editablecanvas = canvas.getContext('2d');
        editablecanvas.font = '50px caviar_dreamsregular';
        editablecanvas.fillStyle = '#fff';
        editablecanvas.textAlign = 'center';
        editablecanvas.textBaseline = 'middle';
        editablecanvas.fillText(acronym, 64, 64);
        return(canvas.toDataURL('image/png'));
    }

    listUpdate(list, pokemon){
        this.websocket.emit('listupdate', pokemon.toLowerCase(), list, response => {
            var newstate = {}
            newstate[list] = response.data;
            this.setState(newstate);
        });
    }

    loaded(){
        return(
            <div className="App">
                <center><h1 className="test">Mewbot Autocatcher - By RussianWaffles</h1></center>
                <div className="bots">
                    <center><h2>Bots</h2></center>
                    <div className="frame">
                        {!this.state.bot1 ? <div className="bot">{this.loading('fff')}</div> : (
                            <div className="bot">
                                <div className="avatar">
                                    <img src={this.state.bot1.avatar} alt="Avatar" onClick={() => {this.updatebot('token1', 'bot1')}}/>
                                </div>
                                <div className="username">
                                    {this.state.bot1.username}
                                </div>
                            </div>
                        )}
                        {!this.state.bot2 ? <div className="bot">{this.loading('fff')}</div> : (
                            <div className="bot">
                                <div className="avatar">
                                    <img src={this.state.bot2.avatar} alt="Avatar"onClick={() => {this.updatebot('token2', 'bot2')}}/>
                                </div>
                                <div className="username">
                                    {this.state.bot2.username}
                                </div>
                            </div>
                        )}
                        {!this.state.bot3 ? <div className="bot">{this.loading('fff')}</div> : (
                            <div className="bot">
                                <div className="avatar">
                                    <img src={this.state.bot3.avatar} alt="Avatar"onClick={() => {this.updatebot('token3', 'bot3')}}/>
                                </div>
                                <div className="username">
                                    {this.state.bot3.username}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="servers">
                    <center><h2>Servers</h2></center>
                    <div className="frame">
                        <CustomScrollbars>
                        {!this.state.servers ? <></> : Object.values(this.state.servers).map(server =>
                            <div className="server" key={server.id} onClick={() => {this.websocket.emit('serverconfig', server.id, result => {this.updateServer(result.data)})}}>
                                <img src={server.icon} alt="Icon"/>
                                {!server.active ? <></> : (<div><div className="overlay"></div><i className="fas fa-check"></i></div>)}
                            </div>
                        )}
                        </CustomScrollbars>
                    </div>
                </div>
                <div className="options">
                    <center><h2>Options</h2></center>
                    <div className="frame">
                        <div className="option">
                            <input id="autocatch" type="checkbox" checked={(this.state.config.autocatch) ? true : false} onChange={(e) => {this.updateConfig("autocatch", e.currentTarget.checked)}}/>
                            <label htmlFor="autocatch">Autocatch</label>
                        </div>
                        <div className="option">
                            <input id="spam" type="checkbox" checked={(this.state.config.spam) ? true : false} onChange={(e) => {this.updateConfig("spam", e.currentTarget.checked)}}/>
                            <label htmlFor="spam">Spam</label>
                        </div>
                        <div className="option">
                            <input id="botlogs" type="checkbox" checked={(this.state.config.botlogs) ? true : false} onChange={(e) => {this.updateConfig("botlogs", e.currentTarget.checked); this.setState({botlogs: []})}}/>
                            <label htmlFor="botlogs">Bot Logs</label>
                        </div>
                        <div className="option">
                            <input id="debuglogs" type="checkbox" checked={(this.state.config.debuglogs) ? true : false} onChange={(e) => {this.updateConfig("debuglogs", e.currentTarget.checked); this.setState({debuglogs: []})}}/>
                            <label htmlFor="debuglogs">Debug Logs</label>
                        </div>
                        {/* <div className="option">
                            <input id="blacklist" type="checkbox" checked={(this.state.config.blacklistenabled) ? true : false} onChange={(e) => {this.updateConfig("blacklistenabled", e.currentTarget.checked); if(this.state.config.whitelistenabled) this.updateConfig("whitelistenabled", false)}}/>
                            <label htmlFor="blacklist">Blacklist</label>
                        </div>
                        <div className="option">
                            <input id="whitelist" type="checkbox" checked={(this.state.config.whitelistenabled) ? true : false} onChange={(e) => {this.updateConfig("whitelistenabled", e.currentTarget.checked); if(this.state.config.blacklistenabled) this.updateConfig("blacklistenabled", false)}}/>
                            <label htmlFor="whitelist">Whitelist</label>
                        </div> */}
                    </div>
                </div>
                <div className="botlogs">
                    <center><h2>Bot Logs</h2></center>
                    <div className="frame">
                        <CustomScrollbars>
                            {!this.state.botlogs ? <></> : this.state.botlogs.map((log, index) => (
                                <div className="log" key={index}>
                                    <p>{log}</p>
                                </div>
                            ))}
                        </CustomScrollbars>
                    </div>
                </div>
                <div className="debuglogs">
                    <center><h2>Debug Logs</h2></center>
                    <div className="frame">
                        <CustomScrollbars>
                            {!this.state.debuglogs ? <></> : this.state.debuglogs.map((log, index) => (
                                <div className="log" key={index}>
                                    <p>{log}</p>
                                </div>
                            ))}
                        </CustomScrollbars>
                    </div>
                </div>
                <div className="stats">
                    <center><h2>Statistics</h2></center>
                    <div className="frame" style={{color: 'white', fontFamily: 'caviar_dreamsregular'}}>
                        Average Recognition Time: {this.state.averagerecognitiontime + 'ms'}
                        <br/>
                        Pokemon Caught: {this.state.pokemoncaught}
                        <br/>
                        Uptime: {this.state.uptime}
                        <br/>
                        Unknown Pokemon: {this.state.unknownpokemon}
                        <br/>
                        Ping Latency: {this.state.pinglatency + 'ms'}
                        <br/>
                        Command Server: {this.state.commandserverstatus}
                        <br/>
                        JSON Version: {this.state.jsonversion}
                        <br/>
                        Bot Version: {this.state.botversion}
                    </div>
                </div>
                {/* <div className="blacklist">
                    <center><h2>Blacklist</h2></center>
                    <div className="frame">
                        <CustomScrollbars>
                        {Object.entries(this.state.blacklist).map(entry => (
                            <div className="pokemon" key={"whitelist" + entry[0]} onClick={() => {this.listUpdate('blacklist', entry[0])}}>
                                <img src={'pokemon/' + (entry[0] !== 'Type: Null' ? entry[0] : 'Type Null') + '.png'} alt={entry[0]}/>
                                {!entry[1] ? <></> : (<div><div className="overlay"></div><i className="fas fa-check"></i></div>)}
                                <div className="name">{entry[0]}</div>
                            </div>
                        ))}
                    </CustomScrollbars>
                    </div>
                </div> */}
                {/* <div className="whitelist">
                    <center><h2>Whitelist</h2></center>
                    <div className="frame">
                        <CustomScrollbars>
                        {Object.entries(this.state.whitelist).map(entry => (
                            <div className="pokemon" key={"blacklist" + entry[0]} onClick={() => {this.listUpdate('whitelist', entry[0])}}>
                                <img src={'pokemon/' + (entry[0] !== 'Type: Null' ? entry[0] : 'Type Null') + '.png'} alt={entry[0]}/>
                                {!entry[1] ? <></> : (<div><div className="overlay"></div><i className="fas fa-check"></i></div>)}
                                <div className="name">{entry[0]}</div>
                            </div>
                        ))}
                        </CustomScrollbars>
                    </div>
                </div> */}
            </div>
        )
    }

    render(){
        return(
            <>
                {this.state.config ? this.loaded() : this.loading()}
            </>
        );
    }
}

export default App;
