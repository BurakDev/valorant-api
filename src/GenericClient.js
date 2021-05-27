const axios = require('axios');
const https = require('https');

class GenericClient {
  async fetch(endpoint, endpointType, method = 'GET', data = null) {
    try {
      if (endpointType == 'local') {
        var axiosEndpoint = `${this._lockfile.protocol}://127.0.0.1:${this._lockfile.port}${endpoint}`;
        var axiosHeaders = this.localHeaders;
      } else if (endpointType == 'glz') {
        var axiosEndpoint = `https://glz-${this._region}-1.${this._region}.a.pvp.net${endpoint}`;
        var axiosHeaders = this.remoteHeaders;
      } else if (endpointType == 'pd') {
        var axiosEndpoint = `https://pd.${this._region}.a.pvp.net${endpoint}`;
        var axiosHeaders = this.remoteHeaders;
      }

      let response = await axios.request(axiosEndpoint, {
        method: method.toUpperCase(),
        headers: axiosHeaders,
        httpsAgent: new https.Agent({
            rejectUnauthorized: false
        }),
        data: data
      });

      return response.data;
    } catch (e) {
      if (e.response && e.response.status && e.response.status == 400) {
        await this._buildHeaders();
        return await this.fetch(endpoint, endpointType);
      } else {
        console.error('UNHANDLER ERROR', e);
      }
    }
  }

  async fetchContracts() {
    return await this.fetch(`/contracts/v1/contracts/${this.puuid}`, 'pd');
  }

  async fetchContractDefinitions() {
    return await this.fetch('/contract-definitions/v2/definitions', 'pd');
  }

  async activateContract(contractId) {
    return await this.fetch(`/contracts/v1/contracts/${this.puuid}/special/${contractId}`, 'pd');
  }

  async fetchActiveBattlePass() {
    return await this.fetch('/contract-definitions/v2/definitions/story', 'pd');
  }

  async coregameFetchPlayer() {
    return await this.fetch(`/core-game/v1/players/${this.puuid}`, 'glz');
  }

  async coregameFetchMatch(matchId) {
    return await this.fetch(`/core-game/v1/matches/${matchId}`, 'glz');
  }

  async coregameFetchMatchLoadouts(matchId) {
    return await this.fetch(`/core-game/v1/matches/${matchId}/loadouts`, 'glz');
  }

  async fetchMatchDetails(matchId) {
    return await this.fetch(`/match-details/v1/matches/${matchId}`, 'pd');
  }

  async fetchMatchHistory(puuid, startIndex = 0, endIndex = 15, queueId) {
    puuid = puuid ? puuid : this.puuid;

    return await this.fetch(`/match-history/v1/history/${puuid}?startIndex=${startIndex}&endIndex=${endIndex}` + (queueId ? `&queue=${queueId}` : ''), 'pd');
  }

  async fetchMMR(puuid) {
    puuid = puuid ? puuid : this.puuid;

    return await this.fetch(`/mmr/v1/players/${puuid}`, 'pd');
  }

  async fetchCompetitiveUpdates(puuid, startIndex = 0, endIndex = 15, queueId) {
    puuid = puuid ? puuid : this.puuid;

    return await this.fetch(`/mmr/v1/players/${puuid}/competitiveupdates?startIndex=${startIndex}&endIndex=${endIndex}` + (queueId ? `&queue=${queueId}` : ''), 'pd');
  }

  async fetchLeaderboard(seasonId, startIndex = 0, size = 1000) {
    return await this.fetch(`/mmr/v1/leaderboards/affinity/${this._region}/queue/competitive/season/${seasonId}?startIndex=${startIndex}&size=${size}`, 'pd');
  }

  async fetchPlayerLoadout(puuid) {
    puuid = puuid ? puuid : this.puuid;

    return await this.fetch(`/personalization/v2/players/${puuid}/playerloadout`, 'pd');
  }

