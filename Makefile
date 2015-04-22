
TSC := tsc --target ES5 --noImplicitAny --noEmitOnError --module commonjs
NODE := node

LIBS := $(wildcard *.d.ts)

watch: $(wildcard *.ts) Makefile
	@${TSC} --watch --outDir js $(LIBS) main.ts

run: js/main.js
	@${NODE} $<

clean:
	@mkdir -p js
	@rm -f js/*.js

js/main.js: $(wildcard *.ts) Makefile
	@${TSC} --outDir js $(LIBS) main.ts

.PHONY: run watch clean
