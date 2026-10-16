// Independently specified fixtures; expected counters live in tests, never derive from these emissions.
export const sources = {
  'exercised.ts': `// Comment; declarations must not become executable lines.
export interface ErasedContract { value: number }
export type ErasedLabel = 'yes' | 'no';
export function choose(value: number): string {
  if (value > 0) return 'positive';
  return 'nonpositive';
}
export function neverCalled(): string { return 'never'; }
`,
  'unexecuted.ts': `export function untouched(flag: boolean): string {
  return flag ? 'true-branch' : 'false-branch';
}
`,
};
export const globSources = {
  'catalog.ts': `export interface Ignored { n: number }
// A real source-level glob, not a post-emission string prepend.
const items = import.meta.glob('./items/*.ts', { eager: true, import: 'default' });
export function total(): number {
  return Object.values(items).reduce((sum, item) => sum + item.n, 0);
}
`,
  'items/a.ts': `const item = { n: 2 }; export default item;\n`,
  'items/b.ts': `const item = { n: 3 }; export default item;\n`,
  'declarations.ts': `export interface OnlyTypes { n: number }\nexport type Label = 'a' | 'b';\n`,
};
