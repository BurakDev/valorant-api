const GenericClient = require('./GenericClient');

class StandaloneClient extends GenericClient {
  async init(username, password, region = 'eu') {

  }

  async _getValorantClientVersion() {
    return (await axios.get('https://valorant-api.com/v1/version')).data.data.riotClientVersion;
  }
}

module.exports = StandaloneClient;