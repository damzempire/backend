/**
 * Merkle tree for vesting airdrops (Issue #51).
 * Build tree from 32-byte leaf hashes; get root and proofs for claim_merkle.
 * Leaf encoding must match the on-chain contract (see contracts/merkle_vault).
 */

const crypto = require('crypto');

const HASH_BYTES = 32;

/**
 * Hash two 32-byte nodes in order (left, right) for Merkle parent.
 * @param {Buffer} left - 32-byte hash
 * @param {Buffer} right - 32-byte hash
 * @returns {Buffer} 32-byte hash
 */
function hashPair(left, right) {
  return crypto.createHash('sha256').update(Buffer.concat([left, right])).digest();
}

/**
 * Build Merkle tree from an array of 32-byte leaf hashes.
 * Duplicates last leaf if odd number to make even layer.
 * @param {Buffer[]} leaves - array of 32-byte Buffers
 * @returns {{ root: Buffer, layers: Buffer[][] }} root hash and all layers (leaves = layers[0])
 */
function buildTree(leaves) {
  if (!leaves || leaves.length === 0) {
    throw new Error('merkle tree requires at least one leaf');
  }
  const layer = leaves.map((l) => (Buffer.isBuffer(l) && l.length === HASH_BYTES ? l : Buffer.from(l, 'hex')));
  const layers = [layer];

  let current = layer;
  while (current.length > 1) {
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      const right = i + 1 < current.length ? current[i + 1] : left;
      next.push(hashPair(left, right));
    }
    layers.push(next);
    current = next;
  }

  return {
    root: current[0],
    layers,
  };
}

/**
 * Get Merkle root from leaves.
 * @param {Buffer[]} leaves - 32-byte leaf hashes
 * @returns {Buffer} 32-byte root
 */
function getRoot(leaves) {
  return buildTree(leaves).root;
}

/**
 * Get Merkle proof for leaf at index (sibling hashes from leaf to root).
 * Order of siblings in proof matches contract: at each step, if index is even
 * sibling is right (proof element is the right sibling), else left.
 * Contract uses: if index % 2 == 0 then hash(computed, proof[i]) else hash(proof[i], computed).
 * So proof[i] is the sibling; position is determined by index bit.
 * @param {{ layers: Buffer[][] }} tree - from buildTree
 * @param {number} leafIndex - index of leaf (0-based)
 * @returns {Buffer[]} array of 32-byte sibling hashes (path from leaf to root)
 */
function getProof(tree, leafIndex) {
  const { layers } = tree;
  if (leafIndex < 0 || leafIndex >= layers[0].length) {
    throw new Error('leaf index out of range');
  }
  const proof = [];
  let idx = leafIndex;
  for (let d = 0; d < layers.length - 1; d++) {
    const row = layers[d];
    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
    if (siblingIdx >= 0 && siblingIdx < row.length) {
      proof.push(row[siblingIdx]);
    } else {
      proof.push(row[idx]); // duplicate if odd layer
    }
    idx = Math.floor(idx / 2);
  }
  return proof;
}

/**
 * Build leaf hash using the same encoding as the MerkleVault contract.
 * Contract uses: env.serialize((index, beneficiary, amount)) then sha256.
 * For off-chain we use a canonical encoding that matches common Soroban representation:
 * index (4 bytes BE) || address (32 bytes) || amount (16 bytes BE, i128).
 * Ensure your contract's build_leaf uses this same encoding (see contracts/merkle_vault).
 * @param {number} index - u32 index
 * @param {Buffer|string} addressBytes - 32-byte address (Buffer or 64-char hex)
 * @param {bigint|string|number} amount - i128 amount (use string for large numbers)
 * @returns {Buffer} 32-byte leaf hash
 */
function buildLeaf(index, addressBytes, amount) {
  const addr = Buffer.isBuffer(addressBytes)
    ? addressBytes
    : Buffer.from(addressBytes.replace(/^0x/, ''), 'hex');
  if (addr.length !== 32) {
    throw new Error('address must be 32 bytes');
  }
  const amt = BigInt(amount);
  const amountBuf = Buffer.allocUnsafe(16);
  amountBuf.writeBigInt64BE(amt >> 64n, 0);
  amountBuf.writeBigInt64BE(amt & 0xffffffffffffffffn, 8);
  const payload = Buffer.concat([
    Buffer.allocUnsafe(4),
    addr,
    amountBuf,
  ]);
  payload.writeUInt32BE(index >>> 0, 0);
  return crypto.createHash('sha256').update(payload).digest();
}

module.exports = {
  buildTree,
  getRoot,
  getProof,
  buildLeaf,
  HASH_BYTES,
};
