[github-release-badge]: https://img.shields.io/github/workflow/status/synclounge/syncloungeserver/release?label=release&style=for-the-badge
[docker-version-badge]: https://img.shields.io/docker/v/synclounge/syncloungeserver?label=Docker&sort=semver&style=for-the-badge
[docker-latest-size-badge]: https://img.shields.io/docker/image-size/synclounge/syncloungeserver?sort=semver&style=for-the-badge
[docker-pulls-badge]: https://img.shields.io/docker/pulls/synclounge/syncloungeserver?style=for-the-badge
[npm-badge]: https://img.shields.io/npm/v/syncloungeserver?style=for-the-badge
[dependencies-badge]: https://img.shields.io/david/synclounge/syncloungeserver?style=for-the-badge
[devdependencies-badge]: https://img.shields.io/david/dev/synclounge/syncloungeserver?style=for-the-badge
[optionaldependencies-badge]: https://img.shields.io/david/optional/synclounge/syncloungeserver?style=for-the-badge
[license-badge]: https://img.shields.io/github/license/synclounge/syncloungeserver?style=for-the-badge
[release-action-link]: https://github.com/synclounge/syncloungeserver/actions?query=workflow%3Arelease+branch%3Amaster "Release action"
[dockerhub-link]: https://hub.docker.com/r/synclounge/syncloungeserver "Docker images of SyncLounge"
[dockerhub-tags-link]: https://hub.docker.com/r/synclounge/syncloungeserver/tags "Docker tags of Synclounge"
[docker-microbadger-link]: https://microbadger.com/images/synclounge/syncloungeserver "Docker size"
[npm-link]: https://www.npmjs.com/package/syncloungeserver "NPM package"
[dependencies-link]: https://david-dm.org/synclounge/syncloungeserver
[devdependencies-link]: https://david-dm.org/synclounge/syncloungeserver?type=dev
[optionaldependencies-link]: https://david-dm.org/synclounge/syncloungeserver?type=optional
[license-link]: https://opensource.org/licenses/MIT "MIT License"

![SyncLounge](https://app.synclounge.tv/logo-long-dark.png)

[![npm][npm-badge]][npm-link]
[![Docker Version][docker-version-badge]][dockerhub-link]
[![Docker Size][docker-latest-size-badge]][dockerhub-link]
[![Docker Pulls][docker-pulls-badge]][dockerhub-link]
[![Release][github-release-badge]][release-action-link]
[![Dependencies][dependencies-badge]][dependencies-link]
[![Dev Dependencies][devdependencies-badge]][devdependencies-link]
[![Optional Dependencies][optionaldependencies-badge]][optionaldependencies-link]
[![License][license-badge]][license-link]

# SyncLounge Socket Server

This is the socket server that goes along with the [SyncLounge webapp](https://github.com/ttshivers/synclounge). You probably want to check that out unless you just want to run this socket server, since the webapp also includes this.

This socket server can be used as just a binary or can be included as a library, like it is with the [webapp](https://github.com/ttshivers/synclounge/blob/master/server.js)

## Installation

```sh
npm install -g syncloungeserver
```

## Usage

```sh
syncloungeserver
```

If you want to also serve the webapp:

```sh
syncloungeserver --static_path /path/to/syncloungewebapp/dist
# OR
STATIC_PATH='/path/to/syncloungewebapp/dist' syncloungeserver
```

### Options

All options can be provided as either environmental variables or arguments.

#### Port

Default is 8088

```sh
syncloungeserver --port 1234
# OR
PORT=1234 syncloungeserver
```

#### Static Path

No default. If the option isn't provided the server will not serve static files from anywhere.
If it is provided, it will serve assets from the specified directory. This option is useful
for users who want to run both the SyncLounge socket server and the webapp. Since the webapp is
static, you can just point the static path to the dist directory of the webapp and have both apps
served by this.

```sh
syncloungeserver --static_path /apps/synclounge/dist
# OR
STATIC_PATH='/apps/synclounge/dist' syncloungeserver
```

#### Base URL

Default is '/'

```sh
syncloungeserver --base_url '/somebase'
# OR
BASE_URL='/somebase' syncloungeserver
```

#### Ping Interval

Default is 10000 ms

```sh
syncloungeserver --ping_interval 10000
# OR
PING_INTERVAL=10000 syncloungeserver
```

## Manual Building

You can also clone the repository to build it yourself or

```sh
git clone https://github.com/synclounge/syncloungeserver.git
cd syncloungeserver
npm install
npm run build
```

Then you can run it

```sh
npm run start
```
