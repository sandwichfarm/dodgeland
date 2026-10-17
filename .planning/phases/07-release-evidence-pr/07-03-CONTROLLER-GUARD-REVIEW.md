# Controller guard semantics prepared during the paused-movement refresh

Initial source review preceded execution. The later executed evidence below is separate; no source exclusion or counter suppression is introduced.
Source session-input.ts e42c0af8 is unchanged. Initial source-mapped schema
69cb172abebe20a1faefadb8709e5b1346323153028f950056586ccfdb394455 and the
full51a4bea2 remaining-zero counts identify these exact gaps. Requirements
INPUT-01/02/04/05/06 and TEST-02: stable ownership,neutral barriers,independent
repeats,mode-facing loss,optional host identity and stale replacement safety.

| Arm | Condition and consequence | Prepared genuine component proof |
| --- | --- | --- |
|4/4 at83|Right-held D-pad diagonal retains horizontal priority.|Right then up-right must not issue another hop;neutral clears priority.|
|14/3 at90|Equal analog magnitudes retain prior right priority.|Right then equal up-right retains right;neutral then diagonal selects forward.|
|17/1 at96|Blank/control-only product label uses unknown-controller.|The same sanitized lease remains assignable;blank labels grant no extra owner.|
|29/1 at139|Assigning another seat leaves unrelated remembered reservations.|Assign P3 while P1 is absent;P1 can still explicitly reclaim.|
|36/1,37/0 at165/166|Release a returned-but-unassigned reclaim lease.|Forget P1 reservation,deny reclaim,permit only fresh join;P2 remains usable.|
|43/0 at185|Repeat dispatch opens a different input context.|Seed held repeat immediately;both modal transitions require neutral/new edge.|
|44/0 at193|Repeated close is harmless.|No duplicate disconnect delivery or late input after teardown.|
|55/1 at236|Outer disconnect holds a stale lease after callback reentry.|Use public lifecycle callback and receive to replace another lease;stale outer cleanup cannot erase it. No real shell-reentrancy claim.|
|71/1 at271|Replacement hint has no corresponding reservation.|An unknown controller cannot reclaim or move a different reserved player.|
|82/0 at308|Fresh direction dispatch opens a different input context.|Seed original held edge before later repeat/navigation can act.|
|52/0 at223|Private createLease default context is omitted.|Current complete caller/value-flow proof below. Keep raw denominator; do not invoke a private method only for a hit.|

Five new test fragments are prepared outside the frozen repository at
/tmp/down-to-duck-controller-guard-cases.mjs.txt. They use the existing real
GamepadRouter and injected snapshot component contracts,with no application
hooks,private-method calls,physical-device or public-UI claim. They have NOT
been run. Append/run only after wrapper87218 is authoritatively terminal and its
source/test/tool freeze is released. Capture exact new source-identical mapped
hits before marking any initial candidate covered. The eleven other pending arms await executed tests. The private-default classification below is separate from those unexecuted cases.

The private default and reentrant guard are deliberately separated: a callback
can reenter public receive,so stale cleanup is a real exported-host boundary.
That does not authorize treating private helper defaults as public contracts.

## Private-default review

Initial52/0 is application-unreachable under current source identity,e42c0af8,
and stays zero in the raw report. This is an explicit semantic disposition,not
an Istanbul exclusion,denominator adjustment,positive-hit claim or assertion of
all possible external JavaScript behavior.

The two-target TypeScript resolved-reference audit covers all159 src files and
retains their hashes. GamepadRouter has one application constructor call,in
main.ts. Its context callback has an expression body that is a template literal,
which returns a string if evaluation completes; it cannot return undefined.
The private createLease method has one resolved call and one property reference,
no computed/dynamic access candidate. reconcile assigns snapshotContext from that
callback to a const,and passes it as the explicit second argument. The default
initializer runs only for omitted/undefined context,which this exact value flow
cannot deliver. The callback/options object is the direct unaliased literal at
the sole main constructor; all options accesses inside the reviewed class read
callbacks rather than mutating that literal. No private method is exposed by the
class's public callbacks. Malformed external callbacks or private reflection are
outside this shipped-application proof,not silently counted as measured tests.

CONTROLLER-DEFAULT-AUDIT.json retains exact source,canonical/mapped schema and
source-map identities,full source inventory,resolved references and explicit
constructor-to-const-to-call value flow. The canonical initial schema69cb172a is
unchanged; main33be7291 and session-inpute42c0af8 are unchanged in the current
paused-movement repair. All raw/global/file/mode counters and numeric floors stay
intact. Initial semantic review now records163 annotated arms:162 covered plus
one reviewed application-unreachable private default;888 still pending. Eleven
prepared input witnesses above remain unexecuted and gain no covered annotation.

## Executed controller guards

The whole existing input suite now passes22/22 ordinary and22/22 canonical:
7f0adde8-426b-45c8-95cb-18743e6ab45d,one Node parent,no browser/device or mode
claim. All17 original cases remain a byte-identical prefix of the file; five
exported component contract cases were appended. No production source changed.

The cases retain the same sanitized identity across blank labels and directional
changes,prevent held movement from crossing fresh/repeat context changes,forget
only the explicitly released returning reservation,preserve other seats,and
retain a newly observed lease across stale outer cleanup. A replacement hint
without the corresponding reservation grants no input or reclaim authority.
Repeated close delivers no second teardown. The reentrant case asserts current
lease preservation only,not physical-shell reentry or universal callback safety.

| Initial branch/arm | Source line | Canonical count | Meaning |
| --- | --- | ---: | --- |
|4/4|83|1|Right-held D-pad diagonal evaluates the existing right priority.|
|14/3|90|2|Equal analog magnitudes preserve right priority until neutral.|
|17/1|96|8|Blank/control-only names use the stable unknown-controller label.|
|29/1|139|2|Assigning P3 does not erase absent P1's reservation.|
|36/1|165|1|A returned unassigned lease has no current seat to clear.|
|37/0|166|1|Release clears that lease's remembered reclaim seat.|
|43/0|185|1|A repeat that opens a context seeds held state immediately.|
|44/0|193|1|A second close is harmless.|
|55/1|236|1|Stale cleanup leaves the replacement lease in its current slot.|
|71/1|271|1|An unsupported reservation hint remains unassigned.|
|82/0|308|1|A fresh direction that opens a context seeds held state.|

Source e42c0af8,map83a4cfad,canonical initial schema69cb172a and mapped schema
9b981f96 match current disk/initial identity. CONTROLLER-GUARD-PROOF.json retains
full hashes,exact sites/counts,original prefix check,manifest identity and logs.
Private52/0 remains zero with its separately proved application disposition and
full raw denominator. All26 initial controller-router arms are now semantically
reviewed:25 have source-identical behavioral evidence,one is the private default.
Overall initial ledger totals become174 annotated(173 covered,one reviewed
private default),877 pending. This is not a full enforcing release pass.

Normal raw9036d9a1 and rootlock5ac remain intact. Full execution inventory still
resolves143 entries/150 closure paths,155 production jobs and nine executable
controls. The focused group reuses the whole existing session-input job; no
original job,source,dependency,floor or stratum is removed.
