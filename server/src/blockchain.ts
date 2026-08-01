import {
  ElectrumNetworkProvider,
  Contract,
  TransactionBuilder,
  SignatureTemplate,
  Network,
} from 'cashscript';
import {
  instantiateSecp256k1,
  hash160,
  encodeCashAddress,
  decodeCashAddress,
  swapEndianness,
  deriveSeedFromBip39Mnemonic,
  deriveHdPrivateNodeFromSeed,
  deriveHdPath,
} from '@bitauth/libauth';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Company, DividendRound } from './types.js';
import { buildMerkleTree } from './merkle.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface DeploymentConfig {
  [companyId: string]: {
    tokenId: string;
    contractAddress: string;
    holders: Record<string, string>;
  };
}

let provider: ElectrumNetworkProvider | null = null;
let deployment: DeploymentConfig | null = null;
let ownerTemplate: SignatureTemplate | null = null;
let ownerPkh: Uint8Array | null = null;
let ownerPrivKey: Uint8Array | null = null;
let secp: any = null;

export function getProvider(): ElectrumNetworkProvider | null {
  return provider;
}

export function getDeployment(): DeploymentConfig | null {
  return deployment;
}

export async function initChipnet(): Promise<boolean> {
  try {
    provider = new ElectrumNetworkProvider(Network.CHIPNET, {
      hostname: process.env.CHIPNET_HOST || 'chipnet.imaginary.cash',
    });

    secp = await instantiateSecp256k1();

    const seedPhrase = process.env.SEED_PHRASE ||
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const seed = deriveSeedFromBip39Mnemonic(seedPhrase);
    const rootNode = deriveHdPrivateNodeFromSeed(seed);
    const ownerDerivation = process.env.OWNER_DERIVATION || "m/44'/145'/0'/0/0";
    const node = deriveHdPath(rootNode, ownerDerivation);
    if (typeof node === 'string') throw new Error(`Invalid derivation: ${ownerDerivation}`);
    ownerPrivKey = node.privateKey;
    ownerTemplate = new SignatureTemplate(ownerPrivKey);
    const ownerPubkey = secp.derivePublicKeyCompressed(ownerPrivKey) as Uint8Array;
    ownerPkh = hash160(ownerPubkey);

    const deployerAddress =
      (encodeCashAddress({
        type: 'p2pkhWithTokens',
        payload: ownerPkh,
        prefix: 'bchtest',
      }) as { address: string }).address;
    console.log(`[Blockchain] Deployer: ${deployerAddress}`);

    const configPath = resolve(__dirname, '..', '..', 'frontend', 'src', 'deployment.chipnet.json');
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8')) as DeploymentConfig;
      deployment = config;
      console.log(`[Blockchain] Loaded deployment config: ${Object.keys(config).length} companies`);
    } catch {
      console.log('[Blockchain] No deployment.chipnet.json found — run genesis first');
      provider = null;
      return false;
    }

    console.log('[Blockchain] Chipnet initialized');
    return true;
  } catch (err) {
    console.error('[Blockchain] Init failed:', err);
    provider = null;
    return false;
  }
}

export async function getLiveCompanies(): Promise<Company[]> {
  if (!provider || !deployment) return [];

  const companies: Company[] = [];

  for (const [id, config] of Object.entries(deployment)) {
    try {
      const holderQueries = Object.entries(config.holders).map(async ([, addr]) => {
        try {
          const utxos = await provider!.getUtxos(addr);
          let sum = 0;
          for (const utxo of utxos) {
            if (utxo.token && utxo.token.category === config.tokenId) {
              sum += Number(utxo.token.amount);
            }
          }
          return sum;
        } catch {
          return 0;
        }
      });

      const results = await Promise.all(holderQueries);
      const holderTotal = results.reduce((a, b) => a + b, 0);

      let vaultTotal = 0;
      try {
        const vaultUtxos = await provider!.getUtxos(config.contractAddress);
        for (const u of vaultUtxos) {
          if (u.token && u.token.category === config.tokenId) {
            vaultTotal += Number(u.token.amount);
          }
        }
      } catch { /* vault unreachable */ }

      const totalFungible = holderTotal + vaultTotal;

      const names: Record<string, string> = {
        acme: 'ACME Corp',
        globex: 'Globex Industries',
      };
      const symbols: Record<string, string> = {
        acme: 'ACME',
        globex: 'GLBX',
      };
      const supplies: Record<string, number> = { acme: 1000, globex: 500 };

      companies.push({
        id,
        name: names[id] ?? id,
        symbol: symbols[id] ?? id.toUpperCase(),
        tokenId: config.tokenId,
        contractAddress: config.contractAddress,
        initialSupply: supplies[id] ?? 1000,
        currentSupply: totalFungible || (supplies[id] ?? 1000),
      });
    } catch (err) {
      console.error(`[Blockchain] Error querying ${id}:`, err);
    }
  }

  return companies;
}

