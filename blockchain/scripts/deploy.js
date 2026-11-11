/**
 * Deploys CertificateRegistry.
 *
 * Local:   npm run deploy:local   (expects `npm run node` running on 127.0.0.1:8545)
 * Sepolia: npm run deploy:sepolia (needs SEPOLIA_RPC_URL + DEPLOYER_PRIVATE_KEY in .env)
 *
 * The deployer receives DEFAULT_ADMIN_ROLE (the platform admin wallet).
 */
const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Network:', hre.network.name);
  console.log('Deploying CertificateRegistry with account:', deployer.address);

  const Registry = await hre.ethers.getContractFactory('CertificateRegistry');
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log('');
  console.log('CertificateRegistry deployed to:', address);
  console.log('Admin (DEFAULT_ADMIN_ROLE) = deployer:', deployer.address);
  console.log('');
  console.log('Next steps:');
  console.log('  backend/.env   -> CONTRACT_ADDRESS=' + address);
  console.log('  frontend/.env  -> VITE_CONTRACT_ADDRESS=' + address);
  if (hre.network.name === 'sepolia') {
    console.log('  Verify on Etherscan: npx hardhat verify --network sepolia ' + address);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
