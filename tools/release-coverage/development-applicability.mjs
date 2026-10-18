import { builtinRuleDispositions } from './builtin-rule-applicability.mjs';
import { applicationUnusedApplicabilityDispositions, DEVELOPMENT_STRATUM } from './application-unused-applicability.mjs';
import { applicationConstructionApplicabilityDispositions } from './application-construction-applicability.mjs';
export { DEVELOPMENT_STRATUM, DEVELOPMENT_AUTHORITY_DIGEST, DEVELOPMENT_CONFIG_PINS } from './application-unused-applicability.mjs';
/** Pure source-bound dispositions. Caller must separately establish genuine DEV app provenance. */
export function developmentApplicabilityDispositions({mode,sources,authoritySources,canonicalSources,configSources}){
 if(mode!==DEVELOPMENT_STRATUM)throw Error('Exact development application stratum required');
 const output=applicationUnusedApplicabilityDispositions({mode,sources,authoritySources,canonicalSources,configSources});
 const rules=sources.filter(s=>s.path==='src/mode-rules.ts'||s.path.endsWith('/src/mode-rules.ts'));
 if(rules.length!==1)throw Error('Missing or duplicate mapped development built-in rules');
 return [...output,...builtinRuleDispositions({mode,source:rules[0],closureSources:authoritySources,canonicalSources,appConfigSources:configSources}),...applicationConstructionApplicabilityDispositions({mode,sources,authoritySources,canonicalSources,configSources})];
}
