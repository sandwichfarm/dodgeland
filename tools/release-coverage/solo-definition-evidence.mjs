import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
// Reviewed complete canonical snapshot; source changes require an explicit review, never auto-regeneration.
const pinned={"sourceHash":"cadda595a1cfa02769eee70e3f925b125b14c7fdf6faf93b9a83f45bb79c89f2","definitions":{"arcade":{"id":"arcade","rules":{"economy":{"baseCoinGravity":0.1,"inventoryCapacity":3,"inventoryLimit":6,"marketInterval":100,"marketWindowSeconds":15},"health":{"frontDamage":3,"hurtRecovery":1,"maxHealth":3,"rearDamage":1,"regenerationAmount":0.5,"regenerationInterval":100,"sideDamage":2},"lifecycle":{},"movement":{"halfWidth":5,"hopDuration":0.14},"presentation":{"pursuitVisible":true},"pursuers":{"enabled":true,"firstSpawnTime":45,"intervalProgress":160,"introductionThresholds":[160,320,480],"minimumSpawnInterval":14,"minimumSpawnProgress":24,"populationCap":2,"spawnInterval":18},"pursuit":{"grace":4,"speed":0.65,"strategy":"wave","trailingLimit":7,"warningSeconds":5,"waveTrail":6},"retention":{"captureDistance":0.5,"pickupBindingAhead":8,"pullCompletionDistance":0.2,"rowsAhead":28,"rowsBehind":10},"simulation":{"fixedStep":0.008333333333333333,"worldTimeScale":1}}},"stroll":{"id":"stroll","rules":{"economy":{"baseCoinGravity":0.1,"inventoryCapacity":3,"inventoryLimit":6,"marketInterval":100,"marketWindowSeconds":15},"health":{"frontDamage":3,"hurtRecovery":1,"maxHealth":3,"rearDamage":1,"regenerationAmount":0.5,"regenerationInterval":100,"sideDamage":2},"lifecycle":{},"movement":{"halfWidth":5,"hopDuration":0.14},"presentation":{"pursuitVisible":false},"pursuers":{"enabled":false,"firstSpawnTime":45,"intervalProgress":160,"introductionThresholds":[160,320,480],"minimumSpawnInterval":14,"minimumSpawnProgress":24,"populationCap":2,"spawnInterval":18},"pursuit":{"grace":4,"speed":0.65,"strategy":"trail","trailingLimit":7,"warningSeconds":5,"waveTrail":6},"retention":{"captureDistance":0.5,"pickupBindingAhead":8,"pullCompletionDistance":0.2,"rowsAhead":28,"rowsBehind":10},"simulation":{"fixedStep":0.008333333333333333,"worldTimeScale":0.58}}}}};
export function normalizeDefinition(value){
 if(value===undefined)return {__undefined:true};
 if(typeof value==='function'||typeof value==='symbol'||typeof value==='bigint')throw Error('Noncanonical definition value');
 if(Array.isArray(value))return value.map(normalizeDefinition);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,normalizeDefinition(value[k])]));
 return value;
}
export function validateSoloDefinition(evidence,base){
 const actual=createHash('sha256').update(readFileSync(new URL('../../src/mode-rules.ts',import.meta.url))).digest('hex');
 if(actual!==pinned.sourceHash)throw Error('Canonical solo definition source changed');
 if(!pinned.definitions[base]||!evidence||evidence.sourceHash!==pinned.sourceHash||evidence.rulesIdentity!==true||evidence.deepFrozen!==true||JSON.stringify(evidence.snapshot)!==JSON.stringify(pinned.definitions[base]))throw Error('Invalid canonical solo definition evidence');
 return true;
}
export function definitionEvidence(definition,rules,world){
 const frozen=v=>!v||typeof v!=='object'||Object.isFrozen(v)&&Object.values(v).every(frozen);
 return {sourceHash:pinned.sourceHash,snapshot:normalizeDefinition(definition),rulesIdentity:rules===definition.rules&&world.definition===definition&&world.rules===rules,deepFrozen:frozen(definition)};
}
export const SOLO_DEFINITION_SOURCE_HASH=pinned.sourceHash;

function freezeTree(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freezeTree(child);Object.freeze(value);}return value;}
export const SOLO_DEFINITION_SNAPSHOTS=freezeTree(pinned.definitions);
