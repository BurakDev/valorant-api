const GenericClient = require('./GenericClient');
const LocalWebsocket = require('./LocalWebsocket');

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const https = require('https');

class LocalClient extends GenericClient {
  constructor(lockfilePath = path.join(process.env['LOCALAPPDATA'], 'Riot Games\\Riot Client\\Config\\lockfile')) {
    super();

    this._lockfilePath = lockfilePath;
  }

  async init(region = 'eu') {
    this._region = region;
    this._lockfile = await this._getLockfileData();
    await this._buildHeaders();
  }

  async _getLockfileData() {
    const contents = await fs.promises.readFile(this._lockfilePath, 'utf8');

    let d = {};
    [d.name, d.pid, d.port, d.password, d.protocol] = contents.split(':');

    return d;
  }

  async _getValorantClientVersion() {
    let version = (await fs.promises.readFile(path.join(process.env.LOCALAPPDATA, '/VALORANT/Saved/Logs/ShooterGame.log'), 'utf8')).match(/CI server version: (.+)/)[1].split('-');
    version.splice(2, 0, 'shipping');

    return version.join('-');
  }

  async _buildHeaders() {
    this.localHeaders = {
      'Authorization': 'Basic ' + Buffer.from(`riot:${this._lockfile.password}`, 'utf8').toString('base64'),
      'X-Riot-ClientVersion': await this._getValorantClientVersion(),
      'Content-Type': 'application/json',
      'rchat-blocking': true
    };

    let response = await axios.get(`${this._lockfile.protocol}://127.0.0.1:${this._lockfile.port}/entitlements/v1/token`, {
      headers: this.localHeaders,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });

    this.puuid = response.data.subject;

    this.remoteHeaders = {
      'Authorization': 'Bearer ' + response.data.accessToken,
      'X-Riot-Entitlements-JWT': response.data.token,
      'X-Riot-ClientPlatform': 'ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9',
      'X-Riot-ClientVersion': await this._getValorantClientVersion()
    };
  }

  async initializeWebsocket() {
    return new LocalWebsocket(this._lockfile);
  }

  async logout() {
    return await this.fetch('/rso-auth/v1/session', 'local', 'delete');
  }

  async login(username, password, persistLogin = false) {
    return await this.fetch('/rso-auth/v1/session/credentials', {
      'username': username,
      'password': password,
      'persistLogin': persistLogin
    });
  }

  async getHelp() {
    return await this.fetch('/help', 'local');
  }

  async getPresences() {
    let presences = await this.fetch('/chat/v4/presences', 'local');

    return presences.presences.filter(presence => presence.product == 'valorant').map(presence => {
      presence.private = JSON.parse(Buffer.from(presence.private, 'base64').toString());

      return presence;
    });
  }

  async getPresence(puuid) {
    let presences = await this.getPresences();

    return presences.find(presence => presence.puuid == (puuid ? puuid : this.puuid));
  }

  async getFriends() {
    let friends = await this.fetch('/chat/v4/friends', 'local');

    return friends.friends;
  }

  async getFriendRequests() {
    return await this.fetch('/chat/v4/friendrequests', 'local');
  }

  async removeFriendRequest(puuid) {
    return await this.fetch('/chat/v4/friendrequests', 'local', 'delete', {
      'puuid': puuid
    });
  }

  async addFriend(gameName, gameTag) {
    return await this.fetch('/chat/v4/friendrequests', 'local', 'post', {
      'game_name': gameName,
      'game_tag': gameTag
    });
  }

  async removeFriend(puuid) {
    return await this.fetch('/chat/v4/friends', 'local', 'delete', {
      'puuid': puuid
    });
  }

  async sendMessage(message, cid) {
    return await this.fetch('/chat/v5/messages', 'local', 'post', {
      'message': message,
      'cid': cid
    });
  }
}

module.exports = LocalClient;