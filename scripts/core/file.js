const { Zip } = require('../core/zip.js');

class ZipFile {
  static events() {
    return {
      UPLOAD_COMPLETE_DATA: 'UPLOAD_COMPLETE_DATA',
      PROGRESS: 'PROGRESS',
      ERROR: 'ERROR',
      FINALIZED: 'FINALIZED',
    };
  }

  constructor() {
    this.fileListeners = {};
    this.cancelUpload = false;
    this.cancelTokenSource = null;
    this.addEventListener = this.addEventListener.bind(this);
    this.upload = this.upload.bind(this);
    this.cancel = this.cancel.bind(this);
    this.deleteFile = this.deleteFile.bind(this);
    this.finalize = this.finalize.bind(this);

    this.archive = new Zip();
  }

  async addFileFromString(fileName, fileString) {
    this.fileName = 'log.txt';
    await this.archive.file(this.fileName, fileString);
  }

  async finalize(callback) {
    this.blob = await this.archive.write();
    callback();
  }

  addEventListener(id, listener) {
    this.fileListeners[id] = listener;
  }

  async upload(path, params = {}) {
    const queryString = Object.keys(params)
      .map((key) => {
        return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
      })
      .join('&');

    const url = `${path}?${queryString}`;
    const formData = new FormData();
    formData.append('logfile', this.blob, this.filename);

    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    this.cancelTokenSource = source;

    const config = { headers: { 'Content-Type': 'multipart/form-data' } };
    axios
      .request({
        method: 'post',
        cancelToken: source.token,
        url,
        data: formData,
        config,
        onUploadProgress: (p) => {
          console.log('progress', p.total, p.loaded);
          const callbackKey = ZipFile.events().PROGRESS;
          const callback = this.fileListeners[callbackKey];

          if (callback) {
            callback({
              bytesTotal: p.total,
              bytesLoaded: p.loaded,
            });
          }
        },
      })
      .then(
        (data) => {
          console.log('DONE?');
          console.log(data);
          const callbackKey = ZipFile.events().UPLOAD_COMPLETE_DATA;
          const callback = this.fileListeners[callbackKey];
          if (callback) {
            callback(data);
          }
        },
        (error) => {
          if (this.cancelUpload) {
            return;
          }

          const callbackKey = ZipFile.events().ERROR;
          const callback = this.fileListeners[callbackKey];
          if (callback) {
            callback(error);
          }
        }
      )
      .catch((thrown) => {
        if (axios.isCancel(thrown)) {
          console.log('Request canceled', thrown.message);
        } else {
          callback(error);
        }
      });
  }

  cancel() {
    this.cancelUpload = true;
    if (this.cancelTokenSource) {
      this.cancelTokenSource.cancel('Operation canceled by user.');
    }
  }

  deleteFile() {
    this.blob = undefined;
  }

  resolvePath() {}
}

module.exports = { ZipFile };
