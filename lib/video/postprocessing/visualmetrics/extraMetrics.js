'use strict';

module.exports = function(metrics) {
  const videoMetrics = {};
  if (!metrics.visualReadiness) {
    metrics.visualReadiness =
      Number(metrics.lastVisualChange) - Number(metrics.firstVisualChange);
  }
  // Jack in that Visual Complete 85%, 95% and 99%
  if (metrics.visualProgress) {
    const eachLine = metrics.visualProgress.split(',');
    for (const timeAndPercentage of eachLine) {
      const [timestamp, percent] = timeAndPercentage.split('=');
      if (
        parseInt(timestamp, 10) >= 85 &&
        !metrics.visualComplete85
      ) {
        metrics.visualComplete85 = parseInt(percent, 10);
      }
      if (
        parseInt(timestamp, 10) >= 95 &&
        !metrics.visualComplete95
      ) {
        metrics.visualComplete95 = parseInt(percent, 10);
      }
      if (
        parseInt(timestamp, 10) >= 99 &&
        !metrics.visualComplete99
      ) {
        metrics.visualComplete99 = parseInt(percent, 10);
      }

      // Oh noo the painting on the screen goes backward
      // see https://github.com/sitespeedio/sitespeed.io/issues/2259#issuecomment-456878707
      if (metrics.visualComplete85 && parseInt(timestamp, 10) < 85) {
        metrics.visualComplete85 = undefined;
        metrics.visualComplete95 = undefined;
        metrics.visualComplete95 = undefined;
      } else if (
        metrics.visualComplete95 &&
        parseInt(timestamp, 10) < 95
      ) {
        metrics.visualComplete95 = undefined;
        metrics.visualComplete95 = undefined;
      } else if (
        metrics.visualComplete99 &&
        parseInt(timestamp, 10) < 99
      ) {
        metrics.visualComplete99 = undefined;
      }
    }
  }
  if (metrics.videoRecordingStart) {
    videoMetrics.videoRecordingStart = metrics.videoRecordingStart;
    delete metrics.videoRecordingStart;
  }
  videoMetrics.visualMetrics = metrics;
  return videoMetrics;
};
