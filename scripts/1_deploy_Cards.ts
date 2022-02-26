import { ethers } from 'hardhat';

async function main() {
  // We get the contract to deploy
  // const owner = "0xf240D8E0B9Cb493b380791b65CAFEef62080E5A1";
  const Cards = await ethers.getContractFactory("Cards");
  const cards = await Cards.deploy();
  console.log("Cards deployed to:", cards.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
