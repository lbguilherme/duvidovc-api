
TSC := tsc --target ES5 --noImplicitAny --noEmitOnError --module commonjs --sourceMap
NODE := node
NODE_FLAGS := --expose-gc

js/main.js: $(wildcard src/*.ts) Makefile
	@${TSC} --outDir js src/main.ts

watch: $(wildcard *.ts) Makefile
	@${TSC} --watch --outDir js src/main.ts

run: js/main.js
	@killall duvidovc-api 2> /dev/null | cat
	@${NODE} $(NODE_FLAGS) $< 2>&1 >> log &

clean:
	@mkdir -p js
	@rm -f js/*.js

.PHONY: run watch clean
