# Standalone coverage dependency audit

Audited 2026-10-16 before installation. Official exact-version registry JSON was fetched with curl over HTTPS; npm/Node network currently fails EBADF. All five registry records identify https://github.com/istanbuljs/istanbuljs and their matching packages/ subdirectory. No metadata was fabricated or package tarball extracted. Installation uses normal pnpm with scripts disabled, its own lock, and no root dependency changes. TypeScript will resolve deliberately from the existing root5.9.3 dependency; no additional TypeScript install.

## istanbul-lib-instrument@6.0.3

Registry: https://registry.npmjs.org/istanbul-lib-instrument/6.0.3
Metadata SHA256: d4c4245d6edef1e4afea100d112db42f7ff20fe6e85094eef255b2ffa275d2a2
Repository: git+ssh://git@github.com/istanbuljs/istanbuljs.git, packages/istanbul-lib-instrument
Integrity: sha512-Vtgk7L/R2JHyyGW07spoFlB8/lpjiOLTjMdms6AFMraYt3BaJauod/NGrfnVG/y4Ix1JEuMRPDPEj2ua+zz1/Q==
Scripts: {"test":"nyc mocha"}
Dependencies: {"semver":"^7.5.4","@babel/core":"^7.23.9","@babel/parser":"^7.23.9","@istanbuljs/schema":"^0.1.3","istanbul-lib-coverage":"^3.2.0"}

## istanbul-lib-coverage@3.2.2

Registry: https://registry.npmjs.org/istanbul-lib-coverage/3.2.2
Metadata SHA256: 6fa8d50ef35715b0ec31c37947d61fd27a007c797c6f44390687cb7121366e26
Repository: git+ssh://git@github.com/istanbuljs/istanbuljs.git, packages/istanbul-lib-coverage
Integrity: sha512-O8dpsF+r0WV/8MNRKfnmrtCWhuKjxrq2w+jpzBL5UZKTi2LeVWnWOmWRxFlesJONmc+wLAGvKQZEOanko0LFTg==
Scripts: {"test":"nyc mocha"}
Dependencies: {}

## istanbul-lib-source-maps@5.0.6

Registry: https://registry.npmjs.org/istanbul-lib-source-maps/5.0.6
Metadata SHA256: b99d48382923527db781b1c221fc2e2fd37121760b5dcf63be189866c5ca72bd
Repository: git+ssh://git@github.com/istanbuljs/istanbuljs.git, packages/istanbul-lib-source-maps
Integrity: sha512-yg2d+Em4KizZC5niWhQaIomgf5WlL4vOOjZ5xGCmF8SnPE/mDWWXgvRExdcpCgh9lLRRa1/fSYp2ymmbJ1pI+A==
Scripts: {"test":"nyc mocha"}
Dependencies: {"debug":"^4.1.1","istanbul-lib-coverage":"^3.0.0","@jridgewell/trace-mapping":"^0.3.23"}

## istanbul-lib-report@3.0.1

Registry: https://registry.npmjs.org/istanbul-lib-report/3.0.1
Metadata SHA256: 9666d6b7bed63ccd388163f05aaa5b42f4313707c12956a671db3f024a6ed0e5
Repository: git+ssh://git@github.com/istanbuljs/istanbuljs.git, packages/istanbul-lib-report
Integrity: sha512-GCfE1mtsHGOELCU8e/Z7YWzpmybrx/+dSTfLrvY8qRmaY6zXTKWn6WQIjaAFw069icm6GVMNkgu0NzI4iPZUNw==
Scripts: {"test":"nyc mocha"}
Dependencies: {"make-dir":"^4.0.0","supports-color":"^7.1.0","istanbul-lib-coverage":"^3.0.0"}

## istanbul-reports@3.2.0

Registry: https://registry.npmjs.org/istanbul-reports/3.2.0
Metadata SHA256: 91ae572cadba4536fce4ff0ff2f1c2103917ca41ac8066b3026206e0f1626873
Repository: git+ssh://git@github.com/istanbuljs/istanbuljs.git, packages/istanbul-reports
Integrity: sha512-HGYWWS/ehqTV3xN10i23tkPkpH46MLCIMFNCaaKNavAXTF1RkqxawEPtnjnGZ6XKSInBKkiOA5BKS+aZiY3AvA==
Scripts: {"test":"nyc mocha --recursive","prepare":"webpack --config lib/html-spa/webpack.config.js --mode production","prepare:watch":"webpack --config lib/html-spa/webpack.config.js --watch --mode development"}
Dependencies: {"html-escaper":"^2.0.0","istanbul-lib-report":"^3.0.0"}

