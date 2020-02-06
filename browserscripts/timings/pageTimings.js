(function() {
  const t = window.performance.getEntriesByType('navigation')[0];
  const d = 0;

  const resources = window.performance.getEntriesByType("resource");

  let resourceDuration = 0;
  for (let i = 0; i < resources.length; i++) {
    resourceDuration += resources[i].duration;
  }

  return {
    domainLookupTime: Number(
      (t.domainLookupEnd - t.domainLookupStart).toFixed(d)
    ),
    redirectionTime: Number((t.redirectEnd - t.redirectStart).toFixed(d)),
    serverConnectionTime: Number((t.connectEnd - t.connectStart).toFixed(d)),
    serverResponseTime: Number((t.responseEnd - t.requestStart).toFixed(d)),
    pageDownloadTime: Number((t.responseEnd - t.responseStart).toFixed(d)),
    domInteractiveTime: Number(t.domInteractive.toFixed(d)),
    domContentLoadedTime: Number(t.domContentLoadedEventStart.toFixed(d)),
    pageLoadTime: Number(t.loadEventStart.toFixed(d)),
    frontEndTime: Number((t.loadEventStart - t.responseEnd).toFixed(d)),
    backEndTime: Number(t.responseStart.toFixed(d)),
    resourceCount: Number(resources.length),
    resourceDuration: Number(resourceDuration)
  };
})();
