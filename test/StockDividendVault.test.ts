import artifact from '../contract/StockDividendVault.artifact.json' with { type: 'json' };
import { Contract, MockNetworkProvider, SignatureTemplate, TransactionBuilder } from 'cashscript';
import { instantiateSecp256k1, generatePrivateKey, hash160, encodeCashAddress, generateRandomSeed, swapEndianness } from '@bitauth/libauth';
import { describe, it, expect, beforeAll } from 'vitest';
import 'cashscript/vitest';

const SHARE_TOKEN_ID_HEX = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const DUMMY_TXID = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

async function createWallet() {
  const secp256k1 = await instantiateSecp256k1();
  const privKey = generatePrivateKey(() => generateRandomSeed());
  const pubKey = secp256k1.derivePublicKeyCompressed(privKey) as Uint8Array;
  const pkh = hash160(pubKey);
  const chipnetAddress = encodeCashAddress({ type: 'p2pkhWithTokens', payload: pkh, prefix: 'bchtest' });
  return { privKey, pubKey, pkh, chipnetAddress: (chipnetAddress as { address: string }).address };
}

function toUppercaseHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

describe('StockDividendVault', () => {
  const provider = new MockNetworkProvider();
  let ownerPrivKey: Uint8Array;
  let ownerPubkey: Uint8Array;
  let ownerPkh: Uint8Array;
  let ownerAddress: string;
  let h1Pkh: Uint8Array, h1Addr: string;
  let h2Pkh: Uint8Array, h2Addr: string;
  let h3Pkh: Uint8Array, h3Addr: string;
  let h4Pkh: Uint8Array, h4Addr: string;
  let h5Pkh: Uint8Array, h5Addr: string;

  beforeAll(async () => {
    const owner = await createWallet();
    ownerPrivKey = owner.privKey; ownerPubkey = owner.pubKey;
    ownerPkh = owner.pkh; ownerAddress = owner.chipnetAddress;

    const w1 = await createWallet(); h1Pkh = w1.pkh; h1Addr = w1.chipnetAddress;
    const w2 = await createWallet(); h2Pkh = w2.pkh; h2Addr = w2.chipnetAddress;
    const w3 = await createWallet(); h3Pkh = w3.pkh; h3Addr = w3.chipnetAddress;
    const w4 = await createWallet(); h4Pkh = w4.pkh; h4Addr = w4.chipnetAddress;
    const w5 = await createWallet(); h5Pkh = w5.pkh; h5Addr = w5.chipnetAddress;
  });

  async function createContractAndVault() {
    const ownerPkhHex = toUppercaseHex(ownerPkh);
    const tokenIdSwapped = swapEndianness(SHARE_TOKEN_ID_HEX);
    const contract = new Contract(artifact, [ownerPkhHex, tokenIdSwapped], { provider });
    return { contract, tokenIdSwapped };
  }

  it('should succeed when owner distributes with correct amounts', async () => {
    const { contract, tokenIdSwapped } = await createContractAndVault();

    const vaultUtxo = provider.addUtxo(contract.address, {
      vout: 0, txid: DUMMY_TXID, satoshis: 50000n,
      token: { amount: 500n, category: tokenIdSwapped, nft: { capability: 'minting', commitment: '' } }
    });

    const tx = new TransactionBuilder({ provider })
      .addInput(vaultUtxo, contract.unlock.distribute(
        ownerPubkey, new SignatureTemplate(ownerPrivKey),
        h1Pkh, 100n, h2Pkh, 100n, h3Pkh, 100n, h4Pkh, 100n, h5Pkh, 100n,
      ))
      .addOutput({ to: contract.tokenAddress, amount: 44000n, token: { amount: 0n, category: tokenIdSwapped, nft: { capability: 'minting' as const, commitment: '' } } })
      .addOutput({ to: h1Addr, amount: 1000n, token: { amount: 100n, category: tokenIdSwapped } })
      .addOutput({ to: h2Addr, amount: 1000n, token: { amount: 100n, category: tokenIdSwapped } })
      .addOutput({ to: h3Addr, amount: 1000n, token: { amount: 100n, category: tokenIdSwapped } })
      .addOutput({ to: h4Addr, amount: 1000n, token: { amount: 100n, category: tokenIdSwapped } })
      .addOutput({ to: h5Addr, amount: 1000n, token: { amount: 100n, category: tokenIdSwapped } });

    await expect(tx.send()).resolves.toBeDefined();
  });

  it('should fail when non-owner tries to distribute', async () => {
    const { contract, tokenIdSwapped } = await createContractAndVault();
    const wrongWallet = await createWallet();

    const vaultUtxo = provider.addUtxo(contract.address, {
      vout: 0, txid: 'bbbb' + DUMMY_TXID.slice(4), satoshis: 10000n,
      token: { amount: 0n, category: tokenIdSwapped, nft: { capability: 'minting', commitment: '' } }
    });

    const tx = new TransactionBuilder({ provider })
      .addInput(vaultUtxo, contract.unlock.distribute(
        wrongWallet.pubKey, new SignatureTemplate(wrongWallet.privKey),
        h1Pkh, 100n, h2Pkh, 100n, h3Pkh, 100n, h4Pkh, 100n, h5Pkh, 100n,
      ))
      .addOutput({ to: contract.tokenAddress, amount: 10000n, token: { amount: 0n, category: tokenIdSwapped, nft: { capability: 'minting' as const, commitment: '' } } })
      .addOutput({ to: h1Addr, amount: 1000n, token: { amount: 100n, category: tokenIdSwapped } })
      .addOutput({ to: h2Addr, amount: 1000n, token: { amount: 100n, category: tokenIdSwapped } })
      .addOutput({ to: h3Addr, amount: 1000n, token: { amount: 100n, category: tokenIdSwapped } })
      .addOutput({ to: h4Addr, amount: 1000n, token: { amount: 100n, category: tokenIdSwapped } })
      .addOutput({ to: h5Addr, amount: 1000n, token: { amount: 100n, category: tokenIdSwapped } });

    await expect(tx.send()).rejects.toThrow();
  });

  it('should fail when vault output loses the minting NFT', async () => {
    const { contract, tokenIdSwapped } = await createContractAndVault();

    const vaultUtxo = provider.addUtxo(contract.address, {
      vout: 0, txid: 'cccc' + DUMMY_TXID.slice(4), satoshis: 10000n,
      token: { amount: 0n, category: tokenIdSwapped, nft: { capability: 'minting', commitment: '' } }
    });

    const tx = new TransactionBuilder({ provider })
      .addInput(vaultUtxo, contract.unlock.distribute(
        ownerPubkey, new SignatureTemplate(ownerPrivKey),
        h1Pkh, 100n, h2Pkh, 100n, h3Pkh, 100n, h4Pkh, 100n, h5Pkh, 100n,
      ))
      .addOutput({ to: contract.tokenAddress, amount: 10000n })
      .addOutput({ to: h1Addr, amount: 1000n, token: { amount: 100n, category: tokenIdSwapped } })
      .addOutput({ to: h2Addr, amount: 1000n, token: { amount: 100n, category: tokenIdSwapped } })
      .addOutput({ to: h3Addr, amount: 1000n, token: { amount: 100n, category: tokenIdSwapped } })
      .addOutput({ to: h4Addr, amount: 1000n, token: { amount: 100n, category: tokenIdSwapped } })
      .addOutput({ to: h5Addr, amount: 1000n, token: { amount: 100n, category: tokenIdSwapped } });

    await expect(tx.send()).rejects.toThrow();
  });

  it('should fail when wrong token category on shareholder output', async () => {
    const { contract, tokenIdSwapped } = await createContractAndVault();
    const wrongTokenId = swapEndianness('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');

    const vaultUtxo = provider.addUtxo(contract.address, {
      vout: 0, txid: 'dddd' + DUMMY_TXID.slice(4), satoshis: 10000n,
      token: { amount: 0n, category: tokenIdSwapped, nft: { capability: 'minting', commitment: '' } }
    });

    const tx = new TransactionBuilder({ provider })
      .addInput(vaultUtxo, contract.unlock.distribute(
        ownerPubkey, new SignatureTemplate(ownerPrivKey),
        h1Pkh, 100n, h2Pkh, 100n, h3Pkh, 100n, h4Pkh, 100n, h5Pkh, 100n,
      ))
      .addOutput({ to: contract.tokenAddress, amount: 10000n, token: { amount: 0n, category: tokenIdSwapped, nft: { capability: 'minting' as const, commitment: '' } } })
      .addOutput({ to: h1Addr, amount: 1000n, token: { amount: 100n, category: wrongTokenId } })
      .addOutput({ to: h2Addr, amount: 1000n, token: { amount: 100n, category: tokenIdSwapped } })
      .addOutput({ to: h3Addr, amount: 1000n, token: { amount: 100n, category: tokenIdSwapped } })
      .addOutput({ to: h4Addr, amount: 1000n, token: { amount: 100n, category: tokenIdSwapped } })
      .addOutput({ to: h5Addr, amount: 1000n, token: { amount: 100n, category: tokenIdSwapped } });

    await expect(tx.send()).rejects.toThrow();
  });

  it('should fail when too many outputs (prevent fringe minting)', async () => {
    const { contract, tokenIdSwapped } = await createContractAndVault();

    const vaultUtxo = provider.addUtxo(contract.address, {
      vout: 0, txid: 'eeee' + DUMMY_TXID.slice(4), satoshis: 10000n,
      token: { amount: 0n, category: tokenIdSwapped, nft: { capability: 'minting', commitment: '' } }
    });

    const builder = new TransactionBuilder({ provider })
      .addInput(vaultUtxo, contract.unlock.distribute(
        ownerPubkey, new SignatureTemplate(ownerPrivKey),
        h1Pkh, 100n, h2Pkh, 100n, h3Pkh, 100n, h4Pkh, 100n, h5Pkh, 100n,
      ))
      .addOutput({ to: contract.tokenAddress, amount: 10000n, token: { amount: 0n, category: tokenIdSwapped, nft: { capability: 'minting' as const, commitment: '' } } })
      .addOutput({ to: h1Addr, amount: 1000n, token: { amount: 100n, category: tokenIdSwapped } })
      .addOutput({ to: h2Addr, amount: 1000n, token: { amount: 100n, category: tokenIdSwapped } })
      .addOutput({ to: h3Addr, amount: 1000n, token: { amount: 100n, category: tokenIdSwapped } })
      .addOutput({ to: h4Addr, amount: 1000n, token: { amount: 100n, category: tokenIdSwapped } })
      .addOutput({ to: h5Addr, amount: 1000n, token: { amount: 100n, category: tokenIdSwapped } })
      .addOutput({ to: h1Addr, amount: 1000n })
      .addOutput({ to: h2Addr, amount: 1000n })
      .addOutput({ to: h1Addr, amount: 1000n })
      .addOutput({ to: h2Addr, amount: 1000n });

    await expect(builder.send()).rejects.toThrow();
  });
});
