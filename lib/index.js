
const _set = require('lodash/fp/set');
const _get = require('lodash/fp/get');

let cached = null;
const suffix = '_ref';

const retrieveValueFromEnv = (object, path) => {
  const ref = _get(path + suffix, object);
  if (typeof ref === 'string') {
    const value = process.env[ref];
    delete process.env[ref];
    return _set(path, value, object);
  }
  return object;
};

module.exports = function(initConfig) {
  if (!cached) {
    const env_refs = initConfig.env_refs;
    cached = env_refs.reduce( (cached, path) => retrieveValueFromEnv(cached, path), initConfig);
  }

  return cached;
};
