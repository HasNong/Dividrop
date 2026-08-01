import {
  ElectrumNetworkProvider,
  Contract,
  TransactionBuilder,
  SignatureTemplate,
  Network,
} from 'cashscript';
import {
  deriveSeedFromBip39Mnemonic,
  deriveHdPrivateNodeFromSeed,
  deriveHdPath,
  instantiateSecp256k1,
  hash160,
  encodeCashAddress,
  swapEndianness,
} from '@bitauth/libauth';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import artifact from '../contract/StockDividendVault.artifact.json' with { type: 'json' };

const SEED_PHRASE =
  process.env.SEED_PHRASE ||
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const CHIPNET_HOST = process.env.CHIPNET_HOST || 'chipnet.bch.ninja';
const OWNER_DERIVATION = "m/44'/145'/0'/0/0";

interface CompanyConfig {
  id: string;
  name: string;
  symbol: string;
  initialSupply: number;
  holders: { label: string; shares: number; derivationPath: string }[];
}

const COMPANIES: CompanyConfig[] = [
  {
    id: 'acme',
    name: 'ACME Corp',
    symbol: 'ACME',
    initialSupply: 1000,
    holders: [
      { label: 'Alice (CEO)', shares: 300, derivationPath: "m/44'/145'/1'/0/0" },
      { label: 'Bob (Investor)', shares: 250, derivationPath: "m/44'/145'/1'/0/1" },
      { label: 'Charlie (Investor)', shares: 200, derivationPath: "m/44'/145'/1'/0/2" },
      { label: 'Diana (Investor)', shares: 150, derivationPath: "m/44'/145'/1'/0/3" },
      { label: 'Eve (Investor)', shares: 100, derivationPath: "m/44'/145'/1'/0/4" },
    ],
  },
  {
    id: 'globex',
    name: 'Globex Industries',
    symbol: 'GLBX',
    initialSupply: 500,
    holders: [
      { label: 'Alice (CEO)', shares: 150, derivationPath: "m/44'/145'/2'/0/0" },
      { label: 'Bob (Investor)', shares: 100, derivationPath: "m/44'/145'/2'/0/1" },
      { label: 'Diana (Investor)', shares: 75, derivationPath: "m/44'/145'/2'/0/2" },
      { label: 'Eve (Investor)', shares: 50, derivationPath: "m/44'/145'/2'/0/3" },
    ],
  },
];

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const provider = new ElectrumNetworkProvider(Network.CHIPNET, { hostname: CHIPNET_HOST });
  const secp = await instantiateSecp256k1();
  console.log(`Network: chipnet @ ${CHIPNET_HOST}`);

  const seed = deriveSeedFromBip39Mnemonic(SEED_PHRASE);
  const rootNode = deriveHdPrivateNodeFromSeed(seed);

  function deriveHdNode(path: string): Uint8Array {
    const node = deriveHdPath(rootNode, path);
    if (typeof node === 'string') throw new Error(`Invalid derivation path: ${path}`);
    return node.privateKey;
  }

  function deriveAddress(privateKey: Uint8Array): string {
    const pubkey = secp.derivePublicKeyCompressed(privateKey) as Uint8Array;
    const pkh = hash160(pubkey);
    const encoded = encodeCashAddress({ type: 'p2pkhWithTokens', payload: pkh, prefix: 'bchtest' });
    return typeof encoded === 'string' ? encoded : (encoded as { address: string }).address;
  }

  const deployerPriv = deriveHdNode(OWNER_DERIVATION);
  const deployerAddress = deriveAddress(deployerPriv);
  const deployerPub = secp.derivePublicKeyCompressed(deployerPriv) as Uint8Array;
  const deployerPkh = hash160(deployerPub);
  const template = new SignatureTemplate(deployerPriv);

  console.log(`Deployer address: ${deployerAddress}`);

  const deployerUtxos = await provider.getUtxos(deployerAddress);
  let fundedUtxo = deployerUtxos.find(
    (u) => !u.token && u.satoshis > 10_000n,
  );
  if (!fundedUtxo) {
    console.error(`No funded UTXO at ${deployerAddress}`);
    console.error(`Please fund this address with chipnet BCH first.`);
    console.error(`Faucet: https://chipnet.imaginary.cash/faucet`);
    console.error(`Explorer: https://chipnet.bchexplorer.info`);
    process.exit(1);
  }
  const deploymentPath = 'frontend/src/deployment.chipnet.json';
  let deploymentEntries: Record<
    string,
    { tokenId: string; contractAddress: string; holders: Record<string, string> }
  > = {};
  if (existsSync(deploymentPath)) {
    try {
      deploymentEntries = JSON.parse(readFileSync(deploymentPath, 'utf-8'));
      console.log(`Loaded existing deployment: ${Object.keys(deploymentEntries).join(', ')}`);
    } catch { /* start fresh */ }
  }

  const toDeploy = process.env.GENESIS_COMPANY
    ? COMPANIES.filter((c) => c.id === process.env.GENESIS_COMPANY)
    : COMPANIES;

  for (const company of toDeploy) {
    if (deploymentEntries[company.id]) {
      console.log(`\n━━━ ${company.name} (${company.symbol}) — SKIPPED (already deployed) ━━━`);
      continue;
    }
    console.log(`\n━━━ ${company.name} (${company.symbol}) ━━━`);

    console.log('Creating vout0 UTXO...');
    const vout0Fee = 500n;
    const vout0Amount = fundedUtxo.satoshis - vout0Fee;

    const vout0Builder = new TransactionBuilder({ provider });
    vout0Builder.addInput(fundedUtxo, template.unlockP2PKH());
    vout0Builder.addOutput({ to: deployerAddress, amount: vout0Amount });
    const vout0Tx = await vout0Builder.send();
    const vout0Utxo = { txid: vout0Tx.txid, vout: 0, satoshis: vout0Amount };

    const tokenId = vout0Tx.txid;
    const tokenIdSwapped = swapEndianness(tokenId);
    console.log(`Token ID: ${tokenId}`);

    const contract = new Contract(
      artifact,
      [deployerPkh, tokenIdSwapped],
      { provider },
    );
    console.log(`Vault address: ${contract.tokenAddress}`);

    await sleep(3000);
    console.log('Building genesis transaction...');

    const holderData: Record<string, string> = {};
    const genesisBuilder = new TransactionBuilder({ provider });
    genesisBuilder.addInput(vout0Utxo, template.unlockP2PKH());

    genesisBuilder.addOutput({
      to: contract.tokenAddress,
      amount: 1000n,
      token: {
        category: tokenId,
        amount: BigInt(company.initialSupply),
        nft: { capability: 'minting', commitment: '' },
      },
    });

    for (const holder of company.holders) {
      const holderPriv = deriveHdNode(holder.derivationPath);
      const holderAddress = deriveAddress(holderPriv);
      holderData[holder.label] = holderAddress;
    }

    genesisBuilder.addOpReturnOutput(['stock-dividend', company.id]);
    genesisBuilder.addBchChangeOutputIfNeeded({
      to: deployerAddress,
      feeRate: 1.0,
    });

    console.log(`Sending genesis tx for ${company.symbol}...`);
    const genesisTx = await genesisBuilder.send();
    console.log(`Genesis txid: ${genesisTx.txid}`);

    deploymentEntries[company.id] = {
      tokenId,
      contractAddress: contract.tokenAddress,
      holders: holderData,
    };

    writeFileSync(deploymentPath, JSON.stringify(deploymentEntries, null, 2));
    console.log(`Deployment config updated with ${company.id}`);

    console.log('Waiting for UTXO refresh...');
    await sleep(10000);

    const refreshedUtxos = await provider.getUtxos(deployerAddress);
    const freshFunded = refreshedUtxos.find(
      (u) => !u.token && u.satoshis > 10_000n,
    );
    if (freshFunded) {
      fundedUtxo = freshFunded;
    } else {
      console.log('Waiting longer for confirmation...');
      await sleep(15000);
      const retry = await provider.getUtxos(deployerAddress);
      const retryFunded = retry.find(
        (u) => !u.token && u.satoshis > 10_000n,
      );
      if (retryFunded) {
        fundedUtxo = retryFunded;
      }
    }
    console.log(`Deployer balance: ${fundedUtxo.satoshis} sats`);
  }

  console.log(`\nDeployment config saved to ${deploymentPath}`);
  console.log('Genesis complete.');
}

main().catch((err) => {
  console.error('Genesis failed:', err);
  process.exit(1);
});
