# Release evidence storage maintenance

Transparent macOS filesystem compression completed for 997 retained JSON
artifacts (9512475635 logical bytes). Free space increased from
2236526592 to 9726578688 bytes. No evidence contents or paths were
removed. The existing prior compression proof remains retained separately.

For each file, the script hashes the original, copies with ditto --hfsCompression,
checks a distinct destination inode, exact byte length and destination hash,
rechecks original bytes/inode/mtime, atomically replaces the path, then rechecks
its hash. Compression is required before replacement. All997 files pass. Every
hash in the committed RACE-TARGET-POLICY-PROOF also passes after maintenance.
No test or collection process was active during this operation.

- Script SHA256: de8aabeafa2afa9508fa8e9997f9536e0918d6bde791a052c8ff01f8e1c48142
- Per-file proof SHA256: 0ed0d2b5d35d42cc2e41f6d6e54be580e9bb96838d9f6327ce05e8047b2bb9fb
- Terminal log SHA256: 1e6719b7d0e24fdbd3ffcb44061342f71de53c8cce0ec592c5ebca64698d65bc

Artifacts are under artifacts/release-coverage/storage-maintenance. This makes
room for the pending fresh full run; it supplies no gameplay, coverage-floor,
conformance,visual or release-acceptance credit. DEV52 and final release work
remain. All gameplay diagnostic floors remain met.
