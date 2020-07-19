# SyncLounge Socket Server
This is the socket server that goes along with the [SyncLounge webapp](https://github.com/samcm/synclounge)
You can either run the socket on its own or have it serve the webapp files too.

## Installation
```sh
npm install -g syncloungesocket
```

## Usage
```sh
syncloungesocket
```

If you want to also serve the webapp:
```sh
syncloungesocket --static_path /path/to/syncloungewebapp/dist
# OR
STATIC_PATH='/path/to/syncloungewebapp/dist' syncloungesocket --static_path /path/to/syncloungewebapp/dist
```

### Options
All options can be provided as either environmental variables or arguments.

#### Port
Default is 8089
```sh
syncloungesocket --port 1234
# OR
PORT=1234 syncloungesocket
```

#### Static Path
No default. If the option isn't provided the server will not serve static files from anywhere.
If it is provided, it will serve assets from the specified directory. This option is useful
for users who want to run both the SyncLounge socket server and the webapp. Since the webapp is
static, you can just point the static path to the dist directory of the webapp and have both apps
served by this.

```sh
syncloungesocket --static_path /apps/synclounge/dist
# OR
STATIC_PATH='/apps/synclounge/dist' syncloungesocket
```


#### Base URL
Default is '/'
```sh
syncloungesocket --base_url '/somebase'
# OR
BASE_URL='/somebase' syncloungesocket
```

## Manual Building
You can also clone the repository to build it yourself or
```sh
git clone https://github.com/ttshivers/syncloungesocket.git
cd syncloungesocket
npm install
npm run build
```

Then you can run it
```sh
npm run start
```