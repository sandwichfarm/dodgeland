# Team results and seed-copy residual review

This reviews18 original current-full zero arms:14 in survive-results-ui and4
in seed-copy. All remain counted. This records inspected source/behavior
authority, not new execution, a coverage exclusion or a final visual signoff.

**UI-04/05,SOLO-01,TEST-03/04/05.** Team results must preserve the committed
per-character contributions, use an equal-height unranked team perch, retain
usable focus/pages at small sizes, and expose the actual completed course seed.
Clipboard permission denial must leave that seed available for manual copying.

## Team result conditions

| Arms | Consequence and evidence boundary |
|---|---|
|2/1 at17|An active contribution displays Active. Actual settled Survive results have no living active players when all-dead settlement occurs; departed/disconnected archives remain distinct. The generic snapshot presenter retains the active label without asserting that state occurred in an all-dead result. The component fixture checks Down/Disconnected/Left run against supplied immutable contributions.|
|6/0 at41|Missing result or disposed component prevents rebuilding DOM. show installs the snapshot before render; resize guards missing/hidden state; disposal hides, clears and removes event listeners. The explicit guard remains counted. Component teardown and repeated show checks do not manufacture a direct late private-render call.|
|15/1 at64|Seed-page rebuild restores a previously focused action if present. The seed action's transition first removes the results DOM, then explicitly focuses seed-copy. Resize deliberately avoids rebuilding the seed page, preserving selection and feedback. Existing seed tests prove those flows; this inner prior-action alternative remains zero.|
|18/1 at79|Unknown seat marker falls back to ◆. Supported roster seats p1–p4 have explicit markers. Rendered participant identity, lifecycle and all four metrics are checked across pages; custom snapshot seats remain a generic presentation fallback.|
|26/1 at104|Absent seed omits the Seed action. Main always passes the real game.seedCode for team results; the optional component API can omit it. Built seed integration checks the real versioned token inside the modal, without claiming an absent-token case.|
|33/1;34/0;34/1;36/0 at114–115|Resize chooses seed-copy or again when no last-focused action exists or an action cannot be restored. Normal focusin records the stable action, and seed pages retain their DOM. Component tests traverse every result/metric, resize below and above the size floor, and retain visible focus. Built integration verifies seed selection and Tab remain inside the modal after resize. These default operands remain distinct from the observed lastFocusedAction route.|
|41/0 at124|Tab with no visible enabled controls is swallowed. Supported rendered pages always include Hop again or Back/Copy; below the minimum frame, CSS hides the sheet and shows the size notice. Empty-control handling is a retained keyboard defense. Component tests verify minimum notice and normal focus retention; no hidden-control key event is falsely credited.|
|48/1 at141|Null/omitted seed becomes undefined before comparing the snapshot. Main's completed run supplies a nonempty versioned token. This API normalization has no influence on result metrics or game ownership and stays counted.|
|51/1 at143|Showing a changed snapshot while already visible keeps the original return focus/inert snapshot. First show captures those values; repeated identical show is an earlier no-op. Main keeps the frozen result object, and component tests assert repeated show does not reset paging. A generic changed-visible-snapshot call is not claimed executed.|
|52/1 at144;53/1 at145|Non-HTMLElement focus yields no restoration target;detached root has no siblings to make inert. The shipped root is appended to #app before construction. Component tests verify original button focus returns and preexisting inert siblings stay inert. The generic detached/no-element defaults remain counted.|

The result component reads only its frozen snapshot; paging, resize, seed copy
and returning to results never call gameplay transactions. Tests assert the
snapshot remains byte-identical. The built integration arranges completed train
deaths and declines existing offers; it does not claim physical train collision
geometry or natural game completion as part of that presentation proof.

## Seed-copy conditions

| Arms | Consequence and evidence boundary |
|---|---|
|0/0 at20|Disposed, absent-code or disabled copy exits. Browser-disabled buttons cannot dispatch normal user clicks;dispose removes click/keyboard listeners and increments the generation. Existing pending-copy/retry checks prove stale completion cannot overwrite the new run. The direct generic callback guard remains counted.|
|7/1 at43|If the frame or selected field lost focus during a denied async copy, feedback instructs selection instead of falsely claiming existing selection. All denied/throwing/absent permission tests verify a real full selection while focused;the pending-success test verifies focus is never stolen after another action. This opposite feedback string remains counted and is not reported as an executed denied-after-focus-loss case.|
|11/1 at52|Non-primary pointerdown leaves default caret/context-menu behavior. Primary clicks preserve full selection and perform the real copy gesture. Secondary/middle-button behavior is a retained browser default, not a separate gameplay action or tested clipboard grant.|
|12/0 at55|Enter/Space on the textarea prevents default and invokes the same copy transaction. Existing browser tests cover real text/button clicks, Space on the Copy button and shell Enter on the focused seed. Those prove shared copy behavior and shell routing, not this local textarea keydown arm. Its literal two-key dispatch remains a counted presentation adapter;no fabricated key-event execution is claimed.|

Behavior authorities are tests/survive-results-ui.test.mjs (compiled production
component in an opaque frame), tests/survive-results-seed-runtime.mjs (normal
built app integration with explicitly arranged terminal state), and
tests/seed-copy-runtime.mjs (normal build, actual browser clipboard gesture and
labelled permission fixtures). All three are registered in the full collection.
They separately assert no overflow,44px visible actions, both themes, frame-size
tiers, equal team perch, immutable participant metrics, exact seed contents,
denied-copy selection and stale completion/focus behavior. Browser permission
fixtures do not prove an SDK clipboard wire exchange.

The proof binds all18 raw source/map/site identities, current source/test/main/
result-producer hashes and410 unchanged frozen paths. No production code changed.
The fresh full run and final current-build visual/clause audit remain pending;
this source review cannot replace either.
