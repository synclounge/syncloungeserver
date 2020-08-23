import nconf from 'nconf';
import defaults from './defaults';

nconf
  .argv({
    separator: '__',
    parseValues: true,
  })
  .env({
    separator: '__',
    lowerCase: true,
    parseValues: true,
  });

nconf.defaults(defaults);

export default nconf;
