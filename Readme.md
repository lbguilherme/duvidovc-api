[![Build Status](https://magnum.travis-ci.com/lbguilherme/duvidovc-api.svg?token=2sKW7xqLq7hypWKUFuUt&branch=master)](https://magnum.travis-ci.com/lbguilherme/duvidovc-api)

# Installation

Project runtime dependencies:
- `npm install mongodb pmx source-map-support`

Tools for building and running:
- `sudo npm install -g typescript pm2`

# Makefile

- `make`: defaults to `make watch`
- `make watch`: builds app and keep watching for changes and rebuilding
- `make run`: runs directly
- `make pm2`: runs with PM2 (try `pm2 monit` or https://app.keymetrics.io/ later)
- `make clean`: removes any built file (should never be needed)
- `make js/main.js`: simply build and close.

**warning:** if any building error happens, nothing will be outputed and the js files will be unchanged. You are forced to fix any errors before running.

# Server setup

- `yum update`
- `yum install nodejs npm nginx git`
- `mkdir duvido && cd duvido`
- `git clone git@github.com:lbguilherme/duvidovc-server.git`
- `cd duvidovc-server`
- `npm install mongodb pmx source-map-support`
- `make pm2`
