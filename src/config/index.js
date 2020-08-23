import nconf from 'nconf';
import defaults from './defaults';

const get = () => {
  nconf.reset();

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

  return nconf.get();
};

export default get;
