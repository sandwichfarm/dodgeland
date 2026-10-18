# Completed payload compression:batch04

The same live full05 run reached about3.6GiB of remaining disk space. A fourth
lossless filesystem batch compressed63 previously uncompressed immutable
payloads selected from161 terminal exit0 production jobs. Existing scripts,
receipts and proof remain unchanged;payload paths and contents remain intact.

The original ledger bytes were saved and hashed before selection/replacement.
Independent verification checks the original SHA,current append-only prefix,
terminal owners,unique Node filenames,job/browser identities and all63 payload
hashes. Temporary independent non-JSON inodes were compared by SHA and size;
the original inode/mtime/size was checked unchanged before atomic replacement.
Final native compressed flags and every content hash were independently checked.
Active outputs,configs,inventory,build,logs,ledger and reports were not selected.

Per-file allocation savings total608,051,200bytes. Observed whole-volume free
space was3,692,883,968 before and4,312,915,968 after;other volume activity changes
free space independently. All410 frozen source/test/tool/config/build/lock
hashes still match. This changes no execution,counters,scope or thresholds.

New maintenance scripts/logs use compress-closed-full05-04 and
verify-closed-full05-04 under artifacts/release-coverage/storage-maintenance.
Receipt closed-full05-c674ff3e716149ed96c059c720eb5164.json includes the original
ledger snapshot and exact per-file hashes. The accompanying04-PROOF binds
scripts,logs,receipt,snapshot and freeze. Full05 remains live;its terminal
coverage result and fresh raw reconciliation are not inferred.
