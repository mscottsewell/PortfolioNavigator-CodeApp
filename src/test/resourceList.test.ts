import { describe, expect, it } from 'vitest';
import { dedupeResourcesById } from '../utils/resourceList';

describe('dedupeResourcesById', () => {
  it('keeps the first occurrence of each resource id', () => {
    const unique = dedupeResourcesById([
      { cai_resourceid: 'a', cai_displayname: 'Alpha', cai_alias: 'a' },
      { cai_resourceid: 'b', cai_displayname: 'Beta', cai_alias: 'b' },
      { cai_resourceid: 'a', cai_displayname: 'Alpha Duplicate', cai_alias: 'a2' },
    ]);

    expect(unique).toHaveLength(2);
    expect(unique.map((resource) => resource.cai_resourceid)).toEqual(['a', 'b']);
    expect(unique[0]?.cai_displayname).toBe('Alpha');
  });
});
