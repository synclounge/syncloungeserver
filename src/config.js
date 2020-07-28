import nconf from 'nconf';

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

nconf.defaults({
  port: 8088,
  base_url: '/',
  ping_interval: 10000,
});

export default nconf;
