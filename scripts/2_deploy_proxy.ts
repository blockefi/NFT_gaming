//0xf240D8E0B9Cb493b380791b65CAFEef62080E5A1
//0x7a28d142Bf1559C7e620CCdcb60ffBD31104bA69
import { ethers } from 'hardhat';

async function main() {
  // We get the contract to deploy
  const owner = "0x10C3f62A81f7A3c769547CCed850cfca7Ad4e29e";//change this before deploying
  const implAddress = '0x95b1F288612C6D45b8e32156Fb561FA25f3b0Df9';//check this for mainnet
  const Proxy = await ethers.getContractFactory("OwnedUpgradeabilityProxy");
  const impl = await ethers.getContractFactory("contracts/Cards.sol:Cards");
  const proxy = await Proxy.deploy();
  console.log("Proxy deployed to:", proxy.address);

  const initializeData = impl.interface.encodeFunctionData('initialize', [
    owner, "Striker", "STR"
  ]);

  await proxy.upgradeToAndCall(implAddress, initializeData);

  const cards = await proxy.implementation();

  console.log('Implementation is: ', cards);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
