const fs = require('fs');
const path = require('path');
const glob = require('glob');

class FS {
  constructor() {
    this.init = this.init.bind(this);
    this.unlinkSync = this.unlinkSync.bind(this);
    this.existsSync = this.existsSync.bind(this);
    this.move = this.move.bind(this);
    this.getFileInfo = this.getFileInfo.bind(this);
    this.getLatestFileInDirectoryByPattern =
      this.getLatestFileInDirectoryByPattern.bind(this);
  }

  init() {
    return 'success';
  }

  unlinkSync(file) {
    return new Promise((resolve, reject) => {
      try {
        fs.unlinkSync(file);
        resolve(true);
      } catch (e) {
        console.log(JSON.stringify(e, null, 4));
        reject();
      }
    });
  }

  existsSync(filePath) {
    return new Promise((success) => {
      try {
        if (fs.existsSync(filePath)) {
          success(true);
        }
      } catch (err) {
        success(false);
        console.error(err);
      }
    });
  }

  createDirectoryIfNeeded(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  move(source, target) {
    return new Promise((success) => {
      try {
        fs.renameSync(source, target);
        success(true);
      } catch (e) {
        console.log(e);
        success(false);
      }
    });
  }

  getFileInfo(logFile) {
    return new Promise((success, reject) => {
      try {
        const electronResult = fs.statSync(logFile);
        if (!electronResult) success(electronResult);
        const finalResult = {
          success: 'success',
          size: electronResult.size,
          lastWriteTime: electronResult.mtime,
          lastAcccessTime: electronResult.atime,
          creationTime: electronResult.ctime,
        };
        success(finalResult);
      } catch (e) {
        reject();
      }
    });
  }

  getLatestFileInDirectoryByPattern(dir, searchPattern) {
    return new Promise((resolve, reject) => {
      let matchingFiles = glob.sync(searchPattern, { cwd: dir });
      let filesWithTimes = matchingFiles.map((filename) => {
        return {
          name: filename,
          mtime: fs.statSync(path.resolve(dir, filename)).mtime,
        };
      });
      let sortedFiles = filesWithTimes.sort((a, b) => b.mtime - a.mtime);
      if (!sortedFiles || !sortedFiles.length) reject();
      resolve(path.resolve(dir, sortedFiles[0].name));
    });
  }

  dirName(file) {
    return path.dirname(file);
  }

  separator() {
    return path.sep;
  }
}

module.exports = { FS };
