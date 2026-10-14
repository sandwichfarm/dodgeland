import type { ItemDefinition } from './types';

// A module is the registry entry: dropping in one default export is sufficient.
const modules = import.meta.glob<ItemDefinition>('./items/*.ts', { eager: true, import: 'default' });
export const ITEM_CATALOG: readonly ItemDefinition[] = Object.keys(modules).sort().map(path => modules[path]);
