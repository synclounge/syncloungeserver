import nconf from 'nconf';

nconf.argv()
  .env({ lowerCase: true })
  .file({ file: 'settings.json' });

nconf.defaults({
  port: 8089,
  base_url: '/',
});

export default nconf;
