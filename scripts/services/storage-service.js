class StorageService {
  constructor(prefix) {
    this._prefix = prefix;
    this._version = localStorage.getItem(prefix + '-version');
    if (!this._version) this._version = 'live';
  }

  getVersionedStoredItem(key) {
    return localStorage.getItem(this._prefix + '-' + this._version + '-' + key);
  }

  setVersionedStoredItem(key, item) {
    return localStorage.setItem(
      this._prefix + '-' + this._version + '-' + key,
      item
    );
  }

  removeVersionedStoredItem(key) {
    return localStorage.removeItem(
      this._prefix + '-' + this._version + '-' + key
    );
  }

  getStoredItem(key) {
    return localStorage.getItem(this._prefix + '-' + key);
  }

  setStoredItem(key, item) {
    return localStorage.setItem(this._prefix + '-' + key, item);
  }

  removeStoredItem(key) {
    return localStorage.removeItem(this._prefix + '-' + key);
  }

  version() {
    return this._version;
  }
  setVersion(version) {
    this._version = version;
  }
}

module.exports = { StorageService };
