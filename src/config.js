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
  })
  .file({ file: 'settings.json' });

nconf.defaults({
  port: 8089,
  base_url: '/',
});

export default nconf;
