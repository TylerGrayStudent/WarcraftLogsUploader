const { UploaderBuilder } = require('./scripts/common/uploader-builder');
const {
  LargeAsyncFileReader,
} = require('./scripts/core/large-async-file-reader');
const { ChunkConsumerBuilder } = require('./scripts/common/chunk-consumer');
const { Report } = require('./scripts/common/report');
const { FS } = require('./scripts/core/fs');
const { ZipFile } = require('./scripts/core/file');
const { FileStream } = require('./scripts/core/file-stream');
const { UIDelegate } = require('./scripts/core/ui-delegate');
const { Game } = require('./scripts/game');
const { StorageService } = require('./scripts/services/storage-service');
const { LangService } = require('./scripts/services/lang-service');
const { BackendState } = require('./scripts/constants/backend-states.js');
const { eventBus } = require('./scripts/services/event-bus');
const {
  SanitizationService,
} = require('./scripts/services/sanitization-service');
const OverwolfPlugin = undefined;

const escapedISOString = (date) => {
  const result = date.toISOString();
  const replacedResult = result.replace(/:/g, '-');
  return replacedResult;
};

const { trans, setErrorText, setWarningText } = UIDelegate;

// BEGIN
// END

module.exports.BackgroundController = BackgroundController;
