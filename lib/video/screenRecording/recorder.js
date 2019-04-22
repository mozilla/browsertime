'use strict';
const { isAndroidConfigured } = require('../../android');
const AndroidRecorder = require('./android/recorder');
const X11Recorder = require('./desktop/x11recorder');
const FirefoxWindowRecorder = require('./firefox/firefoxWindowRecorder');
const os = require('os');

module.exports = function getRecorder(options, browser, baseDir) {
  if (isAndroidConfigured(options)) {
    return new AndroidRecorder(options);
  } else {
    if (
      options.browser === 'firefox' &&
      (os.platform() === 'win32' || os.platform() === 'linux') &&
      options.firefox.windowRecorder
    ) {
      return new FirefoxWindowRecorder(options, browser, baseDir);
    } else {
      return new X11Recorder(options);
    }
  }
};
