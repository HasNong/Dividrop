import { createHash } from 'crypto';

export interface MerkleLeaf {
  label: string;
  shares: number;
}

export interface MerkleProof {
  leaf: MerkleLeaf;
  root: string;
  siblings: { hash: string; direction: 'left' | 'right' }[];
  verified: boolean;
}

function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

function doubleHash(label: string, shares: number): string {
  return sha256(sha256(`${label}:${shares}`));
}

function combineHashes(a: string, b: string): string {
  return sha256(sha256(a + b));
}

export function buildMerkleTree(leaves: MerkleLeaf[]): {
  root: string;
  tree: string[][];
  leafHashes: Map<string, { hash: string; label: string; shares: number }>;
} {
  if (leaves.length === 0) {
    return { root: sha256(sha256('')), tree: [], leafHashes: new Map() };
  }

  let layer = leaves.map((l) => {
    const h = doubleHash(l.label, l.shares);
    return { hash: h, label: l.label, shares: l.shares };
  });

  const tree: string[][] = [layer.map((l) => l.hash)];
  const leafMap = new Map<string, { hash: string; label: string; shares: number }>();
  for (const l of layer) leafMap.set(l.label, l);

  while (layer.length > 1) {
    const next: { hash: string; label: string; shares: number }[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      if (i + 1 < layer.length) {
        const combined = combineHashes(layer[i].hash, layer[i + 1].hash);
        next.push({ hash: combined, label: '', shares: 0 });
      } else {
        next.push({ hash: layer[i].hash, label: layer[i].label, shares: layer[i].shares });
      }
    }
    layer = next;
    tree.push(layer.map((n) => n.hash));
  }

  return {
    root: layer[0]?.hash ?? '',
    tree,
    leafHashes: leafMap,
  };
}

export function generateProof(
  leaves: MerkleLeaf[],
  targetLabel: string,
): MerkleProof | null {
  const target = leaves.find((l) => l.label === targetLabel);
  if (!target) return null;

  const { root, leafHashes } = buildMerkleTree(leaves);
  if (!root) return null;

  let layer = leaves.map((l) => ({
    hash: leafHashes.get(l.label)!.hash,
    label: l.label,
    shares: l.shares,
  }));

  const siblings: { hash: string; direction: 'left' | 'right' }[] = [];

  while (layer.length > 1) {
    const targetIdx = layer.findIndex((n) => n.label === targetLabel);

    if (targetIdx === -1) {
      for (let i = 0; i < layer.length; i += 2) {
        layer = layer.map((_, idx) => ({ hash: '', label: '', shares: 0 }));
        if (i + 1 < layer.length) {
          layer.push({ hash: combineHashes(layer[i].hash, layer[i + 1].hash), label: '', shares: 0 });
        }
      }
      continue;
    }

    if (targetIdx % 2 === 0 && targetIdx + 1 < layer.length) {
      siblings.push({ hash: layer[targetIdx + 1].hash, direction: 'right' });
    } else if (targetIdx % 2 === 1) {
      siblings.push({ hash: layer[targetIdx - 1].hash, direction: 'left' });
    }

    const nextLayer: { hash: string; label: string; shares: number }[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      if (i + 1 < layer.length) {
        const combined = combineHashes(layer[i].hash, layer[i + 1].hash);
        const isTarget = layer[i].label === targetLabel || layer[i + 1].label === targetLabel;
        nextLayer.push({
          hash: combined,
          label: isTarget ? targetLabel : '',
          shares: isTarget ? target.shares : 0,
        });
      } else {
        nextLayer.push(layer[i]);
      }
    }
    layer = nextLayer;
  }

  const verified = verifyProof(target, root, siblings);
  return { leaf: target, root, siblings, verified };
}

export function verifyProof(
  leaf: MerkleLeaf,
  root: string,
  siblings: { hash: string; direction: 'left' | 'right' }[],
): boolean {
  let current = doubleHash(leaf.label, leaf.shares);

  for (const s of siblings) {
    if (s.direction === 'left') {
      current = combineHashes(s.hash, current);
    } else {
      current = combineHashes(current, s.hash);
    }
  }

  return current === root;
}

export function renderMerkleTree(tree: string[][]): string {
  const lines: string[] = [];
  const maxWidth = tree[0].length;
  let currentWidth = maxWidth;

  for (let level = 0; level < tree.length; level++) {
    const nodes = tree[level];
    const indent = '  '.repeat(level);
    const gap = '  '.repeat(Math.max(1, currentWidth * 2));
    const nodeStr = nodes.map((h) => h.substring(0, 6)).join(gap);
    lines.push(`${indent}${nodeStr}`);
    currentWidth = Math.ceil(currentWidth / 2);
  }

  return lines.join('\n');
}
