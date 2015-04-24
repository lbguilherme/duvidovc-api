
TSC := tsc --target ES5 --noImplicitAny --noEmitOnError --module commonjs --sourceMap
NODE := node
NODE_FLAGS := --expose-gc

DECLS := $(wildcard decl/*.d.ts)

watch: $(wildcard *.ts) Makefile
	@${TSC} --watch --outDir js $(DECLS) src/main.ts

run: js/main.js
	@${NODE} $(NODE_FLAGS) $<

pm2: js/main.js
	@pm2 stop $< 2>&1 | cat > /dev/null
	@PM2_NODE_OPTIONS='$(NODE_FLAGS)' pm2 start $< --name duvidovc-api

clean:
	@mkdir -p js
	@rm -f js/*.js

js/main.js: $(wildcard src/*.ts) Makefile
	@${TSC} --outDir js $(DECLS) src/main.ts

.PHONY: run watch clean
