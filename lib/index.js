
const _set = require('lodash/fp/set');
const _get = require('lodash/fp/get');

let cached = null;
const suffix = '_ref';

const retrieveValueFromEnv = (object, path) => {
  const ref = _get(path + suffix, object);
  if (typeof ref === 'string') {
    const value = process.env[ref];
    if (typeof value !== 'undefined') {
      delete process.env[ref];
      return _set(path, value, object);
    } else if (typeof _get(path , object) === 'undefined') {
      /* ENV not available nor the value hard-coded */
      console.warn(`No value found for ${path} in ${ref}, nor value hard-coded for ${path}`);
    }
  }
  return object;
};

const buildCacheConfig = (initConfig) => {
  return (initConfig.env_refs || []).reduce( retrieveValueFromEnv, initConfig); 
}

module.exports = function(initConfig) {
  if (!cached) {
    cached = buildCacheConfig(initConfig);
  }

  return cached;
};
