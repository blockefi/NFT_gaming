import "hardhat-typechain";
import "solidity-coverage";
import "@nomiclabs/hardhat-waffle";
import "hardhat-typechain";
import "@typechain/ethers-v5";
import "@nomiclabs/hardhat-web3";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-gas-reporter";

import { HardhatUserConfig } from "hardhat/config";
import * as dotenv from "dotenv";
import { accounts } from "./test/shared/accounts";


dotenv.config();

const MUMBAI_PRIVATE_KEY = process.env.MUMBAI_PRIVATE_KEY;
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },

  // gasReporter: {
  //   currency: "CHF",
  //   gasPrice: 21,
  //   enabled: false,
  // },

  networks: {
    hardhat: {
      gas: 10000000,
      gasPrice: 1,
      blockGasLimit: 20000000,
      allowUnlimitedContractSize: true,
      accounts: accounts,
    },
    testnet: {
      url: `https://testnet.veblocks.net`,
      // accounts: [secret],
    },
    rinkeby: {
			url: `https://rinkeby.infura.io/v3/3f05772998774c6a86b0803a6aed75c3`,
			accounts: [`0x${MUMBAI_PRIVATE_KEY}`]
		},
    mumbai: {
      url: ALCHEMY_API_KEY,
      accounts: [`0x${MUMBAI_PRIVATE_KEY}`],
    },
    local: {
      url: "http://127.0.0.1:8545",
    },
  },

  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: POLYGON_API_KEY,
  },

  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
  mocha: {
    timeout: 2000000
  }
};

export default config;
