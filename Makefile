
TSC := tsc --target ES5 --noImplicitAny --noEmitOnError --module commonjs --sourceMap
NODE := node
NODE_FLAGS := --expose-gc

watch: $(wildcard *.ts) Makefile
	@${TSC} --watch --outDir js src/main.ts

run: js/main.js
	@killall duvidovc-api 2> /dev/null | cat
	@${NODE} $(NODE_FLAGS) $<

pm2: js/main.js
	@pm2 stop $< 2>&1 | cat > /dev/null
	@PM2_NODE_OPTIONS='$(NODE_FLAGS)' pm2 start $< --name duvidovc-api

clean:
	@mkdir -p js
	@rm -f js/*.js

js/main.js: $(wildcard src/*.ts) Makefile
	@${TSC} --outDir js src/main.ts

.PHONY: run watch clean
