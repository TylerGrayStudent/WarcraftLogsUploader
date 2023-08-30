const fs = require('fs');

class FileStream {
  constructor(filePath) {
    this.filePath = filePath;
    this.id = `${Date.now()}`;

    this.init = this.init.bind(this);
    this.write = this.write.bind(this);
    this.close = this.close.bind(this);
  }

  init() {
    return new Promise((resolve) => {
      try {
        fs.openSync(this.filePath, 'w');
        this.fileStream = fs.createWriteStream(this.filePath);
        resolve();
      } catch (e) {
        console.log(JSON.stringify(e, null, 4));
      }
    });
  }

  write(line) {
    this.fileStream.write(line);
    this.fileStream.write('\n');
  }

  writeLines(lines) {
    const data = lines.join('\n') + '\n';
    this.fileStream.write(data);
  }

  close() {
    this.fileStream.close();
  }
}

module.exports = { FileStream };
