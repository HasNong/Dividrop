import { Contract, ElectrumNetworkProvider, Network } from 'cashscript';
import { swapEndianness } from '@bitauth/libauth';
import artifact from '../contract/StockDividendVault.artifact.json' with { type: 'json' };

const OWNER_PKH = process.env.OWNER_PKH;
const TOKEN_ID = process.env.TOKEN_ID;

if (!OWNER_PKH || !TOKEN_ID) {
  console.error('Set OWNER_PKH and TOKEN_ID environment variables');
  console.error('OWNER_PKH: 20-byte hex pubkey hash of the company owner');
  console.error('TOKEN_ID: 32-byte hex token category (from genesis txid)');
  process.exit(1);
}

const provider = new ElectrumNetworkProvider(Network.CHIPNET);
const tokenIdSwapped = swapEndianness(TOKEN_ID);

const contract = new Contract(
  artifact,
  [OWNER_PKH, tokenIdSwapped],
  { provider }
);

console.log('Contract deployed at:', contract.address);
console.log('Token-aware address:', contract.tokenAddress);
console.log('Setup complete. Fund this address with a minting NFT of category:', TOKEN_ID);