  async fetchPartyFromPuuid(puuid) {
    puuid = puuid ? puuid : this.puuid;

    return await this.fetch(`/parties/v1/players/${puuid}`, 'glz');
  }

  async fetchPartyFromPartyId(partyId) {
    return await this.fetch(`/parties/v1/parties/${partyId}`, 'glz');
  }

  async fetchPartyCustomGameConfigs(partyId) {
    return await this.fetch(`/parties/v1/parties/customgameconfigs`, 'glz');
  }

  async enterMatchmakingQueue(partyId) {
    return await this.fetch(`/parties/v1/parties/${partyId}/matchmaking/join`, 'glz', 'post');
  }

  async setPartyAccessibility(partyId, state = 'OPEN') {
    return await this.fetch(`/parties/v1/parties/${partyId}/accessibility`, 'glz', 'post', {
      'Accessibility': state.toUpperCase()
    })
  }

  async setPartyQueue(partyId, queueId = 'unrated') {
    return await this.fetch(`/parties/v1/parties/${partyId}/makedefault?queueID=${queueId}`, 'glz', 'post');
  }

  async makeCustomGame(partyId) {
    return await this.fetch(`/parties/v1/parties/${partyId}/makecustomgame`, 'glz', 'post');
  }

  async setCustomGameSettings(partyId, map = 'Ascent', mode = '/Game/GameModes/Bomb/BombGameMode.BombGameMode_C', server = 'aresriot.aws-rclusterprod-use1-1.na-gp-ashburn-1') {
    return await this.fetch(`/parties/v1/parties/${partyId}/customgamesettings`, 'glz', 'post', {
      'map': `/Game/Maps/${map}/${map}`,
      'Mode': mode,
      'GamePod': server
    });
  }

  async joinParty(partyId) {
    return await this.fetch(`/parties/v1/players/${this.puuid}/joinparty/${partyId}`, 'glz', 'post');
  }

  async leaveParty(partyId) {
    return await this.fetch(`/parties/v1/players/${this.puuid}/leaveparty/${partyId}`, 'glz', 'post');
  }

  async pregameFetchPlayer(puuid) {
    puuid = puuid ? puuid : this.puuid;

    return await this.fetch(`/pregame/v1/players/${puuid}`, 'glz');
  }

  async pregameFetchMatch(matchId) {
    return await this.fetch(`/pregame/v1/matches/${matchId}`, 'glz');
  }

  async pregameFetchLoadouts(matchId) {
    return await this.fetch(`/pregame/v1/matches/${matchId}/loadouts`, 'glz');
  }

  async selectCharacter(matchId, characterId) {
    return await this.fetch(`/pregame/v1/matches/${matchId}/select/${characterId}`, 'glz', 'post');
  }

  async lockCharacter(matchId, characterId) {
    return await this.fetch(`/pregame/v1/matches/${matchId}/lock/${characterId}`, 'glz', 'post');
  }

  async fetchPenalties() {
    return await this.fetch('/restrictions/v2/penalties', 'pd');
  }

  async fetchSession(puuid) {
    puuid = puuid ? puuid : this.puuid;

    return await this.fetch(`/session/v1/sessions/${puuid}`, 'glz');
  }

  async fetchStoreEntitlements(puuid, itemType = 'e7c63390-eda7-46e0-bb7a-a6abdacd2433') {
    puuid = puuid ? puuid : this.puuid;

    return await this.fetch(`/store/v1/entitlements/${puuid}/${itemType}`, 'pd');
  }

  async fetchStoreOffers() {
    return await this.fetch(`/store/v1/offers`, 'pd');
  }

  async fetchWallet() {
    return await this.fetch(`/store/v1/wallet/${this.puuid}`, 'pd');
  }

  async fetchStoreFront() {
    return await this.fetch(`/store/v2/storefront/${this.puuid}`, 'pd');
  }
}

module.exports = GenericClient;