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
