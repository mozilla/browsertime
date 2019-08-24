module.exports = {
  requires: { privilege: true },
  pre: function() {},
  collect: async function() {
    return new Promise(resolve => {
      const { AppConstants } = ChromeUtils.import(
        'resource://gre/modules/AppConstants.jsm'
      );
      resolve(AppConstants);
    });
  }
};
