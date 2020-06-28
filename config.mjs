import nconf from 'nconf';

nconf.argv()
  .env({ lowerCase: true })
  .file({ file: 'config.json' });

nconf.defaults({
  port: 8089,
  baseurl: '/',
});

export default nconf;
