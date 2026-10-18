# Conformance draft source-review correction

The first pinned draft and all its exact source hashes remain intact. A new
conformance-draft-02 revision corrects a source-review finding:the held-write
path previously acknowledged without updating host memory. The new path stores
the actual observed request key/value once before the matching reply,records
that commit and verifies the stored value. A duplicate reply does not commit
again;missing-reply and no-invocation controls do not commit.

All three new modules independently pass node --check with exit0. All410 frozen
inputs and all first-draft source hashes were reverified. No unit case,browser,
collector or additional build/test chain ran. This is a draft defect caught by
source inspection,not an observed product bug or a fabricated runtime RED.

Use revision02 after terminal accepted07-03 enforcement/fresh reconciliation.
Runtime/API correctness,actual positive/negative wire observations,teardown,
fresh protocol-reference check and07-04 summary remain pending. This does not
complete07-04 or change the current coverage run's scope/results.