export async function getLiveHoldings(companyId: string): Promise<
  { address: string; label: string; balance: number; ownershipPercent: number }[]
> {
  if (!provider || !deployment) return [];
  const config = deployment[companyId];
  if (!config) return [];

  const holders: Record<string, number> = {};
  for (const [label, addr] of Object.entries(config.holders)) {
    try {
      const utxos = await provider.getUtxos(addr);
      let total = 0n;
      for (const utxo of utxos) {
        if (utxo.token && utxo.token.category === config.tokenId) {
          total += utxo.token.amount;
        }
      }
      holders[label] = Number(total);
    } catch {
      holders[label] = 0;
    }
  }

  const totalSupply =
    Object.values(holders).reduce((s, v) => s + v, 0) || 1;

  return Object.entries(holders).map(([label, balance]) => ({
    address: config.holders[label] ?? '',
    label,
    balance,
    ownershipPercent: Math.round((balance / totalSupply) * 10000) / 100,
  }));
}

export async function getLiveDividendHistory(): Promise<DividendRound[]> {
  return [];
}

export async function initializeHoldings(
  companyId: string,
): Promise<{ success: false; error: string } | { success: true; txid: string }> {
  if (!provider || !deployment || !ownerTemplate || !ownerPkh || !secp) {
    return { success: false, error: 'Blockchain not initialized' };
  }
  const config = deployment[companyId];
  if (!config) return { success: false, error: 'Company not found' };

  try {
    const tokenIdSwapped = swapEndianness(config.tokenId);
    const artifact = JSON.parse(
      readFileSync(resolve(__dirname, '..', '..', 'contract', 'StockDividendVault.artifact.json'), 'utf-8'),
    );

    const vaultUtxos = await provider.getUtxos(config.contractAddress);
    const vaultUtxo = vaultUtxos.find((u) => u.token?.nft?.capability === 'minting');
    if (!vaultUtxo) return { success: false, error: 'Vault UTXO not found' };

    const seedHoldings: Record<string, Record<string, number>> = {
      acme: { 'Alice (CEO)': 300, 'Bob (Investor)': 250, 'Charlie (Investor)': 200, 'Diana (Investor)': 150, 'Eve (Investor)': 100 },
      globex: { 'Alice (CEO)': 150, 'Bob (Investor)': 100, 'Diana (Investor)': 75, 'Eve (Investor)': 50 },
    };
    const companyShares = seedHoldings[companyId] ?? {};
    const holderEntries = Object.entries(config.holders).slice(0, 5);
    const redistributed = holderEntries.slice(0, 5).map(([label, addr]) => ({
      label, address: addr,
      tokens: BigInt(companyShares[label] ?? 0),
      pkh: (decodeCashAddress(addr) as { payload: Uint8Array }).payload,
    }));
    while (redistributed.length < 5) {
      const deployerAddr = (encodeCashAddress({ type: 'p2pkhWithTokens', payload: ownerPkh, prefix: 'bchtest' }) as { address: string }).address;
      redistributed.push({ label: '', address: deployerAddr, tokens: 0n, pkh: ownerPkh });
    }

    const vaultInputAmount = vaultUtxo.token?.amount ?? 0n;
    const vaultOutputAmount = vaultInputAmount - redistributed.reduce((s, r) => s + r.tokens, 0n);

    const contract = new Contract(artifact, [ownerPkh, tokenIdSwapped], { provider });
    const ownerPubkey = secp.derivePublicKeyCompressed(ownerPrivKey) as Uint8Array;
    const deployerAddr = (encodeCashAddress({ type: 'p2pkhWithTokens', payload: ownerPkh, prefix: 'bchtest' }) as { address: string }).address;
    const deployerUtxos = await provider.getUtxos(deployerAddr);
    const deployerUtxo = deployerUtxos.find((u) => !u.token && u.satoshis > 5_000n);
    if (!deployerUtxo) return { success: false, error: 'No funded deployer UTXO' };

    let tx = new TransactionBuilder({ provider })
      .addInput(vaultUtxo, contract.unlock.distribute(
        ownerPubkey, ownerTemplate,
        redistributed[0].pkh, redistributed[0].tokens,
        redistributed[1].pkh, redistributed[1].tokens,
        redistributed[2].pkh, redistributed[2].tokens,
        redistributed[3].pkh, redistributed[3].tokens,
        redistributed[4].pkh, redistributed[4].tokens,
      ))
      .addInput(deployerUtxo, ownerTemplate.unlockP2PKH())
      .addOutput({ to: contract.tokenAddress, amount: 1000n, token: { amount: vaultOutputAmount, category: config.tokenId, nft: { capability: 'minting' as const, commitment: '' } } });

    for (const h of redistributed) {
      tx = tx.addOutput({ to: h.address, amount: 1000n, token: { amount: h.tokens, category: config.tokenId } });
    }

    tx = tx.addOpReturnOutput(['stock-init', companyId])
      .addBchChangeOutputIfNeeded({ to: deployerAddr, feeRate: 1.0 });

    const result = await tx.send();
    console.log(`[Blockchain] Initial holdings tx: ${result.txid}`);
    return { success: true, txid: result.txid };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function broadcastDividend(
  companyId: string,
  rate: number,
): Promise<{ success: false; error: string } | { success: true; round: DividendRound }> {
  if (!provider || !deployment || !ownerTemplate || !ownerPkh) {
    return { success: false, error: 'Blockchain not initialized' };
  }

  const config = deployment[companyId];
  if (!config) return { success: false, error: 'Company not found in deployment' };

  try {
    const tokenIdSwapped = swapEndianness(config.tokenId);

    const artifact = JSON.parse(
      readFileSync(resolve(__dirname, '..', '..', 'contract', 'StockDividendVault.artifact.json'), 'utf-8'),
    );

    const vaultUtxos = await provider.getUtxos(config.contractAddress);
    console.log(`[Blockchain] Vault addr: ${config.contractAddress}`);
    console.log(`[Blockchain] Vault UTXOs: ${vaultUtxos.length}`);
    for (const u of vaultUtxos) {
      console.log(`  ${u.txid}:${u.vout} sats=${u.satoshis} token=${u.token ? `${u.token.category.substring(0,12)}/${u.token.amount} nft=${u.token.nft?.capability}` : '[BCH]'}`);
    }
    const vaultUtxo = vaultUtxos.find(
      (u) => u.token?.nft?.capability === 'minting',
    );

    if (!vaultUtxo) {
      return { success: false, error: 'Vault UTXO with minting NFT not found' };
    }

    console.log(`[Blockchain] Found vault UTXO: ${vaultUtxo.txid}:${vaultUtxo.vout}`);
    console.log(`[Blockchain]   category: ${vaultUtxo.token?.category}`);
    console.log(`[Blockchain]   config.tokenId: ${config.tokenId}`);

    const holderEntries = Object.entries(config.holders);
    if (holderEntries.length === 0) {
      return { success: false, error: 'No holders configured' };
    }

    const supplies: Record<string, number> = { acme: 1000, globex: 500 };
    const seedHoldings: Record<string, Record<string, number>> = {
      acme: { 'Alice (CEO)': 300, 'Bob (Investor)': 250, 'Charlie (Investor)': 200, 'Diana (Investor)': 150, 'Eve (Investor)': 100 },
      globex: { 'Alice (CEO)': 150, 'Bob (Investor)': 100, 'Diana (Investor)': 75, 'Eve (Investor)': 50 },
    };
    const companyShares = seedHoldings[companyId] ?? {};
    const fallbackSupply = supplies[companyId] ?? 1000;

    const allHolders = holderEntries.slice(0, 5);

    const redistributed: { label: string; address: string; tokens: bigint }[] = [];
    for (const [label, addr] of allHolders) {
      const seedShare = companyShares[label] ?? 0;
      const tokens = Math.floor(seedShare * (rate / 100));
      redistributed.push({ label, address: addr, tokens: BigInt(Math.max(tokens, 1)) });
    }
    while (redistributed.length < 5) {
      redistributed.push({ label: '', address: '', tokens: 0n });
    }

    const totalNewTokens = redistributed.reduce((s, r) => s + Number(r.tokens), 0);

    const holdings = await getLiveHoldings(companyId);

    const contract = new Contract(artifact, [ownerPkh, tokenIdSwapped], { provider });
    const ownerPubkey = secp.derivePublicKeyCompressed(ownerPrivKey) as Uint8Array;

    const holders = redistributed.map((r) => ({
      address: r.address,
      pkh: r.address ? (decodeCashAddress(r.address) as { payload: Uint8Array }).payload : new Uint8Array(20),
    }));

    const deployerAddr = (encodeCashAddress({ type: 'p2pkhWithTokens', payload: ownerPkh, prefix: 'bchtest' }) as { address: string }).address;
    const deployerUtxos = await provider.getUtxos(deployerAddr);
    const deployerUtxo = deployerUtxos.find((u) => !u.token && u.satoshis > 5_000n);
    if (!deployerUtxo) {
      return { success: false, error: 'No funded deployer UTXO available' };
    }

    const names = redistributed.map(r => r.label).filter(Boolean).join(', ');
    console.log(`[Blockchain] Building tx (${redistributed.filter(r => r.tokens > 0n).length} holders): ${names}`);
    console.log(`[Blockchain] Vault input tokens: ${vaultUtxo.token?.amount ?? 0n}`);

    const vaultInputAmount = vaultUtxo.token?.amount ?? 0n;
    const vaultOutputAmount = vaultInputAmount - redistributed.reduce((s, r) => s + r.tokens, 0n);

    let tx = new TransactionBuilder({ provider })
      .addInput(vaultUtxo, contract.unlock.distribute(
        ownerPubkey,
        ownerTemplate,
        holders[0].pkh, redistributed[0].tokens,
        holders[1].pkh, redistributed[1].tokens,
        holders[2].pkh, redistributed[2].tokens,
        holders[3].pkh, redistributed[3].tokens,
        holders[4].pkh, redistributed[4].tokens,
      ))
      .addInput(deployerUtxo, ownerTemplate.unlockP2PKH())
      .addOutput({
        to: contract.tokenAddress,
        amount: 1000n,
        token: { amount: vaultOutputAmount, category: config.tokenId, nft: { capability: 'minting' as const, commitment: '' } },
      });

    for (const h of redistributed) {
      if (h.address) {
        tx = tx.addOutput({ to: h.address, amount: 1000n, token: { amount: h.tokens, category: config.tokenId } });
      } else {
        tx = tx.addOutput({ to: deployerAddr, amount: 1000n, token: { amount: 0n, category: config.tokenId } });
      }
    }

    const merkleLeaves = redistributed
      .filter((r) => r.tokens > 0n)
      .map((r) => ({ label: r.label, shares: Number(r.tokens) }));
    const { root: merkleRoot } = buildMerkleTree(merkleLeaves);

    tx = tx.addOpReturnOutput(['stock-dividend', companyId, `rate=${rate}%`, `holders=${redistributed.filter(r => r.tokens > 0n).length}`, `root=${merkleRoot.substring(0, 16)}`])
      .addBchChangeOutputIfNeeded({ to: deployerAddr, feeRate: 1.0 });

    console.log(`[Blockchain] Sending tx with ${vaultUtxo.satoshis + deployerUtxo.satoshis} sats in, ${1000n + 1000n + 1000n + (deployerUtxo.satoshis - 6000n)} sats out...`);

    const result = await tx.send();
    console.log(`[Blockchain] Dividend tx broadcast: ${result.txid}`);

    const today = new Date().toISOString().slice(0, 10);

    const round: DividendRound = {
      id: Date.now(),
      companyId,
      date: today,
      rate,
      newTokensMinted: totalNewTokens,
      totalSupplyAfter: fallbackSupply,
      txid: result.txid,
      announcementDate: today,
      recordDate: today,
      distributionDate: today,
      status: 'distributed' as const,
      merkleRoot,
    };

    return { success: true, round };
  } catch (err: any) {
    console.error(`[Blockchain] broadcastDividend failed:`, err);
    return { success: false, error: err.message };
  }
}
