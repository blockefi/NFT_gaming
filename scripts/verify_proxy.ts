const hre = require("hardhat");
// 0xf240D8E0B9Cb493b380791b65CAFEef62080E5A1
// 0x823e620f112154b38C250c1595Ae0df2916d0dC8
async function verify() {
  await hre.run("verify:verify", {
    address: "0x0843D4171d8d371f4Fbf04A0A64608cD315fF71B",
    constructorArguments: [],
    contract: "contracts/upgradeability/OwnedUpgradeabilityProxy.sol:OwnedUpgradeabilityProxy",
  });
}

verify()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });