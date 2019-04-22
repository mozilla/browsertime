'use strict';

const log = require('intel').getLogger('browsertime.video');
const os = require('os');
const util = require('util');
const fs = require('fs');
const path = require('path');
const delay = ms => new Promise(res => setTimeout(res, ms));
const execa = require('execa');
const del = require('del');

const unlink = util.promisify(fs.unlink);

async function createTempFile() {
  const mkdtemp = util.promisify(fs.mkdtemp);
  const dir = await mkdtemp(path.join(os.tmpdir(), 'browsertime-'));
  return path.join(dir, 'winrecorder.mp4');
}

async function enableWindowRecorder(enable, driver) {
  if (enable) {
    enable = '1';
  } else {
    enable = '0';
  }
  const oldContext = driver.getContext();
  await driver.setContext('chrome');
  const script = 'windowUtils.setCompositionRecording(' + enable + ');';
  await driver.executeScript(script);
  return driver.setContext(oldContext);
}

function findRecordingDirectory() {
  let closest_mtime = 0;
  let directory = undefined;

  fs.readdirSync('.').forEach(file => {
    if (file.startsWith('windowrecording-')) {
      let mtime = fs.statSync(file).mtime;
      if (mtime > closest_mtime) {
        closest_mtime = mtime;
        directory = file;
      }
    }
  });

  log.debug('Using window recording directory: ' + directory);
  return directory;
}

async function pollDirectory(directory) {
  // We need to spin wait here until the browser is finished
  // writing out all the frame images.
  // eslint-disable-next-line no-empty
  let old_mtime = fs.statSync(directory).mtime;
  await delay(1000);
  let new_mtime = fs.statSync(directory).mtime;
  while (old_mtime.getTime() != new_mtime.getTime()) {
    log.debug(
      'Still waiting for all frames: ' +
        old_mtime.getTime() +
        ' != ' +
        new_mtime.getTime()
    );
    await delay(5000);
    old_mtime = new_mtime;
    new_mtime = fs.statSync(directory).mtime;
  }
}

async function generateVideo(destination) {
  let directoryName = findRecordingDirectory();
  await pollDirectory(directoryName);
  let imageFiles = [];

  fs.readdirSync(directoryName).forEach(file => {
    // Format of the filenames are "frame-<num>-<offset>.png"
    // where num is frame number and offset is time since capture start in ms.
    let fields = file.split('-');
    let frameno = ('0000' + fields[1]).slice(-4);
    let newFilename = 'frame' + frameno + '.png';
    let offset = fields[2].split('.')[0];
    fs.renameSync(
      path.join(directoryName, file),
      path.join(directoryName, newFilename)
    );
    imageFiles.push({ filename: newFilename, offset: offset });
  });

  imageFiles.sort(function(a, b) {
    if (a.filename < b.filename) return -1;
    if (a.filename > b.filename) return 1;
    return 0;
  });

  //First step is merging all of the png frames into a single CFR video.
  const cfr_args = [
    '-i',
    path.join(directoryName,'frame%04d.png'),
    '-vf',
    'pad=ceil(iw/2)*2:ceil(ih/2)*2',
    '-pix_fmt',
    'yuv420p',
    path.join(directoryName,'tmp-cfr.mp4')
  ];
  log.debug('Executing command: ffmpeg ' + cfr_args.join(' '));
  await execa('ffmpeg', cfr_args);

  //Final step is generating a VFR video that has the proper offsets for each frame.
  let stream = fs.createWriteStream(path.join(directoryName,'offsets.txt'));
  stream.once('open', function() {
    let firstOffset = imageFiles[0].offset;
    stream.write('0\n');
    for (let i = 1; i < imageFiles.length; i++) {
      stream.write(imageFiles[i].offset - firstOffset + '\n');
    }
    stream.end();
  });

  const vfr_args = [
    '-o',
    destination,
    '-t',
    path.join(directoryName, 'offsets.txt'),
    path.join(directoryName, 'tmp-cfr.mp4')
  ];
  log.debug('Executing command: mp4fpsmod ' + vfr_args.join(' '));
  await execa('mp4fpsmod', vfr_args);
  del(directoryName);
}

module.exports = class FirefoxWindowRecorder {
  constructor(options, browser) {
    this.options = options;
    this.browser = browser;
  }

  async start() {
    log.debug('Start firefox window recorder.');
    this.filePath = await createTempFile();
    return enableWindowRecorder(true, this.browser.getDriver());
  }

  async stop(destination) {
    log.debug('Stop firefox window recorder.');
    await enableWindowRecorder(false, this.browser.getDriver());

    // FIXME update to rename/move file
    // The destination file could exixt of we use --resultDir
    // so make sure we remove it first
    if (this.options.resultDir) {
      try {
        await unlink(destination);
      } catch (e) {
        // Nothing to see here
      }
    }
    await generateVideo(destination);
    log.debug(`Writing to ${destination}`);
  }
};
