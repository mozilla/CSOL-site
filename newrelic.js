/**
 * New Relic agent configuration.
 *
 * See lib/config.defaults.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
var NEWRELIC_LICENSE = process.env('NEWRELIC_LICENSE');
var NEWRELIC_APPNAME = process.env('NEWRELIC_APPNAME');
exports.config = {
  /**
   * Array of application names.
   */
  app_name : [NEWRELIC_APPNAME],

  /**
   * Your New Relic license key.
   */
  license_key : NEWRELIC_LICENSE,
  logging : {
    /**
     * Level at which to log. 'trace' is most useful to New Relic when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level : 'trace'
  }
};
