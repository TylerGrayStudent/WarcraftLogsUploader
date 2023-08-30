 
class Report {
  constructor(ipc, reportMeta, baseUrl, fileName) {
    this.ipc = ipc;
    this.reportMeta = reportMeta;
    this.baseUrl = baseUrl;
    this.fileName = fileName;
  }

  async createReport() {
    const { baseUrl, reportMeta } = this;

    const {
      description,
      selectedGuild,
      selectedTeam,
      selectedRegion,
      selectedPrivacy,
      startTime,
      clientVersion,
    } = reportMeta;

    const parserVersion = await this.ipc.ipcGetParserVersion();

    const postData = {
      description,
      guild: selectedGuild,
      team: selectedTeam,
      personal: -10000 - selectedRegion, // This is dumb, but it lets us share the field for backwards compatibility (and with WildStar)
      visibility: selectedPrivacy,
      start: startTime,
      end: startTime,
      parserVersion: parserVersion,
      clientVersion: clientVersion,
      fileName: this.fileName,
    };

    const url = baseUrl + '/client/create-report';

    return new Promise((resolve, reject) => {
      axios
        .post(url, postData)
        .then(
          (data) => {
            console.log('create-report', data);
            if (data.status !== 200) {
              reject();
              return;
            }

            resolve(data);
          },
          (error) => {
            console.log(error);
            reject();
          }
        )
        .catch((thrown) => {
          console.log(thrown);
          reject();
        });
    });
  }
}
 
 
module.exports = { Report }
