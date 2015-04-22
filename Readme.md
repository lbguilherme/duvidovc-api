# Installation

Project runtime dependencies:
- `npm install fbgraph mongodb pmx`

Tools for building and running:
- `sudo npm install -g tsc pm2`

# Makefile

- `make`: defaults to `make watch`
- `make watch`: builds app and keep watching for changes and rebuilding
- `make run`: runs directly
- `make pm2`: runs with PM2 (try `pm2 monit` or https://app.keymetrics.io/ later)
- `make clean`: removes any built file (should never be needed)
- `make js/main.js`: simply build and close.

**warning:** if any building error happens, nothing will be outputed and the js files will be unchanged. You are forced to fix any errors before running.
