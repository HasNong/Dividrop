import {
  deriveSeedFromBip39Mnemonic,
  deriveHdPrivateNodeFromSeed,
  deriveHdPath,
  instantiateSecp256k1,
  hash160,
  encodeCashAddress,
} from '@bitauth/libauth';
import { writeFileSync } from 'fs';

const SEED = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

const COMPANIES: Record<string, {
  tokenId: string;
  contractAddress: string;
  holders: { label: string; derivationPath: string }[];
}> = {
  acme: {
    tokenId: '377ec2d3045f762873418d6ead609dea52504f43c54e3a612c8a3e701664c5f9',
    contractAddress: 'bchtest:r0cga876a4revylhm4yt60z3qk39rllkrycqj6mple5hnffvwrfpsxpzeju92',
    holders: [
      { label: 'Alice (CEO)', derivationPath: "m/44'/145'/1'/0/0" },
      { label: 'Bob (Investor)', derivationPath: "m/44'/145'/1'/0/1" },
      { label: 'Charlie (Investor)', derivationPath: "m/44'/145'/1'/0/2" },
      { label: 'Diana (Investor)', derivationPath: "m/44'/145'/1'/0/3" },
      { label: 'Eve (Investor)', derivationPath: "m/44'/145'/1'/0/4" },
    ],
  },
};

async function main() {
  const secp = await instantiateSecp256k1();
  const seed = deriveSeedFromBip39Mnemonic(SEED);
  const root = deriveHdPrivateNodeFromSeed(seed);

  function derive(path: string): Uint8Array {
    const node = deriveHdPath(root, path);
    if (typeof node === 'string') throw new Error(`Bad path: ${path}`);
    return node.privateKey;
  }

  function toAddress(pk: Uint8Array): string {
    const pub = secp.derivePublicKeyCompressed(pk) as Uint8Array;
    const pkh = hash160(pub);
    const r = encodeCashAddress({ type: 'p2pkhWithTokens', payload: pkh, prefix: 'bchtest' });
    return typeof r === 'string' ? r : (r as { address: string }).address;
  }

  const config: Record<string, any> = {};

  for (const [id, data] of Object.entries(COMPANIES)) {
    const holders: Record<string, string> = {};
    for (const h of data.holders) {
      const pk = derive(h.derivationPath);
      holders[h.label] = toAddress(pk);
    }
    config[id] = { tokenId: data.tokenId, contractAddress: data.contractAddress, holders };
  }

  writeFileSync('frontend/src/deployment.chipnet.json', JSON.stringify(config, null, 2));
  console.log(JSON.stringify(config, null, 2));
}

main().catch(console.error);