No preinstall/install/postinstall hooks appear in direct metadata. istanbul-reports has prepare/prepare:watch webpack scripts; all lifecycle scripts are disabled during install. Transitive exact resolution, script audit and frozen reinstall are still pending normal package-manager success. No coverage claim.

## Normal installation checkpoint

`pnpm --dir tools/release-coverage install --ignore-workspace --ignore-scripts --fetch-retries=0 --fetch-timeout=10000` exited1. It reported50 resolved packages but failed the network fetch of node-releases2.0.54 with EBADF, through instrument → @babel/core7.29.7 → helper-compilation-targets → browserslist. No standalone lock was produced; partial ignored node_modules is not a validated installation. Full log: /tmp/down-to-duck-07-01-install.log.

The preceding npm query (session37603) also exited1 with EBADF. PTY/zero retries and disabled network-family autoselection did not resolve it; a direct Node HTTPS request with explicit family4 produced `connect EBADF 104.16.7.34:443`, and family autoselection disabled exposed the same error on IPv6. curl's standard HTTPS reads succeeded for all five exact official metadata records. This distinguishes Node/package-manager transport failure from missing/malicious packages; it does not prove transitive install integrity or authorize a hidden tarball workaround. Restore a working normal Node/package-manager transport, rerun this exact isolated install and transitive audit, then continue calibration. Root pnpm-lock remains byte-identical to the immutable solo oracle.

Bounded alternate-runtime investigation: PATH has only Node26.11.1, but existing Homebrew Cellar has25.2.1 and26.7.0. Their old simdjson/simdutf libraries also remain installed. Per-command DYLD_LIBRARY_PATH restored the matching libraries without changing system links or installing anything; both binaries printed their correct versions and reproduced HTTPS EBADF against the official registry. Logs: /tmp/down-to-duck-07-01-node25-restored.log and /tmp/down-to-duck-07-01-node267-restored.log. Standard nvm/volta/fnm/mise/asdf Node locations yielded no further installed candidate. The blocker therefore survives three existing Node versions, not merely26.11.1.

## Resolved transport and installed-tree audit

Root resolved normal installation using already-installed Bun1.3.14 to execute the exact pinned pnpm10.8.0 CLI (session86029exit0; /tmp/down-to-duck-07-bun-pnpm-install.log). This changed only the CLI runtime, not package resolution or extraction. Normal pnpm frozen reinstall then exited0 (/tmp/down-to-duck-07-normal-frozen-reinstall.log). Portable default remains pnpm; no local CLI cache path is needed in committed commands. Earlier blocked evidence above is superseded, not erased.

Installed50 unique exact packages; all50 lock entries have sha512 integrity. Lock SHA256: 9dd52f24a911020c4cfe403265e057c1ceebeaaaeb8c3c340d9bd9b6f33bbfaf. Installed package scripts/repositories inspected below; lifecycle scripts remain disabled. Dependencies are standard Babel/Istanbul mapping/report dependencies, not an adapted Babel export shim. Existing root TypeScript resolved version 5.9.3.

