
TSC := tsc --target ES5 --noImplicitAny --noEmitOnError --module commonjs
NODE := node

DECLS := $(wildcard decl/*.d.ts)

watch: $(wildcard *.ts) Makefile
	@${TSC} --watch --outDir js $(DECLS) main.ts

run: js/main.js
	@${NODE} $<

clean:
	@mkdir -p js
	@rm -f js/*.js

js/main.js: $(wildcard *.ts) Makefile
	@${TSC} --outDir js $(DECLS) main.ts

.PHONY: run watch clean
