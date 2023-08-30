function ChunkConsumerBuilder(ZipFile, UIDelegate, FileStream, FS) {
   
const {
  trans,
  setErrorText,
  logToDebugPanel,
  setStatusText,
  updateProgress,
  setProgressStatusText,
  setUploadProgressContainer,
  setCancelButtonVisible,
  logScanCompleted,
} = UIDelegate;

const fileDebugger = { log: (txt) => console.debug('LOG: ', txt) };

const countLines = (linesChunk, stopIndex) => {
  let result = 0;
  for (let i = 0; i < stopIndex; ++i) result += linesChunk[i].length;
  return result;
};

const escapedISOString = (date) => {
  const result = date.toISOString();
  const replacedResult = result.replace(/:/g, '-');
  return replacedResult;
};

class ChunkConsumer {
  constructor(
    uploader,
    game,
    baseUrl,
    file,
    reportCode,
    ipc,
    liveLogging,
    splittingLogFile,
    scanningLogFileForRaids,
    raidsToUpload,
    selectedRegion
  ) {
    this.uploader = uploader;
    this.game = game;

    this.ipc = ipc;
    this.file = file;
    this.reportCode = reportCode;
    this.baseUrl = baseUrl;

    this.previousTimestampForSplit = 0;
    this.isLogValid = false;
    this.splittingLogFile = splittingLogFile;
    this.scanningLogFileForRaids = scanningLogFileForRaids;
    this.debugMode = false;
    this.liveLogPosition = 0;
    this.collectedFights = {
      fights: [],
    };
    this.inProgressFight = null;
    this.collectedScannedRaids = [];
    this.liveLogging = liveLogging;
    this.liveLogChangeInterval = 5000;
    this.terminateLogging = false;
    this.currentLinesIndex = 0;
    this.raidsToUpload = raidsToUpload;
    this.selectedRegion = selectedRegion;
  }

  getFs = async () => {
    if (!this.fs) {
      this.fs = new FS();
      await this.fs.init();
    }
    return this.fs;
  };

  setLogStream = (logStream) => {
    this.logStream = logStream;
  };

  setOnClosed = (onClosed) => {
    this.onClosed = onClosed;
  };

  setOnCheckLiveLogForChanges = (onCheckLiveLogForChanges) => {
    this.onCheckLiveLogForChanges = onCheckLiveLogForChanges;
  };

  setOnFatalError = (onFatalError) => {
    this.onFatalError = onFatalError;
  };

  setCollectedFights = (fights) => {
    this.collectedFights = fights;
  };

  clearCollectedFights = () => {
    this.collectedFights = { fights: [] };
  };

  getLiveLogPosition = () => this.liveLogPosition;

  createNewSplitFile = async () => {
    const { splitFileStream, splitFileTimestamp, file } = this;
    if (splitFileStream) {
      splitFileStream.close();
    }

    const fs = await this.getFs();

    let e,
      t = file,
      i = t.lastIndexOf('.'),
      o = i > -1,
      r = '';
    o ? ((e = t.substring(0, i)), (r = t.substring(i))) : (e = t);

    const l = fs.dirName(file);
    const fileName = 'Split' + e.split(fs.separator()).pop();
    const splitFile =
      l +
      fs.separator() +
      fileName +
      '-' +
      escapedISOString(new Date(splitFileTimestamp)) +
      r;

    this.debugMode && console.log('The file is ' + splitFile);

    this.splitFileStream = new FileStream(splitFile);
    await this.splitFileStream.init();
  };

  handleLogTermination = async () => {
    const { liveLogging, splittingLogFile } = this;
    if (liveLogging || splittingLogFile) {
      await this.logFileReadyForDisposal();
      return;
    }

    setProgressStatusText(trans('cleaning_up'), 'upload-progress-status');
    updateProgress(0, 'upload-progress');
    this.uploader.setCurrentTimeout(
      setTimeout(async () => await this.terminateReport(), 0)
    );
  };

  logDeletionAndArchivalFilename = async () => {
    const { liveLogging, game, file } = this;
    if (!liveLogging) {
      return file;
    }

    await this.getFs();
    const logFileName = game.logFileName();
    const logFileNameIsSearchPattern =
      logFileName.includes('?') || logFileName.includes('*');
    const logFile = logFileNameIsSearchPattern
      ? await this.fs.getLatestFileInDirectoryByPattern(file, logFileName)
      : file + '/' + game.logFileName();

    if (!logFile) {
      return undefined;
    }
    const doesExists = await this.fs.existsSync(logFile);
    if (!doesExists) {
      return undefined;
    }
    return logFile;
  };

  logFileReadyForDisposal = async () => {
    UIDelegate.logFileReadyForDisposal(
      await this.logDeletionAndArchivalFilename()
    );
    await this.close();
  };

  terminateReport = async () => {
    const url = this.baseUrl + '/client/terminate-log/' + this.reportCode;
    this.uploader.setCurrentTimeout(0);

    axios
      .get(url)
      .then(async (response) => {
        // handle success
        this.debugMode && console.log(response);
        await this.doTerminateComplete(response);
      })
      .catch(function (error) {
        // handle error
        console.warn(error);
      });
  };

  doTerminateComplete = async (e) => {
    this.debugMode && console.log('doTerminateComplete');
    if (e.data.substring(0, 7) === 'Success') {
      updateProgress(100, 'upload-progress');
      setStatusText(trans('cleanup_success'));
      await this.logFileReadyForDisposal();
    } else {
      await this.close();
      setErrorText(e.data);
    }
  };

  isCanceledByUser = () => this.uploader?.isCanceledByUser();

  cancelUploadOrLiveLog = async () => {
    this.debugMode && console.log('cancelUploadOrLiveLog');
    // Stop any timeouts from firing. Note we also have to check for a cancellation in all the places
    // where awaits are happening, e.g., other IPC calls or waiting on zip files to complete zip operations.
    this.uploader?.clearCurrentTimeout();
    await this.close();
  };

  close = async () => {
    this.debugMode && console.log('chunk-consumer closing');
    // Do this first in order to make an IPC call. This ensures the parser is done with
    // an ipcParseLogLines call before we can get through.
    await this.finishChunk();

    if (this.logStream) {
      this.logStream = null;
    }

    if (this.splitFileStream) {
      this.splitFileStream.close();
      this.splitFileStream = null;
    }

    this.onClosed?.();
  };

  finishChunk = async () => {
    this.debugMode && console.log('finishChunk');
    this.currentLinesIndex = 0;
    this.linesChunk = null;
    this.lineCount = 0;

    this.deleteTempFile();

    this.inProgressFight = null;
    await this.ipc.ipcClearParserFights();
  };

  doChunkComplete = async (e) => {
    this.debugMode && console.log('doChunkComplete');
    if (this.isCanceledByUser()) return;
    if (e.data === 'Success') {
      updateProgress(100, 'upload-progress');
      setUploadProgressContainer(false);
      if (this.liveLogging) {
        setProgressStatusText(
          trans('waiting_for_data'),
          'livelog-progress-status'
        );
      } else
        setProgressStatusText(
          trans('reading_log_file'),
          'logfile-progress-status'
        );

      await this.finishChunk();
      if (this.isCanceledByUser()) return;

      if (this.terminateLogging) {
        await this.handleLogTermination();
        this.isCanceledByUser();
      } else if (!this.liveLogging || this.logStream)
        this.uploader.setCurrentTimeout(
          setTimeout(async () => await this.readFileChunk(), 0)
        );
      else
        this.uploader.setCurrentTimeout(
          setTimeout(
            async () => await this.checkForLiveLogChanges(),
            this.liveLogChangeInterval
          )
        );
    } else {
      this.close().then(() => {
        setErrorText(e.data);
      });
    }
  };

  doProgress = (e) => {
    const loaded = e.bytesLoaded;
    const total = e.bytesTotal;
    const percentLoaded = Math.ceil((loaded / total) * 100);
    updateProgress(percentLoaded, 'upload-progress');
  };

  doError = async () => {
    this.debugMode && console.log('doError');
    if (this.inProgressFight) {
      // Failing to upload an in progress segment is fine. We can just keep going.
      this.inProgressFight = null;
      updateProgress(100, 'upload-progress');
      setUploadProgressContainer(false);
      setProgressStatusText(
        trans('waiting_for_data'),
        'livelog-progress-status'
      );
      await this.finishChunk();
      if (this.isCanceledByUser()) return;
      this.uploader.setCurrentTimeout(
        setTimeout(
          async () => await this.checkForLiveLogChanges(),
          this.liveLogChangeInterval
        )
      );
    } else {
      if (this.isCanceledByUser()) return;
      this.cancelUploadOrLiveLog().then(() => {
        setErrorText(trans('upload_error'));
      });
    }
  };

  uploadMasterReportTable = async () => {
    fileDebugger.log('**** ----> uploadMasterReportTable');
    const { UPLOAD_COMPLETE_DATA, PROGRESS, ERROR } = ZipFile.events();
    this.uploader.setCurrentTimeout(0);

    const { tempFile } = this;
    tempFile.addEventListener(
      UPLOAD_COMPLETE_DATA,
      async (e) => await this.doMasterTableComplete(e)
    );
    tempFile.addEventListener(PROGRESS, this.doProgress);
    tempFile.addEventListener(ERROR, async () => await this.doError());

    const url = this.baseUrl + '/client/set-master-table/';

    // SETTINGS FOR THE REQUEST
    // todo - we need to set this in the request? in ZipFile?
    // request.cacheResponse = false
    const vars = {
      report: this.reportCode,
    };

    // UPLOAD THE FILE, DON'T TEST THE SERVER BEFOREHAND
    // todo -- what is this parameter 'logfile' for???
    // tempFile.upload(request, 'logfile', false)
    tempFile.upload(url, vars);
  };

  deleteTempFile = () => {
    if (this.tempFile) {
      this.tempFile.cancel(); // Stop the upload.
      this.tempFile.deleteFile();
      this.tempFile = null;
    }
  };

  doMasterTableComplete = async (e) => {
    this.debugMode && console.log('doMasterTableComplete');
    if (this.isCanceledByUser()) return;
    if (e.data.substring(0, 7) === 'Success') {
      fileDebugger.log('**** ----> doMasterTableComplete Success');
      updateProgress(100, 'upload-progress');
      setStatusText(trans('upload_chunk_success'));
      this.uploader.setCurrentTimeout(
        setTimeout(async () => await this.compressReportSegment(), 0)
      );
    } else {
      this.close('upload').then(() => {
        setErrorText(e.data);
      });
    }
  };

  uploadReportSegment = async () => {
    this.debugMode && console.log('uploadReportSegment');
    fileDebugger.log('**** ----> uploadReportSegment');
    const { UPLOAD_COMPLETE_DATA, PROGRESS, ERROR } = ZipFile.events();
    this.uploader.setCurrentTimeout(0);

    const { tempFile } = this;
    const fightsToUpload = this.inProgressFight
      ? this.inProgressFight
      : this.collectedFights;

    tempFile.addEventListener(UPLOAD_COMPLETE_DATA, async (e) => {
      try {
        await this.doChunkComplete(e);
      } catch (e) {
        console.error(e);
      }
    });
    tempFile.addEventListener(PROGRESS, this.doProgress);
    tempFile.addEventListener(ERROR, async () => await this.doError());

    const url =
      this.baseUrl +
      (this.inProgressFight
        ? '/client/add-in-progress-segment-to-log/'
        : '/client/add-to-log/');

    // SETTINGS FOR THE REQUEST
    // todo - we need to set this in the request? in ZipFile?
    // request.cacheResponse = false

    // SOME VARIABLES (E.G. A FOLDER NAME TO SAVE THE FILE)
    const vars = {
      report: this.reportCode,
      start: fightsToUpload.startTime,
      end: fightsToUpload.endTime,
      mythic: fightsToUpload.mythic,
      livelog: this.liveLogging ? 1 : 0,
      realtime:
        this.liveLogging && this.uploader.useRealTimeLiveLogging ? 1 : 0,
      in_progress_event_count:
        this.inProgressFight && this.inProgressFight.fights.length
          ? this.inProgressFight.fights[0].eventCount
          : 0,
    };

    // UPLOAD THE FILE, DON'T TEST THE SERVER BEFOREHAND
    // todo -- what is this parameter 'logfile' for???
    // tempFile.upload(request, 'logfile', false)
    tempFile.upload(url, vars);
  };

  compressReportSegment = async () => {
    fileDebugger.log('**** ----> compressReportSegment');
    this.uploader.setCurrentTimeout(0);
    const { tempFile } = this;
    const fightsToUpload = this.inProgressFight
      ? this.inProgressFight
      : this.collectedFights;
    if (!fightsToUpload.fights.length) {
      return;
    }

    // First, we upload the master file that contains all actors, abilities and tuples.
    let fileString = '';
    fileString +=
      fightsToUpload.logVersion + '|' + fightsToUpload.gameVersion + '\n'; // Version. Revs any time we change the file format.

    // Stitch the events back together into one chunk.
    let eventCount = 0;
    let eventCombinedString = '';
    for (let i = 0; i < fightsToUpload.fights.length; ++i) {
      let fight = fightsToUpload.fights[i];
      eventCount += fight.eventCount;
      eventCombinedString += fight.eventsString;
    }

    fileString += eventCount + '\n';
    fileString += eventCombinedString;

    // The next step is zipping up the events file.
    await tempFile.addFileFromString('log.txt', fileString);
    await tempFile.finalize(() => {
      if (this.isCanceledByUser() || this.tempFile !== tempFile) return;
      fileDebugger.log('------------------');
      fileDebugger.log('INSIDE THE SEGMENT:');
      fileDebugger.log('------------------');
      // fileDebugger.log(fileString)
      setProgressStatusText(
        trans('uploading_new_fights'),
        'upload-progress-status'
      );
      updateProgress(0, 'upload-progress');
      this.uploader.setCurrentTimeout(
        setTimeout(async () => await this.uploadReportSegment(), 0)
      );
    });
  };

  compressReport = async () => {
    fileDebugger.log('**** ----> compressReport');
    this.uploader.setCurrentTimeout(0);
    const fightsToUse = this.inProgressFight
      ? this.inProgressFight
      : this.collectedFights;
    if (!fightsToUse.fights.length) {
      return;
    }

    // First, we upload the master file that contains all actors, abilities and tuples.
    let fileString = '';
    fileString += fightsToUse.logVersion + '|' + fightsToUse.gameVersion + '\n'; // Version. Revs any time we change the file format.

    const masterFile = await this.ipc.ipcCollectMasterFileInfo();
    if (!masterFile) {
      return;
    }

    fileString += masterFile.lastAssignedActorID + '\n';
    fileString += masterFile.actorsString;

    fileString += masterFile.lastAssignedAbilityID + '\n';
    fileString += masterFile.abilitiesString;

    fileString += masterFile.lastAssignedTupleID + '\n';
    fileString += masterFile.tuplesString;

    fileString += masterFile.lastAssignedPetID + '\n';
    fileString += masterFile.petsString;

    // The next step is zipping up the tuples file.

    fileDebugger.log('------------------');
    fileDebugger.log('INSIDE THE MASTER:');
    fileDebugger.log('------------------');
    // fileDebugger.log(fileString)

    const tempFile = new ZipFile();
    this.tempFile = tempFile;
    await tempFile.addFileFromString('log.txt', fileString);
    await tempFile.finalize(async () => {
      if (this.isCanceledByUser() || tempFile !== this.tempFile) return;

      setProgressStatusText(
        trans('uploading_new_actors'),
        'upload-progress-status'
      );

      setUploadProgressContainer(true);

      updateProgress(0, 'upload-progress');
      this.uploader.setCurrentTimeout(
        setTimeout(async () => await this.uploadMasterReportTable(), 0)
      );
    });
  };

  checkForLiveLogChanges = async () => {
    this.debugMode && console.log('checkForLiveLogChanges');
    const { onCheckLiveLogForChanges } = this;
    if (onCheckLiveLogForChanges) {
      await onCheckLiveLogForChanges();
    }
  };

  stopLiveLoggingSession = async () => {
    this.debugMode && console.log('stopLiveLoggingSession');
    this.uploader.clearCurrentTimeout(); // Kills all timers and the ability to check for more changes
    this.deleteTempFile(); // Kills uploading and zip finalization, since zip finalize does a compare with the current temp file.

    this.inProgressFight = null;
    const fights = await this.ipc.ipcCollectFightsFromParser(true, false);
    if (fights?.length) {
      this.collectedFights = fights;
      this.terminateLogging = true;
      setProgressStatusText(
        trans('uploading_remaining'),
        'livelog-progress-status'
      );
      this.uploader.setCurrentTimeout(
        setTimeout(async () => {
          await this.compressReport();
          await this.handleLogTermination();
        }, 0)
      );
      return;
    }

    await this.handleLogTermination();
  };

  readFileChunk = async () => {
    this.uploader.setCurrentTimeout(0);

    const {
      logStream,
      splittingLogFile,
      game,
      scanningLogFileForRaids,
      liveLogPosition,
      debugMode,
      splitFileTimestamp,
    } = this;

    if (this.isCanceledByUser() || !logStream) return;

    if (debugMode) {
      logToDebugPanel(
        'Entering readFileChunk with logStream position: ' +
          logStream.position() +
          '.'
      );
    }

    // mutable state in this function only
    let firstLineWasInvalid = false;

    try {
      if (!this.linesChunk || !this.linesChunk.length) {
        this.oldFilePosition = logStream.position();
        this.linesChunk = await logStream.readChunk();
      }

      const lines = this.linesChunk.length
        ? this.linesChunk[this.currentLinesIndex]
        : null;
      if (!this.isLogValid && lines && lines.length > 0) {
        var { timestamp } = game.scanLogLine(lines[0]);
        if (timestamp === -1 && lines[0].trim().length) {
          setErrorText(
            'Line 1 - This is not a valid log file. Bad line was: ' + lines[0]
          );
          firstLineWasInvalid = true;
          this.isLogValid = false;
        } else {
          this.isLogValid = true;
        }
      }

      if (!firstLineWasInvalid && lines) {
        if (splittingLogFile) {
          for (let i = 0; i < lines.length; ++i) {
            const splitsOnTimestamp = game.splitsOnTimestamps();
            const splitsOnZoneChange = game.splitsOnZoneChanges();
            const oldZoneID = this.splitZoneID;

            const { timestamp, splitZoneID } = game.scanLogLine(lines[i]);
            this.splitZoneID = splitZoneID || this.splitZoneID;

            if (timestamp !== -1) {
              // -2 is a magic value that means force a split. ESO uses this when BEGIN_LOG is seen.
              if (
                timestamp === -2 ||
                splitFileTimestamp === 0 ||
                (splitsOnTimestamp &&
                  timestamp >
                    this.previousTimestampForSplit + 60 * 1000 * 60 * 4) ||
                (splitsOnZoneChange &&
                  oldZoneID &&
                  this.splitZoneID &&
                  this.splitZoneID !== oldZoneID)
              ) {
                if (this.linesToWriteToSplitFile?.length) {
                  await this.flushSplitFileBuffer();
                }

                this.splitFileTimestamp = timestamp;
                await this.createNewSplitFile();
              }

              this.addLineToSplitFileBuffer(lines[i]);

              if (
                this.linesToWriteToSplitFile.length === 5000 ||
                !logStream.bytesAvailable()
              ) {
                await this.flushSplitFileBuffer();
              }

              this.previousTimestampForSplit = timestamp;
            }
          }
        } else {
          // Parsing
          const { raidsToUpload } = this;
          const answer = await this.ipc.ipcParseLogLines(
            lines,
            scanningLogFileForRaids,
            this.selectedRegion,
            raidsToUpload
          );
          if (this.isCanceledByUser()) return;
          if (!answer.success) {
            if (answer.exception) {
              setErrorText(
                'Line ' +
                  answer.parsedLineCount +
                  ' - ' +
                  answer.exception +
                  '-' +
                  answer.line
              );
            }
            this.isLogValid = false;
            if (debugMode) {
              logToDebugPanel(answer.exception);
            }
          }
        }
      }

      /////////////////

      if (
        this.isLogValid &&
        !firstLineWasInvalid &&
        this.linesChunk &&
        this.linesChunk.length
      ) {
        this.currentLinesIndex++;

        if (this.currentLinesIndex < this.linesChunk.length) {
          if (debugMode) {
            logToDebugPanel(
              'Line threshold of 5000 exceeded. Calling readFileChunk again.'
            );
          }
          this.uploader.setCurrentTimeout(
            setTimeout(async () => await this.readFileChunk(), 0)
          );

          updateProgress(
            Math.ceil(
              (100 *
                (this.oldFilePosition +
                  (countLines(this.linesChunk, this.currentLinesIndex) /
                    countLines(this.linesChunk, this.linesChunk.length)) *
                    (logStream.position() - this.oldFilePosition) -
                  liveLogPosition)) /
                (logStream.file().size - liveLogPosition)
            ),
            'logfile-progress'
          );
          return;
        } else {
          this.currentLinesIndex = 0;
        }
      }

      /////////////////

      this.debugMode && console.log('this.isLogValid', this.isLogValid);
      if (
        this.isLogValid &&
        !firstLineWasInvalid &&
        logStream.bytesAvailable()
      ) {
        if (debugMode) {
          logToDebugPanel(
            'More bytes are available. Our current position is ' +
              logStream.position() +
              ' and bytes available is ' +
              logStream.bytesAvailable() +
              '.'
          );
        }
        this.linesChunk = null;
        updateProgress(
          Math.ceil(
            (100 * (logStream.position() - liveLogPosition)) /
              (logStream.file().size - liveLogPosition)
          ),
          'logfile-progress'
        );
        const fights = await this.ipc.ipcCollectFightsFromParser(false, false);
        if (fights == null) {
          this.debugMode && console.log('ipcCollectFightsFromParser stale');
          return; // Stale
        }
        if (this.isCanceledByUser()) return;

        this.collectedFights = fights;
        if (!this.collectedFights.fights.length) {
          this.uploader.setCurrentTimeout(
            setTimeout(async () => await this.readFileChunk(), 0)
          );
        } else {
          this.inProgressFight = null;
          setProgressStatusText(
            'Processed ' +
              this.collectedFights.fights.length +
              ' New Fights. Compressing Combat Log Data',
            'livelog-progress-status'
          );

          this.uploader.setCurrentTimeout(
            setTimeout(async () => await this.compressReport(), 0)
          );
        }
        return;
      }
    } catch (e) {
      console.log('******** ERROR ********', e);
      setErrorText(e);
      this.isLogValid = false;
      if (debugMode) {
        logToDebugPanel(e);
      }
      const { onFatalError } = this;
      if (onFatalError) {
        onFatalError(e);
      }
    }

    /////////////////

    const position = logStream ? logStream.position() : 0;
    if (debugMode) {
      logToDebugPanel(
        'Finished readFileChunk with position of ' + position + '.'
      );
    }

    this.linesChunk = null;
    if (logStream) {
      logStream.close();
      this.logStream = null;
    }

    if (this.isLogValid) {
      if (this.liveLogging) {
        this.liveLogPosition = position;
        if (debugMode) {
          logToDebugPanel('Set live log position to ' + position + '.');
        }
        const fights = await this.ipc.ipcCollectFightsFromParser(false, false);
        if (fights == null) {
          return; // Stale
        }
        this.collectedFights = fights;
        this.inProgressFight = null;
        if (!this.collectedFights.fights.length) {
          if (this.uploader.useRealTimeLiveLogging) {
            const inProgress =
              await this.ipc.ipcCollectInProgressFightFromParser();
            if (
              inProgress &&
              inProgress.fights.length &&
              inProgress.fights[0].eventCount > 0
            ) {
              // console.log("Seeing in progress fight " + inProgress.fights[0].eventCount)
              this.inProgressFight = inProgress;
              setProgressStatusText(
                trans('processed_in_progress_fight') +
                  ' ' +
                  trans('compressing_data'),
                'livelog-progress-status'
              );
              this.uploader.setCurrentTimeout(
                setTimeout(async () => await this.compressReport(), 0)
              );
              return;
            }
          }
          this.uploader.setCurrentTimeout(
            setTimeout(
              async () => await this.checkForLiveLogChanges(),
              this.liveLogChangeInterval
            )
          );
          setProgressStatusText(
            trans('waiting_for_fight_end'),
            'livelog-progress-status'
          );
          return;
        }
        setProgressStatusText(
          trans('processed_new_fights') + ' ' + trans('compressing_data'),
          'livelog-progress-status'
        );
      } else {
        const fights = await this.ipc.ipcCollectFightsFromParser(
          true,
          scanningLogFileForRaids
        );
        if (fights == null) {
          return; // Stale
        }
        this.collectedFights = fights;
        this.terminateLogging = true;
        setProgressStatusText(
          trans('compressing_data'),
          'livelog-progress-status'
        );
      }
      if (this.collectedFights.fights.length) {
        this.uploader.setCurrentTimeout(
          setTimeout(async () => await this.compressReport(), 0)
        );
      } else if (scanningLogFileForRaids) {
        const raids = await this.ipc.ipcCollectScannedRaidsFromParser();
        if (raids == null) {
          return; // Stale
        }
        this.collectedScannedRaids = raids;
        logScanCompleted(
          this.collectedScannedRaids,
          this.collectedFights.logVersion
        );
      } else {
        await this.handleLogTermination();
      }
    } else {
      console.warn('Invalid Log');
      setCancelButtonVisible(false);
      await this.ipc.ipcClearParserState();
    }
  };

  addLineToSplitFileBuffer = (line) => {
    if (this.linesToWriteToSplitFile === undefined) {
      this.linesToWriteToSplitFile = [];
    }
    this.linesToWriteToSplitFile.push(line);
  };

  flushSplitFileBuffer = async () => {
    await this.splitFileStream?.writeLines(this.linesToWriteToSplitFile);
    this.linesToWriteToSplitFile = [];
  };
}

return ChunkConsumer
   
}

module.exports = { ChunkConsumerBuilder };
