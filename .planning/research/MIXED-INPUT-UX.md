# Mixed inputs: traveler ownership and joining

Status: exploration and architecture proposal, not implemented behavior.
User decision: **keep keyboard and controller available for the same traveler;
switch freely until an input is explicitly assigned elsewhere.**

## Interaction model

An input belongs to one traveler; a traveler can have several inputs. Count
established players when choosing the join flow. Counting devices would turn a
solo player with a keyboard and controller into an unintended multiplayer party.

| Situation | Proposed behavior |
| --- | --- |
| Nobody has started yet; first input deliberately used | Control P1 immediately. Keep the default keyboard profile available to P1 as an alias. |
| A controller connects but remains idle | Update Controls; no interruption. |
| One player established; unfamiliar input deliberately used | Ask **Control this duck** / **Join as another duck**, with the current portrait. |
| Control this duck | Add the input to that traveler. Keyboard remains usable. Show a brief combined-input badge. |
| Join as another duck | Enter the existing mode/character flow, preserving the current solo run until commit or cancellation. |
| Two or more established players; unfamiliar input deliberately used | Default to joining where the mode allows it. Provide **Use for an existing duck** on the join panel. |
| Already assigned input used | Route directly to its traveler; no switching dialog. |
| Relay or Race already running | Offer control/reclaim for an existing traveler. New entrants wait for the next game. |
| Four players already established | Offer assignment to an existing traveler; explain that all player places are occupied. |

Use a fresh confirm/start press to express intent. Connection events, stick
drift, button repeats and keys typed into text fields must not open the chooser.
Consume the initiating press, then require release before navigation or play so
joining cannot also hop, buy an item or confirm a second screen. Keep one pending
join request visible; simultaneous requests queue without stealing focus.

For the initial solo choice, pause safely while the chooser is open. Once a
multiplayer game is active, follow that mode's existing admission/recovery
policy; an unknown controller must not arbitrarily pause a Race for everyone.
Dismissal leaves the run and assignments intact. Allow another explicit Start
press to reopen it, with no persistent nag on movement or drift.

## Controls should show people first

Keep the compact Controls drawer, with one row per traveler: portrait, P1–P4,
and keyboard/controller badges. Actions are **Add input**, **Move input**, and
**Remap keys**. Add input highlights the target portrait and waits for a fresh
press on the intended device. Move input shows the previous and new owners
before changing an occupied assignment. This is the explicit path for a third
controller that belongs to an existing player rather than a newcomer.

Use the game's large controls, colors, type and framed panels. On small frames,
show the traveler list, then a focused assignment view. Avoid adding a permanent
device management dashboard to the HUD. In play, a small badge beside each
traveler can identify their most recently used input. Change hints only on
deliberate input, not pointer hover or tiny axis changes.

Keep the current solo keyboard aliases while no shared-keyboard split is
configured. Pressing arrows after WASD must not suggest joining another player.
Split those keys into separate named profiles only through the explicit shared
keyboard setup/remapping flow. Discovering a controller must not split the
keyboard or reassign either profile as a side effect.

Keyboard, controller, touch and pointer actions must all pass through the same
owner check. Touch controls can belong to a selected traveler; one shared pointer
can inspect other travelers without silently changing who owns a purchase,
recovery request or Relay confirmation. Opening a menu establishes its owner;
another input never steals that authority simply by becoming active.

## Architecture proposal

Keep participant identity, game seat and input identity separate. A small
session-scoped assignment registry maps each live input source to one owner.
Derive the reverse list for badges and availability rather than maintaining two
independent mutable assignment systems. A solo owner can acquire another input
without creating a multiplayer session; adoption into a LocalSession transfers
those assignments with the existing traveler state.

Establish a player when they deliberately start or confirm joining, rather than
when the browser reports a device. Keep last-used input as presentation data;
it must not change participant identity or authorize another traveler's actions.
Validate the source's current binding before dispatching an owner-labelled game
or market command. Existing owner/context checks still apply after that step.

```text
Keyboard profiles / shell gamepads / touch controls
                  ↓ normalized actions + source lifetime
           Source → traveler assignment
                  ↓ per-traveler arbitration
         Existing session command and mode authority
```

Each source binding has a lifetime/generation. Reassignment clears held actions
and invalidates queued events from the old binding. Reused device indexes and
old reconnect events cannot take control of the new owner. A durable keymap may
be saved through SDK storage; ephemeral gamepad indexes are not durable identity.

One traveler's aliases share one movement/repeat schedule. Two held inputs must
not double hop speed or duplicate confirm/purchase actions. A fresh intentional
direction can take over from an older held direction; prevent the old source's
repeat from immediately taking control back. Releasing one source clears only
that source, while focus loss or a closed input context clears the relevant
context. Preserve normal single-input timings and simultaneous input from
different travelers.

Only loss of the **last usable assigned input** invokes a mode's player-unavailable
behavior. A disconnected controller with an active keyboard alternative does
not ghost the duck or skip its Relay turn. Reconnecting an unambiguous current
binding can resume after neutral/release. Otherwise use the existing traveler
reclaim choice; matching controller names are insufficient evidence.

## Current seams and browser constraints

Inspection of the current implementation found `SessionPlayer.device` as one
mutable device, `keyboardSeatForProfile` resolving a player by equality with that
field, and `requestFirstPlayer` assigning the first controller to P1 without
checking prior keyboard use. `GamepadRouter` and the setup/recovery flows need to
consume the shared assignment registry. Recovery provenance aliases are not a
substitute for concurrent live input bindings. Preserve participant/transaction
authority while replacing these single-device assumptions.

Ordinary browser keyboard events do not provide physical-keyboard identity; use
named key profiles such as WASD and arrows on a shared keyboard. This follows
from the fields exposed by the [UI Events KeyboardEvent interface](https://www.w3.org/TR/uievents/#interface-keyboardevent).
Gamepad IDs describe a product, and disconnected indexes can be reused, so
neither should be treated as a unique permanent controller identity. See the
[Gamepad interface](https://www.w3.org/TR/gamepad/#gamepad-interface).

Keep the existing napplet boundary: the shell discovers controllers and sends
its supported gamepad snapshots; the napplet manages action ownership and UI.
No direct browser polling, host DOM access, new NAP message or shell code is
needed for this ownership model. Missing optional gamepad support leaves
keyboard/pointer/touch paths usable.

## Delivery and proof

1. Add the assignment model and preserve one-input behavior with existing tests.
2. Route keyboard and gamepad through it, including simultaneous aliases,
   reassignment, focus transitions and last-input loss.
3. Add the first-input chooser and traveler-first Controls views.
4. Verify live Survive admission, Relay/Race roster restrictions, menu authority,
   duplicate-input suppression and compact layouts through actual UI paths.

Critical examples: keyboard P1 + controller P2; keyboard and controller both P1;
two keyboard profiles + controllers; unplug one alias while another remains;
unplug all inputs and reclaim; stale event after reassignment; two identical
controllers; simultaneous join requests; held confirm across the chooser; a
full roster; switching during a market, pack choice, Relay handoff or recovery.
Input assignment must not consume RNG, restart the course, change run inventory,
move a traveler, or change solo movement timing.
