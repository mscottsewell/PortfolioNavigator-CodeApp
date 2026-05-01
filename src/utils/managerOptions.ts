import type { IResource } from '../types';

export interface ManagerTreeNode {
  id: string;
  name: string;
  depth: number;
  parentId: string | null;
  hasChildren: boolean;
}

export function buildManagerOptions(
  resources: IResource[],
  subManagerIds: Set<string>,
  managerResource: IResource | null,
): ManagerTreeNode[] {
  if (subManagerIds.size === 0) {
    return [];
  }

  const managerResources = new Map<string, IResource>();
  for (const resource of resources) {
    if (subManagerIds.has(resource.cai_resourceid) && resource.cai_resourceid !== managerResource?.cai_resourceid) {
      managerResources.set(resource.cai_resourceid, resource);
    }
  }

  const childrenOf = new Map<string, IResource[]>();
  for (const resource of managerResources.values()) {
    const parentId = resource._cai_managerresourceid_value ?? '';
    const list = childrenOf.get(parentId) ?? [];
    list.push(resource);
    childrenOf.set(parentId, list);
  }

  for (const list of childrenOf.values()) {
    list.sort((a, b) => a.cai_displayname.localeCompare(b.cai_displayname));
  }

  const result: ManagerTreeNode[] = [];
  const walk = (parentId: string, depth: number, treeParentId: string | null) => {
    const children = childrenOf.get(parentId) ?? [];
    for (const child of children) {
      const childHasChildren = (childrenOf.get(child.cai_resourceid) ?? []).length > 0;
      result.push({
        id: child.cai_resourceid,
        name: child.cai_displayname,
        depth,
        parentId: treeParentId,
        hasChildren: childHasChildren,
      });
      walk(child.cai_resourceid, depth + 1, child.cai_resourceid);
    }
  };

  if (managerResource) {
    walk(managerResource.cai_resourceid, 0, null);
  }

  for (const resource of managerResources.values()) {
    if (!result.some((node) => node.id === resource.cai_resourceid)) {
      result.push({
        id: resource.cai_resourceid,
        name: resource.cai_displayname,
        depth: 0,
        parentId: null,
        hasChildren: (childrenOf.get(resource.cai_resourceid) ?? []).length > 0,
      });
    }
  }

  return result;
}
