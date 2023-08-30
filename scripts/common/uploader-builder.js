function UploaderBuilder(
  LargeAsyncFileReader,
  Report,
  ChunkConsumerBuilder,
  UIDelegate,
  FS,
  initializePlugin,
  ZipFile,
  FileStream
) {
   
const {
  trans,
  setProgressStatusText,
  updateProgress,
  setCancelButtonVisible,
  showLogPage,
  setErrorText,
  logToDebugPanel,
  setLastReportCode,
} = UIDelegate;

const liveLogChangeInterval = 5000;
const ChunkConsumer = ChunkConsumerBuilder(ZipFile, UIDelegate, FileStream, FS);

class Uploader {
  constructor(onFatalError) {
    this.reportCode = '';
    this.liveLogLastModified = '';
    this.liveLogLastSize = 0;
    this.liveLogStartingPosition = 0;
    this.debugMode = false;
    this.unchangedCount = 0;
    this.liveLogging = false;
    this.useRealTimeLiveLogging = false;
    this.liveLogEntireFile = false;
    this.userCanceled = false;
    this.fileName = '';

    this.onFatalError = onFatalError;
  }

  init = async (ipc) => {
    this.ipc = ipc;
    const fs = new FS();
    await fs.init();
    this.fs = fs;

    const { game } = window;
    this.scheme = game.scheme();
    this.host = game.host();

    if (window.overwolf) return initializePlugin();
    return 'success';
  };

  cancelUploadOrLiveLog = async () => {
    this.userCanceled = true;

    if (this.fileBuffer) {
      this.fileBuffer.close();
      this.fileBuffer = null;
    }

    // Stop any timeouts from firing. Note we also have to check for a cancelation in all the places
    // where awaits are happening, e.g., other IPC calls or waiting on zip files to complete zip operations.
    this.clearCurrentTimeout();
    await this.consumer?.close();
  };

  isCanceledByUser = () => this.userCanceled;

  stopLiveLoggingSession = async () => {
    if (this.consumer) await this.consumer.stopLiveLoggingSession();
    else {
      this.clearCurrentTimeout();
    }
  };

  createReport = async (baseUrl, reportMeta) => {
    const { ipc } = this;
    const report = new Report(ipc, reportMeta, baseUrl, this.fileName);
    try {
      const resp = await report.createReport();
      let responseText = resp.data;

      // todo - move all this into report.js
      let reportCode = '';
      if (responseText.substring(0, 7) === 'Success') {
        showLogPage('progress');
        reportCode = responseText.substring(8);
        setLastReportCode(reportCode);
        return reportCode;
      } else {
        await this.close();
        this.onFatalError(responseText);
      }
    } catch (e) {
      this.onFatalError('Error creating report.');
    }
  };

  openFile = async (
    baseUrl,
    reportCode,
    file,
    splittingLogFile,
    scanningLogFileForRaids,
    raidsToUpload,
    selectedRegion
  ) => {
    const game = window.game;

    this.fileBuffer = new LargeAsyncFileReader(game.logFileEncoding());
    await this.fileBuffer.openAsync(file, 0);

    const consumer = new ChunkConsumer(
      this,
      game,
      baseUrl,
      file,
      reportCode,
      this.ipc,
      false,
      splittingLogFile,
      scanningLogFileForRaids,
      raidsToUpload,
      selectedRegion
    );
    this.consumer = consumer;
    consumer.setLogStream(this.fileBuffer);
    consumer.setOnFatalError(this.onFatalError);
    consumer.setOnClosed(this.onConsumerClosed);

    let initialText = trans('reading_log_file');
    if (splittingLogFile) initialText = trans('splitting_log_file');
    else if (scanningLogFileForRaids) initialText = trans('scanning_log_file');

    showLogPage('progress');

    setProgressStatusText(initialText, 'logfile-progress-status');
    updateProgress(0, 'logfile-progress');
    setCancelButtonVisible(true);

    let logStartDate = game.fileStartDate(file); // This is for SWTOR only. The filename establishes what date the log was recorded on.
    if (logStartDate && !splittingLogFile)
      await this.ipc.ipcSetStartDate(logStartDate); // Make sure the parser also knows the start date

    await consumer.readFileChunk();
  };

  onConsumerClosed = () => {
    this.debugMode && console.log('chunk consumer closed');
    this.consumer = null;
  };

  close = async () => {
    this.debugMode && console.log('uploader closing');
    await this.consumer?.close();
    this.setCurrentTimeout(0);
    this.fileBuffer?.close();
    this.onClosed?.();
  };

  setOnClosed = (onClosed) => {
    this.onClosed = onClosed;
  };

  createBaseUrl = () => {
    const { scheme, host } = this;
    const baseUrl = window._isLocalTestMode
      ? 'http://localhost:3010'
      : scheme + '://' + host;
    return baseUrl;
  };

  checkForLiveLogChanges = async (file, previousLogFile, selectedRegion) => {
    this.debugMode && console.log('checkForLiveLogChanges');
    this.currentTimeout = 0;
    if (this.userCanceled) return;

    const { game } = window;

    let logFile = file;
    const logFileName = game.logFileName();
    const logFileNameIsSearchPattern =
      logFileName.includes('?') || logFileName.includes('*');

    if (logFileNameIsSearchPattern) {
      try {
        logFile = await this.fs.getLatestFileInDirectoryByPattern(
          file,
          logFileName
        );
      } catch {
        logFile = file + '/' + logFileName;
      }
    } else {
      logFile = file + '/' + logFileName;
    }

    if (this.userCanceled) return;

    const liveLoggingMustIncludeEntireFile =
      game.liveLoggingMustIncludeEntireFile() || this.liveLogEntireFile;

    if (logFile !== previousLogFile) {
      await this.consumer?.close();
      this.consumer = null;

      this.debugMode && console.log('File changed to ' + logFile);
      this.liveLogStartingPosition = 0;
      let logStartDate = game.fileStartDate(logFile); // This is for SWTOR only. The filename establishes what date the log was recorded on.
      if (logStartDate) await this.ipc.ipcSetStartDate(logStartDate); // Make sure the parser also knows the start date
      if (liveLoggingMustIncludeEntireFile && !previousLogFile) {
        const liveStartTime = new Date().getTime();
        this.debugMode &&
          console.log('The live start time is ' + liveStartTime);
        if (!this.liveLogEntireFile)
          await this.ipc.ipcSetLiveLoggingStartTime(liveStartTime); // Give the parser the live logging start time.
      }
    }

    if (this.userCanceled) return;

    let fileStats;
    try {
      fileStats = await this.fs.getFileInfo(logFile);
    } catch (e) {
      // an error is expected if the directory is empty
    }

    const logFileExists =
      fileStats && (fileStats.status === 'success' || fileStats.size);
    const logFileSize = logFileExists ? fileStats.size : 0;
    const checkLastModified = game.liveLoggingChecksLastModified();

    let liveLogPosition = 0;
    if (!this.consumer) {
      if (!this.liveLogStartingPosition)
        this.liveLogStartingPosition = liveLoggingMustIncludeEntireFile
          ? 0
          : logFileSize;
      liveLogPosition = this.liveLogStartingPosition;
    } else liveLogPosition = this.consumer.getLiveLogPosition();

    const { liveLogLastSize, debugMode, liveLogLastModified } = this;

    if (
      !logFileExists ||
      (checkLastModified && fileStats.lastWriteTime === liveLogLastModified) ||
      (!checkLastModified && logFileSize === liveLogLastSize) ||
      liveLogPosition >= logFileSize
    ) {
      if (debugMode) {
        const msg =
          'No changes encountered. Our position is ' +
          liveLogPosition +
          " and the file's size is " +
          logFileSize +
          '.';
        logToDebugPanel(msg);
      }

      // If no changes after 120 seconds
      if (++this.unchangedCount > 24) {
        this.unchangedCount = 0;

        const fights = await this.ipc.ipcCollectFightsFromParser(true, false);
        if (fights == null) {
          // Stale
          return;
        }

        this.consumer?.setCollectedFights(fights);

        if (fights.length) {
          setProgressStatusText(
            trans('assuming_combat_over'),
            'livelog-progress-status'
          );
          this.currentTimeout = setTimeout(
            async () => await this.consumer?.compressReport(),
            0
          );
          return;
        }
      }

      this.currentTimeout = setTimeout(
        async () =>
          await this.checkForLiveLogChanges(file, logFile, selectedRegion),
        liveLogChangeInterval
      );
      return;
    }

    this.unchangedCount = 0;

    this.liveLogLastModified = fileStats.lastWriteTime;
    this.liveLogLastSize = logFileSize;

    if (debugMode) {
      logToDebugPanel(
        'File changed! Our position is ' +
          liveLogPosition +
          " and the file's size is " +
          fileStats.size +
          '.'
      );
    }

    this.fileBuffer = new LargeAsyncFileReader(game.logFileEncoding());
    await this.fileBuffer.openAsync(logFile, liveLogPosition);

    setProgressStatusText(
      trans('reading_new_log_data'),
      'livelog-progress-status'
    );
    const consumer =
      this.consumer ||
      new ChunkConsumer(
        this,
        game,
        this.createBaseUrl(),
        file,
        this.reportCode,
        this.ipc,
        true,
        undefined,
        undefined,
        undefined,
        selectedRegion
      );
    if (!this.consumer) {
      // initialize consumer if it doesn't exist yet
      this.consumer = consumer;
      consumer.setOnCheckLiveLogForChanges(async () => {
        this.currentTimeout = setTimeout(
          async () =>
            await this.checkForLiveLogChanges(file, logFile, selectedRegion),
          liveLogChangeInterval
        );
      });
      const { onFatalError } = this;
      consumer.setOnFatalError(onFatalError);
    }
    consumer.setOnClosed(this.onConsumerClosed);
    consumer.setLogStream(this.fileBuffer);
    this.currentTimeout = setTimeout(
      async () => await consumer.readFileChunk(),
      0
    );
  };

  splitLogFile = async (filePath, selectedRegion) => {
    const baseUrl = this.createBaseUrl();
    await this.openFile(
      baseUrl,
      '',
      filePath,
      true,
      undefined,
      undefined,
      selectedRegion
    );
  };

  liveLog = async (
    reportMeta,
    dir,
    selectedRegion,
    liveLogEntireFile,
    useRealTimeLiveLogging
  ) => {
    this.debugMode &&
      console.log('liveLog', liveLogEntireFile, useRealTimeLiveLogging);
    const baseUrl = this.createBaseUrl();

    try {
      this.reportCode = await this.createReport(baseUrl, reportMeta);
      if (!this.reportCode) return;
      this.liveLogging = true;
      this.liveLogEntireFile = liveLogEntireFile === '1';
      this.useRealTimeLiveLogging = useRealTimeLiveLogging === '1';
      setProgressStatusText(
        trans('livelog_started'),
        'livelog-progress-status'
      );
      this.currentTimeout = setTimeout(
        async () =>
          await this.checkForLiveLogChanges(dir, undefined, selectedRegion),
        0
      );
    } catch (e) {
      this.debugMode && console.warn('ERROR', e);
      setErrorText('Invalid file.');
    }
  };

  scanLogFileForRaids = async (reportMeta, filePath, selectedRegion) => {
    const fileError = await this.checkFileForErrors(filePath);
    if (!fileError.isSuccess) {
      showLogPage('upload');
      this.onFatalError(fileError.error);
      return;
    }

    const baseUrl = this.createBaseUrl();
    setProgressStatusText(
      trans('scanning_log_file'),
      'logfile-progress-status'
    );
    updateProgress(0, 'logfile-progress');
    showLogPage('progress');

    await this.openFile(
      baseUrl,
      '',
      filePath,
      false,
      true,
      undefined,
      selectedRegion
    );
  };

  upload = async (reportMeta, file, raidsToUpload, selectedRegion) => {
    const fileError = await this.checkFileForErrors(file);
    if (!fileError.isSuccess) {
      showLogPage('upload');
      this.onFatalError(fileError.error);
      return;
    }

    const baseUrl = this.createBaseUrl();

    try {
      const reportCode = await this.createReport(baseUrl, reportMeta);
      this.reportCode = reportCode;
      if (!this.reportCode) return;
      await this.openFile(
        baseUrl,
        reportCode,
        file,
        false,
        false,
        raidsToUpload,
        selectedRegion
      );
    } catch (e) {
      console.error(e);
      showLogPage('upload');
      this.onFatalError(trans('invalid_file_selected_error'));
    }
  };

  checkFileForErrors = async (filePath) => {
    const exists = filePath && (await this.fs.existsSync(filePath));
    const fileInfo = exists ? await this.fs.getFileInfo(filePath) : undefined;
    if (!exists || !fileInfo) {
      console.error('File Exists?', exists, 'FileInfo?', fileInfo);
      return {
        isSuccess: false,
        error: trans('invalid_file_selected_error'),
      };
    }

    if (fileInfo.size > 1_500_000_000) {
      return {
        isSuccess: false,
        error: trans('file_too_large_error'),
      };
    }

    this.fileName = filePath.split(this.fs.separator()).pop();

    return {
      isSuccess: true,
    };
  };

  setCurrentTimeout = (timeout) => {
    this.currentTimeout = timeout;
  };

  clearCurrentTimeout = () => {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
    }
  };

  clearCollectedFights = () => {
    this.consumer?.clearCollectedFights();
  };
}

return Uploader
   
}

module.exports = { UploaderBuilder };
