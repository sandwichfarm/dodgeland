# Local multiplayer — original requested scope

local multiplayer, multiple modes.

Modes:
1. Survive together: Introduces new mechanic and item class. Players can drop in and out on a current game. Works on Flow or Arcade. 
2. Relay: Take turns every n (default: 50) tiles. Requires game setup for continuity. Players can drop-out but not in, until the race is done.
3. Race: Ducks Race against both the clock and each other. The duck in the lead determines where the boundary for the "fog" is. Users can be in the fog but it plucks feathers. Good opportunity for offensive/defensive game mechanics and mod-contextual  consumables.

Mechanic:
Revival: Each player has one revival (cooldown 250)

Item Class:
Revivals (allows you to revive others; super rare 1:2500), Flares (allows you to bring others back fgrom the dead, and bring everyone to their position; rare 1:1250). Many other such possiblities Can be purchased in shop. Can be collected in world. Coin gravity powerups does not apply, but default gravity should remain to ensure the powerup is collectable by the player in the world.

Rules:
1. Each player must have a different character. So that the game is easy to play quickly we detect users. 

GUI
Each Game Mode will need custom end of game stats with per character breakdown and podium results. 
Character selection: 

Flow: 
1. Always listen on controlers. When >1 gamepad  has any given input, enter multiplayer mode. 
2. Allow default config for multiplayer, using a single keyboard for example; requires keybind GUI.
3. When controller disconnects, modes need to adapt. They will all have their own individual handler for handling gamepad state changes. should bhe designed with this in mind. Interrupting the gameplay in an awkward way may not make sense in every situation. Some it might be better to show a custom pause screen, others, the player's avatar can just become a ghost. 
4. Some modes can allow user drop in, where custom handlers are passed to react to player state changes.

Architecture
1. For this to work correctly, we need to extract hard-coded magic numbers and settings from gameplay logic, and then make each "mode" a configuration of those magic numbers and settings. This may require some refactoring, but solution should be elegant and simple to ensure new game mdoes can be easily added. Why? This gets us to the eventual goal of users being able to create their own modes (both single and multiplayer). It will require some attention to detail, but if we first port the existing functionality into this paradigm, then it will become easier to compose the multiplayer modes. Testing between current single player and new composed single player should be precise, there must be no difference between the two.

Should not affect simplicity of default single-ayer gameplay mode. 

Should be done in a new branch.

use GSD (see local skills) to plan it out into phases and then execute.

Deliverables
1. Composable Game Modes Architecture
2. Single Mode Migrated to Composable Arch with 1:1 parity.
3. Multiplayer functionality: Mechanics, Flows, Assets and Design required.
4. Each Game Mode: Each game mode delivered as a composable mode with handlers.
5. GUI: Thoughtfully design GUIs
6. Test Converage: Wide and true.

stop condition: All Multiplayer Modes created. high Test Coverage for each mode and passing. Executed precisely with full converage over this specification. Green lights. Visual proofs included. PR Opened
