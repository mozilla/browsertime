'use strict';
const { isAndroidConfigured } = require('../../android');
const AndroidRecorder = require('./android/recorder');
const X11Recorder = require('./desktop/x11recorder');
const FirefoxRecorder = require('./desktop/firefoxrecorder');
const os = require('os');

module.exports = function getRecorder(options, browser) {
  if (isAndroidConfigured(options)) {
    return new AndroidRecorder(options);
  } else {
    if (
      options.browser === 'firefox' &&
      os.platform() === 'win32' &&
      options.firefox.windowRecorder
    ) {
      return new FirefoxRecorder(options, browser);
    } else {
      return new X11Recorder(options);
    }
  }
};
