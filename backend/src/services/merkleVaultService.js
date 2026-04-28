/**
 * Merkle Vault service (Issue #51).
 * Builds Merkle tree from vesting entries and provides root + proofs
 * for initialize_merkle_vault and claim_merkle.
 */

const { buildTree, getProof, buildLeaf } = require('../util/merkleTree');

/**
 * Build Merkle tree from entries and return root (hex) and proofs by index.
 * Each entry: { index, address, amount }. Address as 32-byte hex (64 chars) or Buffer.
 * Leaf encoding matches contracts/merkle_vault when using buildLeaf (canonical 4+32+16).
 *
 * @param {Array<{ index: number, address: string|Buffer, amount: string|number|bigint }>} entries
 * @returns {{ rootHash: string, rootHashBuffer: Buffer, totalAmount: string, proofsByIndex: Record<number, { proof: string[], amount: string, address: string }> }}
 */
function buildMerkleVaultData(entries) {
  if (!entries || entries.length === 0) {
    throw new Error('entries required');
  }

  const leaves = entries.map((e) => {
    const addr = typeof e.address === 'string' ? e.address : e.address.toString('hex');
    return buildLeaf(e.index, addr, e.amount);
  });

  const tree = buildTree(leaves);
  const totalAmount = entries.reduce((sum, e) => sum + BigInt(e.amount), 0n).toString();

  const proofsByIndex = {};
  for (let i = 0; i < entries.length; i++) {
    const proof = getProof(tree, i);
    proofsByIndex[entries[i].index] = {
      proof: proof.map((b) => b.toString('hex')),
      amount: String(entries[i].amount),
      address: typeof entries[i].address === 'string' ? entries[i].address : entries[i].address.toString('hex'),
    };
  }

  return {
    rootHash: tree.root.toString('hex'),
    rootHashBuffer: tree.root,
    totalAmount,
    proofsByIndex,
  };
}

/**
 * Get proof for a single index from a pre-built tree (layers from buildTree).
 * @param {{ layers: Buffer[][] }} tree - from buildTree(leaves)
 * @param {number} leafIndex - 0-based index in the leaves array
 * @returns {string[]} proof as hex strings
 */
function getProofForIndex(tree, leafIndex) {
  const proof = getProof(tree, leafIndex);
  return proof.map((b) => b.toString('hex'));
}

module.exports = {
  buildMerkleVaultData,
  getProofForIndex,
  buildLeaf,
};
