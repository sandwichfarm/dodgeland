// Exact sequential inherited gates from 06-VALIDATION.md. No TAP filtering.
import {spawnSync} from 'node:child_process';
const oracle='a310a81ed6c76df4b265c9012c23b8c83f4802e5';
const commonTail=[
 ['pnpm',['test:guidance']],
 ['pnpm',['test:conformance']],
 ['git',['diff','--exit-code',oracle,'--','pnpm-lock.yaml']],
];
const blocks=[
 ['Relay Gate6',[
  ['pnpm',['test:phase3']],
  ['node',['--test','tests/relay-tracer.mjs','tests/relay-boundary.test.mjs','tests/relay-lifecycle.test.mjs','tests/relay-results.test.mjs']],
  ['pnpm',['type-check']],['pnpm',['build']],
  ['node',['tests/relay-runtime.mjs']],['node',['tests/relay-layout.mjs']],
  ...commonTail,
 ]],
 ['Race Gate7',[
  ['pnpm',['test:phase3']],
  ['node',['--test','tests/race-tracer.mjs','tests/race-ordering.test.mjs','tests/race-balance.test.mjs','tests/race-lifecycle.test.mjs','tests/race-items.test.mjs','tests/race-results.test.mjs']],
  ['pnpm',['type-check']],['pnpm',['build']],
  ['node',['tests/race-runtime.mjs']],['node',['tests/race-layout.mjs']],
  ...commonTail,
 ]],
 ['Phase01 completion and cross-mode suffix',[
  ['pnpm',['test:health-runtime']],
  ['node',['tests/strict-node-tests.mjs','tests/cross-mode-presentation.mjs']],
  ['git',['diff','--check']],
 ]],
];
for(const [name,commands]of blocks){
 console.log(`\n${new Date().toISOString()} BEGIN ${name}`);
 for(const [executable,args]of commands){
  console.log(`\n${new Date().toISOString()} RUN ${executable} ${args.join(' ')}`);
  const result=spawnSync(executable,args,{stdio:'inherit'});
  if(result.error||result.signal||result.status!==0){
   console.error(`FAIL ${name}`,result.error?.message??result.signal??result.status);
   process.exit(Number.isInteger(result.status)&&result.status>0?result.status:1);
  }
 }
 console.log(`${new Date().toISOString()} PASS ${name}`);
}
