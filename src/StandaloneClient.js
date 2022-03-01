const GenericClient = require('./GenericClient');
const axios = require('axios').default;
const axiosCookieJarSupport = require('axios-cookiejar-support').default;
const tough = require('tough-cookie');
const https = require('https');

const ciphers = [
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256',
    'TLS_AES_256_GCM_SHA384',
    'TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256'
];

const httpsAgent = new https.Agent({
  ciphers: ciphers.join(':'),
  honorCipherOrder: true,
  minVersion: 'TLSv1.2'
});

axiosCookieJarSupport(axios);

class StandaloneClient extends GenericClient {
  constructor(username, password) {
    super();

    this._username = username;
    this._password =password;
  }

  async init(region = 'eu') {
    this._region = region;
    await this._buildHeaders();
  }

  async _getValorantClientVersion() {
    return (await axios.get('https://valorant-api.com/v1/version')).data.data.riotClientVersion;
  }

  async _buildHeaders() {
    const cookieJar = new tough.CookieJar();

    let data = {
      'client_id': 'play-valorant-web-prod',
      'nonce': '1',
      'redirect_uri': 'https://playvalorant.com/opt_in',
      'response_type': 'token id_token',
    };

    let response = await axios.post('https://auth.riotgames.com/api/v1/authorization', data, {
      jar: cookieJar,
      withCredentials: true,
      headers: {
        'User-Agent': 'RiotClient/43.0.1.4195386.4190634 rso-auth (Windows; 10;;Professional, x64)'
      },
      httpsAgent: httpsAgent
    });

    data = {
      'type': 'auth',
      'username': this._username,
      'password': this._password
    };

    response = await axios.put('https://auth.riotgames.com/api/v1/authorization', data, {
      jar: cookieJar,
      withCredentials: true,
      headers: {
        'User-Agent': 'RiotClient/43.0.1.4195386.4190634 rso-auth (Windows; 10;;Professional, x64)'
      },
      httpsAgent: httpsAgent
    });

    let uri = response.data.response.parameters.uri;
    let strTokens = uri.replace('https://playvalorant.com/opt_in#', '').split('&');

    let arrayTokens = {};

    strTokens.forEach(token => {
      arrayTokens[token.split('=')[0]] = token.split('=')[1];
    });

    var accessToken = arrayTokens.access_token;

    let headers = {
      'Authorization': `Bearer ${arrayTokens.access_token}`,
      'User-Agent': 'RiotClient/43.0.1.4195386.4190634 rso-auth (Windows; 10;;Professional, x64)'
    };

    response = await axios.post('https://entitlements.auth.riotgames.com/api/token/v1', {}, {
      jar: cookieJar,
      withCredentials: true,
      headers,
      httpsAgent: httpsAgent
    });

    var entitlementsToken = response.data.entitlements_token;

    response = await axios.post('https://auth.riotgames.com/userinfo', {}, {
      jar: cookieJar,
      withCredentials: true,
      headers,
      httpsAgent: httpsAgent
    });

    this.puuid = response.data.sub;

    this.remoteHeaders = {
      'Authorization': 'Bearer ' + accessToken,
      'X-Riot-Entitlements-JWT': entitlementsToken,
      'X-Riot-ClientPlatform': 'ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9',
      'X-Riot-ClientVersion': await this._getValorantClientVersion()
    };
  }
}

module.exports = StandaloneClient;