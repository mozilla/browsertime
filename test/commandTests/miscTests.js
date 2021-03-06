'use strict';

const path = require('path');
const Engine = require('../../lib/core/engine');

const BROWSERS = [];

if (process.env.BROWSERTIME_TEST_BROWSER) {
  BROWSERS.push(...process.env.BROWSERTIME_TEST_BROWSER.split(' '));
} else {
  BROWSERS.push('chrome', 'firefox');
}
describe('command', function() {
  let engine;

  function getPath(file) {
    return path.resolve(__dirname, '..', 'commandscripts', file);
  }

  BROWSERS.forEach(function(browser) {
    describe('misc - ' + browser, function() {
      const scripts = {
        uri: 'document.documentURI'
      };

      beforeEach(async function() {
        engine = new Engine({
          browser: browser,
          iterations: 1,
          headless: true
        });
        await engine.start();
      });

      afterEach(() => engine.stop());

      it('should be able to to run misc commands', async function() {
        const result = await engine.runMultiple([getPath('misc.js')], {
          scripts
        });
        result[0].browserScripts[0].scripts.uri.should.equal(
          'https://www.sitespeed.io/search/'
        );
      });
    });
  });
});
