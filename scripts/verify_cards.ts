const har = require("hardhat");
// 0xf240D8E0B9Cb493b380791b65CAFEef62080E5A1
// 0x823e620f112154b38C250c1595Ae0df2916d0dC8
async function main() {
  await har.run("verify:verify", {
    address: "0x95b1F288612C6D45b8e32156Fb561FA25f3b0Df9",
    constructorArguments: [],
    contract: "contracts/Cards_flat.sol:Cards",
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });