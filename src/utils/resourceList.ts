import type { IResource } from '../types';

export function dedupeResourcesById(resources: IResource[]): IResource[] {
  const seen = new Set<string>();
  return resources.filter((resource) => {
    if (seen.has(resource.cai_resourceid)) {
      return false;
    }
    seen.add(resource.cai_resourceid);
    return true;
  });
}
