module.exports = {
  requires: { privilege: true },
  collect: function() {
    const { AppConstants } = ChromeUtils.import(
      'resource://gre/modules/AppConstants.jsm'
    );
    return AppConstants;
  }
};
