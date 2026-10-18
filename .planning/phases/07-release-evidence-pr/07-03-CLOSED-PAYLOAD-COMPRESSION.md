# Lossless compression of completed full05 payloads

The full05 process remains active. With about3.6GiB free,119 closed payload
files from51 already-terminal production jobs were transparently compressed.
Observed free space afterward was3.94GiB;other processes share this volume.
No payload content/path was deleted. No execution,counter,source/build/lock,
coverage profile or floor changes are attributed to this maintenance.

This narrows the earlier maintenance restriction against mutating active
collection paths:only an already-terminal job's immutable inputs are eligible.
The collector reads their JSON bytes/identity,not inode/compression flags. The
active job,its outputs,inventory/config/build/log/ledger/report files are never
selected. Conditions are checked before each replacement:

1. The persisted full-run ledger records the exact owner job/file with exit0.
   The worker has returned through the strict runner;the parent only appends
   further terminal jobs. Re-read owner receipt immediately before mutation.
2. For Node parents,the job config fixes its run/worker/realm filename. All
   frozen full-registry Node filenames are unique,including repeated-job realm
   overrides. Model sidecars use the exact unique config output. Browser rows
   must be collected,carry this run ID,and name the completed owner job. Future
   jobs use distinct identities;no live output is claimed as closed evidence.
3. Select regular files only. Create an independent temporary inode with a
   non-JSON suffix/dot prefix,so the collector cannot discover another payload.
   Native ditto compression must set UF_COMPRESSED and preserve byte size.
4. Verify original/destination SHA256 and unchanged original inode/mtime/size
   before atomic replacement. Verify final SHA immediately and again for every
   selected file after the batch. All119 content hashes match.

The original ledger SHA was recorded before selection. Afterward,the current
append-only prefix was reconstructed and its exact serialized bytes matched
that original SHA;those authenticated prefix bytes are retained as a separate
snapshot. This is evidence reconstruction from a matching digest,not a newly
invented test outcome. The verifier checks all51 owner identities,all browser
collected/run/owner metadata and all410 frozen source/test/tool/config/build/
lock SHA. There are zero freeze changes.

`07-03-CLOSED-PAYLOAD-COMPRESSION-PROOF.json` binds the native script,log,per-file
receipts,authenticated ledger snapshot and independent verification script.
Artifacts live under `artifacts/release-coverage/storage-maintenance/` with
`closed-full05-06619afb28ed4aafb481c7be92b338e4` and `compress-closed-full05` names.
The first script/receipt is retained verbatim if later batches need an improved
snapshot writer. Existing failed/full/focused reports remain at original paths.

Only filesystem storage changed. The single full05 test/build/report chain is
still authoritative and uncompleted. Semantic audit,standalone scene cases,
07-04/05/06 and opening the PR remain required.