| Exact installed package | Scripts (never executed by install) | Repository |
|---|---|---|
| @babel/code-frame@7.29.7 | {} | https://github.com/babel/babel.git |
| @babel/compat-data@7.29.7 | {"build-data":"./scripts/download-compat-table.sh && node ./scripts/build-data.mjs && node ./scripts/build-modules-support.mjs && node ./scripts/build-bugfixes-targets.mjs"} | https://github.com/babel/babel.git |
| @babel/core@7.29.7 | {} | https://github.com/babel/babel.git |
| @babel/generator@7.29.8 | {} | https://github.com/babel/babel.git |
| @babel/helper-compilation-targets@7.29.7 | {} | https://github.com/babel/babel.git |
| @babel/helper-globals@7.29.7 | {} | https://github.com/babel/babel.git |
| @babel/helper-module-imports@7.29.7 | {} | https://github.com/babel/babel.git |
| @babel/helper-module-transforms@7.29.7 | {} | https://github.com/babel/babel.git |
| @babel/helper-string-parser@7.29.7 | {} | https://github.com/babel/babel.git |
| @babel/helper-validator-identifier@7.29.7 | {} | https://github.com/babel/babel.git |
| @babel/helper-validator-option@7.29.7 | {} | https://github.com/babel/babel.git |
| @babel/helpers@7.29.10 | {} | https://github.com/babel/babel.git |
| @babel/parser@7.29.9 | {} | https://github.com/babel/babel.git |
| @babel/template@7.29.7 | {} | https://github.com/babel/babel.git |
| @babel/traverse@7.29.10 | {} | https://github.com/babel/babel.git |
| @babel/types@7.29.8 | {} | https://github.com/babel/babel.git |
| @istanbuljs/schema@0.1.6 | {"test":"nyc node --test test/test.js","test:update-snapshots":"nyc node --test --test-update-snapshots test/test.js"} | git+https://github.com/istanbuljs/schema.git |
| @jridgewell/gen-mapping@0.3.13 | {"benchmark":"run-s build:code benchmark:*","benchmark:install":"cd benchmark && npm install","benchmark:only":"node --expose-gc benchmark/index.js","build":"run-s -n build:code build:types","build:code":"node ../../esbuild.mjs gen-mapping.ts","build:types":"run-s build:types:force build:types:emit build:types:mts","build:types:force":"rimraf tsconfig.build.tsbuildinfo","build:types:emit":"tsc --project tsconfig.build.json","build:types:mts":"node ../../mts-types.mjs","clean":"run-s -n clean:code clean:types","clean:code":"tsc --build --clean tsconfig.build.json","clean:types":"rimraf dist types","test":"run-s -n test:types test:only test:format","test:format":"prettier --check '{src,test}/**/*.ts'","test:only":"mocha","test:types":"eslint '{src,test}/**/*.ts'","lint":"run-s -n lint:types lint:format","lint:format":"npm run test:format -- --write","lint:types":"npm run test:types -- --fix","prepublishOnly":"npm run-s -n build test"} | git+https://github.com/jridgewell/sourcemaps.git |
| @jridgewell/remapping@2.3.5 | {"benchmark":"run-s build:code benchmark:*","benchmark:install":"cd benchmark && npm install","benchmark:only":"node --expose-gc benchmark/index.js","build":"run-s -n build:code build:types","build:code":"node ../../esbuild.mjs remapping.ts","build:types":"run-s build:types:force build:types:emit build:types:mts","build:types:force":"rimraf tsconfig.build.tsbuildinfo","build:types:emit":"tsc --project tsconfig.build.json","build:types:mts":"node ../../mts-types.mjs","clean":"run-s -n clean:code clean:types","clean:code":"tsc --build --clean tsconfig.build.json","clean:types":"rimraf dist types","test":"run-s -n test:types test:only test:format","test:format":"prettier --check '{src,test}/**/*.ts'","test:only":"mocha","test:types":"eslint '{src,test}/**/*.ts'","lint":"run-s -n lint:types lint:format","lint:format":"npm run test:format -- --write","lint:types":"npm run test:types -- --fix","prepublishOnly":"npm run-s -n build test"} | git+https://github.com/jridgewell/sourcemaps.git |
| @jridgewell/resolve-uri@3.1.2 | {"prebuild":"rm -rf dist","build":"run-s -n build:*","build:rollup":"rollup -c rollup.config.js","build:ts":"tsc --project tsconfig.build.json","lint":"run-s -n lint:*","lint:prettier":"npm run test:lint:prettier -- --write","lint:ts":"npm run test:lint:ts -- --fix","pretest":"run-s build:rollup","test":"run-s -n test:lint test:only","test:debug":"mocha --inspect-brk","test:lint":"run-s -n test:lint:*","test:lint:prettier":"prettier --check '{src,test}/**/*.ts'","test:lint:ts":"eslint '{src,test}/**/*.ts'","test:only":"mocha","test:coverage":"c8 mocha","test:watch":"mocha --watch","prepublishOnly":"npm run preversion","preversion":"run-s test build"} | https://github.com/jridgewell/resolve-uri |
| @jridgewell/sourcemap-codec@1.6.0 | {"benchmark":"run-s build:code benchmark:*","benchmark:install":"cd benchmark && npm install","benchmark:only":"node --expose-gc benchmark/index.js","build":"run-s -n build:code build:types","build:code":"node ../../esbuild.mjs sourcemap-codec.ts","build:types":"run-s build:types:force build:types:emit build:types:mts","build:types:force":"rimraf tsconfig.build.tsbuildinfo","build:types:emit":"tsc --project tsconfig.build.json","build:types:mts":"node ../../mts-types.mjs","clean":"run-s -n clean:code clean:types","clean:code":"tsc --build --clean tsconfig.build.json","clean:types":"rimraf dist types","test":"run-s -n test:types test:only test:format","test:format":"prettier --check '{src,test}/**/*.ts'","test:only":"mocha","test:types":"eslint '{src,test}/**/*.ts'","test:watch":"mocha --watch","lint":"run-s -n lint:types lint:format","lint:format":"npm run test:format -- --write","lint:types":"npm run test:types -- --fix","prepublishOnly":"npm run-s -n build test"} | git+https://github.com/jridgewell/sourcemaps.git |
| @jridgewell/trace-mapping@0.3.31 | {"benchmark":"run-s build:code benchmark:*","benchmark:install":"cd benchmark && npm install","benchmark:only":"node --expose-gc benchmark/index.mjs","build":"run-s -n build:code build:types","build:code":"node ../../esbuild.mjs trace-mapping.ts","build:types":"run-s build:types:force build:types:emit build:types:mts","build:types:force":"rimraf tsconfig.build.tsbuildinfo","build:types:emit":"tsc --project tsconfig.build.json","build:types:mts":"node ../../mts-types.mjs","clean":"run-s -n clean:code clean:types","clean:code":"tsc --build --clean tsconfig.build.json","clean:types":"rimraf dist types","test":"run-s -n test:types test:only test:format","test:format":"prettier --check '{src,test}/**/*.ts'","test:only":"mocha","test:types":"eslint '{src,test}/**/*.ts'","lint":"run-s -n lint:types lint:format","lint:format":"npm run test:format -- --write","lint:types":"npm run test:types -- --fix","prepublishOnly":"npm run-s -n build test"} | git+https://github.com/jridgewell/sourcemaps.git |
| baseline-browser-mapping@2.11.29 | {"fix-cli-permissions":"output=$(npx baseline-browser-mapping 2>&1); path=$(printf '%s\n' \"$output\" | sed -n 's/^.*: \\(.*\\): Permission denied$/\\1/p; t; s/^\\(.*\\): Permission denied$/\\1/p'); if [ -n \"$path\" ]; then echo \"Permission denied for: $path\"; echo \"Removing $path ...\"; rm -rf \"$path\"; else echo \"$output\"; fi","test:format":"npx prettier --check .","test:lint":"npx eslint .","test:legacy-test":"node spec/legacy-tests/legacy-test.cjs; node dist/cli.cjs","test:jasmine":"npx jasmine","test:jasmine-browser":"npx jasmine-browser-runner runSpecs --config ./spec/support/jasmine-browser.js","test":"npm run build && npm run fix-cli-permissions && npm run test:format && npm run test:lint && npm run test:jasmine && npm run test:jasmine-browser","build":"rm -rf dist; npx prettier . --write; rollup -c; rm -rf ./dist/scripts/expose-data.d.ts ./dist/cli.d.ts","refresh-downstream":"npx tsx scripts/refresh-downstream.ts","refresh-static":"npx tsx scripts/refresh-static.ts","update-timeline":"npx tsx scripts/create-timeline.ts; npx prettier ./src/data/timeline.js --write","update-data-dependencies":"npm i @mdn/browser-compat-data@latest web-features@latest -D","check-timeline-changes":"git diff --name-only | grep -q '^src/data/timeline.js$' && echo 'changes-available=TRUE' || echo 'changes-available=FALSE'"} | git+https://github.com/web-platform-dx/baseline-browser-mapping.git |
| browserslist@4.29.3 | {} | browserslist/browserslist |
| caniuse-lite@1.0.30001816 | {} | browserslist/caniuse-lite |
| convert-source-map@2.0.0 | {"test":"tap test/*.js --color"} | git://github.com/thlorenz/convert-source-map.git |
| debug@4.4.3 | {"lint":"xo","test":"npm run test:node && npm run test:browser && npm run lint","test:node":"mocha test.js test.node.js","test:browser":"karma start --single-run","test:coverage":"cat ./coverage/lcov.info | coveralls"} | git://github.com/debug-js/debug.git |
| electron-to-chromium@1.5.458 | {"build":"node build.mjs","update":"node automated-update.js","test":"nyc ava --verbose","report":"nyc report --reporter=text-lcov > coverage.lcov"} | git+https://github.com/Kilian/electron-to-chromium.git |
| escalade@3.2.0 | {"build":"bundt","pretest":"npm run build","test":"uvu -r esm test -i fixtures"} | lukeed/escalade |
| gensync@1.0.0-beta.2 | {"test":"jest"} | https://github.com/loganfsmyth/gensync.git |
| has-flag@4.0.0 | {"test":"xo && ava && tsd"} | sindresorhus/has-flag |
| html-escaper@2.0.2 | {"build":"npm run cjs && npm run rollup && npm run minify && npm test && npm run size","cjs":"ascjs esm cjs","coveralls":"cat ./coverage/lcov.info | coveralls","minify":"uglifyjs index.js --comments=/^!/ --compress --mangle -o min.js","rollup":"rollup --config rollup.config.js","size":"cat index.js | wc -c;cat min.js | wc -c;gzip -c min.js | wc -c","test":"istanbul cover ./test/index.js"} | https://github.com/WebReflection/html-escaper.git |
| istanbul-lib-coverage@3.2.2 | {"test":"nyc mocha"} | git+ssh://git@github.com/istanbuljs/istanbuljs.git |
| istanbul-lib-instrument@6.0.3 | {"test":"nyc mocha"} | git+ssh://git@github.com/istanbuljs/istanbuljs.git |
| istanbul-lib-report@3.0.1 | {"test":"nyc mocha"} | git+ssh://git@github.com/istanbuljs/istanbuljs.git |
| istanbul-lib-source-maps@5.0.6 | {"test":"nyc mocha"} | git+ssh://git@github.com/istanbuljs/istanbuljs.git |
| istanbul-reports@3.2.0 | {"test":"nyc mocha --recursive","prepare":"webpack --config lib/html-spa/webpack.config.js --mode production","prepare:watch":"webpack --config lib/html-spa/webpack.config.js --watch --mode development"} | git+ssh://git@github.com/istanbuljs/istanbuljs.git |
| js-tokens@4.0.0 | {"test":"mocha --ui tdd","esprima-compare":"node esprima-compare ./index.js everything.js/es5.js","build":"node generate-index.js","dev":"npm run build && npm test"} | lydell/js-tokens |
| jsesc@3.1.0 | {"build":"grunt template","coveralls":"istanbul cover --verbose --dir 'coverage' 'tests/tests.js' && coveralls < coverage/lcov.info'","cover":"istanbul cover --report 'html' --verbose --dir 'coverage' 'tests/tests.js'","test":"mocha tests"} | https://github.com/mathiasbynens/jsesc.git |
| json5@2.2.3 | {"build":"rollup -c","build-package":"node build/package.js","build-unicode":"node build/unicode.js","coverage":"tap --coverage-report html test","lint":"eslint --fix .","lint-report":"eslint .","prepublishOnly":"npm run production","preversion":"npm run production","production":"run-s test build","tap":"tap -Rspec --100 test","test":"run-s lint-report tap","version":"npm run build-package && git add package.json5"} | git+https://github.com/json5/json5.git |
| lru-cache@5.1.1 | {"test":"tap test/*.js --100 -J","snap":"TAP_SNAPSHOT=1 tap test/*.js -J","coveragerport":"tap --coverage-report=html","preversion":"npm test","postversion":"npm publish","postpublish":"git push origin --all; git push origin --tags"} | git://github.com/isaacs/node-lru-cache.git |
| make-dir@4.0.0 | {"test":"xo && nyc ava && tsd"} | sindresorhus/make-dir |
| ms@2.1.3 | {"precommit":"lint-staged","lint":"eslint lib/* bin/*","test":"mocha tests.js"} | vercel/ms |
| node-releases@2.0.59 | {"build":"node scripts/build.js"} | https://github.com/chicoxyzzy/node-releases.git |
| picocolors@1.1.1 | {} | alexeyraspopov/picocolors |
| semver@6.3.1 | {"test":"tap test/ --100 --timeout=30","lint":"echo linting disabled","postlint":"template-oss-check","template-oss-apply":"template-oss-apply --force","lintfix":"npm run lint -- --fix","snap":"tap test/ --100 --timeout=30","posttest":"npm run lint"} | https://github.com/npm/node-semver.git |
| semver@7.8.5 | {"test":"tap","snap":"tap","lint":"npm run eslint","postlint":"template-oss-check","lintfix":"npm run eslint -- --fix","posttest":"npm run lint","template-oss-apply":"template-oss-apply --force","eslint":"eslint \"**/*.{js,cjs,ts,mjs,jsx,tsx}\""} | git+https://github.com/npm/node-semver.git |
| supports-color@7.2.0 | {"test":"xo && ava"} | chalk/supports-color |
| update-browserslist-db@1.3.4 | {} | browserslist/update-db |
| yallist@3.1.1 | {"test":"tap test/*.js --100","preversion":"npm test","postversion":"npm publish","postpublish":"git push origin --all; git push origin --tags"} | git+https://github.com/isaacs/yallist.git |
