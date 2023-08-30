define(['../3rdparty/overwolfplugin.js'], function (_) {
  const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        var r = (Math.random() * 16) | 0,
          v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  };

  class tmp {
    static async tmpNameSync() {
      const plugin = new OverwolfPlugin('simple-io-plugin', true);
      return new Promise((resolve, reject) => {
        plugin.initialize(() => {
          const tmpFileName = plugin.get().LOCALTEMP + '\\tmp-' + uuidv4();
          resolve(tmpFileName);
        });
      });
    }
  }

  return tmp;
});
