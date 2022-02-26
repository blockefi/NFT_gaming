import {
  Cards,
  Cards__factory,
  OwnedUpgradeabilityProxy,
  OwnedUpgradeabilityProxy__factory
} from '../typechain';
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { expect } from "chai";
import chai from "chai";
import { addressFromNumber } from './shared/utilities';
chai.use(require("chai-bignumber")(BigNumber));

describe("Marketplace", () => {
  let cards: Cards;
  let impl: Cards;
  let proxy: OwnedUpgradeabilityProxy;
  let owner: SignerWithAddress;
  let signers: SignerWithAddress[];

  function createURI(n: number): string[] {
    let uri: string[] = [];

    for (let i = 0; i < n; i++) {
      uri[i] = "https://ipfs.io/ipfs" + "/" + (i+1);
    }

    return uri;
  }

  function createTokenURI(n: number, start: number): string[] {
    let uri: string[] = [];

    for (let i = start; i < n; i++) {
      uri[i] = "https://ipfs.io/ipfs" + "/" + (i+1);
    }

    return uri;
  }

  function createCards(n: number): number[] {
    let cards: number[] = [];

    for (let i = 0; i < n; i++) {
      cards[i] = (i+1);
    }

    return cards;
  }

  function createTokenIds(n: number, start: number): number[] {
    let cards: number[] = [];

    for (let i = start; i < n; i++) {
      cards[i] = (i+1);
    }

    return cards;
  }


  beforeEach(async () => {
    signers = await ethers.getSigners();
    owner = await signers[0];
    impl = await new Cards__factory(owner).deploy();
    proxy = await new OwnedUpgradeabilityProxy__factory(owner).deploy();
    cards = await new Cards__factory(owner).attach(proxy.address);

    const initializeData = impl.interface.encodeFunctionData('initialize', [
      owner.address, "Centurion", "CTR"
    ]);

    await proxy.upgradeToAndCall(impl.address, initializeData);
  });

  describe("Initializing Cards", async () => {
    it("Set contract deployer as owner", async () => {
      expect(await cards.owner()).to.be.eq(owner.address);
    });

    it("Set implementation address", async () => {
      expect(await proxy.implementation()).to.be.eq(impl.address);
    });

    it("Can transfer ownership", async () => {
      await cards.connect(owner).transferOwnership(signers[1].address);
      expect(await cards.owner()).to.be.eq(signers[1].address);

      await cards.connect(signers[1]).transferOwnership(owner.address);
      expect(await cards.owner()).to.be.eq(owner.address);
    });
  });

  describe("Bundle Minting", async () => {
    it("BatchMint: Fail", async () => {
      await expect(cards.connect(signers[3]).bundleMint(createCards(5), createURI(5))).to.be.revertedWith("MinterRole: Only minter has the access");
    });

    it("BatchMint: Fail", async () => {
      await expect(cards.connect(signers[3]).addMinter(signers[2].address)).to.be.revertedWith("MinterRole: Only minter has the access");
    });

    it("Only existing minter can add new minter", async () => {
      expect(await cards.isMinter(owner.address)).to.be.eq(true);

      await cards.connect(owner).addMinter(signers[1].address);

      expect(await cards.isMinter(signers[1].address)).to.be.eq(true);
    });

    it("Existing minter can renounce their minting role", async () => {
      await cards.connect(owner).addMinter(signers[1].address);

      expect(await cards.isMinter(signers[1].address)).to.be.eq(true);
      expect(await cards.isMinter(owner.address)).to.be.eq(true);

      await cards.connect(signers[1]).renounceMinter();

      expect(await cards.isMinter(signers[1].address)).to.be.eq(false);
      expect(await cards.isMinter(owner.address)).to.be.eq(true);
    });

    it("Mints all the cards to the owner's address", async () => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));
      expect(await cards.ownerOf(3)).to.be.eq(owner.address);
      expect(await cards.ownerOf(5)).to.be.eq(owner.address);
    });

    it("Check for the token is already minted or not", async() => {
      expect(await cards.exists(10)).to.be.eq(false);
      expect(await cards.exists(19)).to.be.eq(false);

      await cards.connect(owner).bundleMint(createCards(5), createURI(5));

      expect(await cards.exists(5)).to.be.eq(true);
      expect(await cards.exists(3)).to.be.eq(true);
    });

    it("Set token's URI after minting", async() => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));
  
      expect(await cards.tokenURI(3)).to.be.eq("https://ipfs.io/ipfs/3");
      expect(await cards.tokenURI(5)).to.be.eq("https://ipfs.io/ipfs/5");
    });

    it("Add minter and allow minter to mint cards bundle", async() => {
      await cards.connect(owner).addMinter(signers[2].address);

      expect(await cards.isMinter(signers[2].address)).to.be.eq(true);

      await cards.connect(signers[2]).bundleMint(createCards(5), createURI(5));
      await cards.connect(signers[2]).bundleMint([9999,99999,9999999], ["f","g","h"]);

      expect(await cards.exists(1)).to.be.eq(true);
      expect(await cards.exists(4)).to.be.eq(true);

      expect(await cards.ownerOf(5)).to.be.eq(owner.address);
      expect(await cards.ownerOf(3)).to.be.eq(owner.address);
    });

    it("Checks bundle mint limit", async () => {
      await cards.connect(owner).bundleMint(createCards(390), createURI(390));

      expect(await cards.ownerOf(5)).to.be.eq(owner.address);
      expect(await cards.ownerOf(99)).to.be.eq(owner.address);
      expect(await cards.ownerOf(100)).to.be.eq(owner.address);
      expect(await cards.ownerOf(387)).to.be.eq(owner.address);
      expect(await cards.ownerOf(390)).to.be.eq(owner.address);

      expect(await cards.exists(359)).to.be.eq(true);
      expect(await cards.exists(259)).to.be.eq(true);
      expect(await cards.exists(299)).to.be.eq(true);
    });
  });

  describe("Token URI", async () => {
    it("Set URI for minted tokens", async () => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));

      expect(await cards.tokenURI(4)).to.be.eq("https://ipfs.io/ipfs/4");
      expect(await cards.tokenURI(5)).to.be.eq("https://ipfs.io/ipfs/5");
    });

    it("Set URI for single minted token", async () => {
      await cards.connect(owner).mint(100, "https://ipfs.io/ipfs/1");
      await cards.connect(owner).mint(1001, "https://ipfs.io/ipfs/2");

      expect(await cards.tokenURI(100)).to.be.eq("https://ipfs.io/ipfs/1");
      expect(await cards.tokenURI(1001)).to.be.eq("https://ipfs.io/ipfs/2");
    });

    it("Only minter can set token uri", async () => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));

      expect(await cards.ownerOf(5)).to.be.eq(owner.address);

      await cards.connect(owner).setTokenURI(5, "https://ipfs.io/ipfs/35");

      expect(await cards.tokenURI(5)).to.be.eq("https://ipfs.io/ipfs/35");
    });

    it("SetTokenURI after token transfer", async () => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));

      expect(await cards.ownerOf(5)).to.be.eq(owner.address);

      await cards.connect(owner).transferFrom(owner.address, signers[3].address, 5);
      await cards.connect(owner).setTokenURI(5, "https://ipfs.io/ipfs/35");

      expect(await cards.tokenURI(5)).to.be.eq("https://ipfs.io/ipfs/35");
    });

    it("SetTokenURI: Fail", async () => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));

      expect(await cards.ownerOf(5)).to.be.eq(owner.address);
      await expect(cards.connect(signers[1]).setTokenURI(5, "https://ipfs.io/ipfs/35")).to.be.revertedWith("MinterRole: Only minter has the access");
    });

    it("SetTokenURI: Fail", async () => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));

      expect(await cards.ownerOf(5)).to.be.eq(owner.address);
      await cards.connect(owner).transferFrom(owner.address, signers[3].address, 5);

      await expect(cards.connect(signers[2]).setTokenURI(5, "https://ipfs.io/ipfs/35")).to.be.revertedWith("MinterRole: Only minter has the access");
    });
  });

  describe("Bundle Transfer", async () => {
    it("BatchTransfer: Fail", async () => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));
      await expect(cards.connect(owner).bundleTransfer([signers[3].address], [1,3])).to.be.revertedWith("Cards: Batch-size mismatch");
    });

    it("BundleTransfer: Fail", async () => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));

      await expect(cards.connect(owner).bundleTransfer([signers[4].address], [])).to.be.revertedWith("Cards: Invalid batch-size");
    });

    it("BundleTransfer: Fail", async () => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));

      await expect(cards.connect(signers[1]).bundleTransfer([signers[3].address, signers[4].address], [1,3])).to.be.revertedWith("MinterRole: Only minter has the access");
    });

    it("Check the balance before and after transfer", async() => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));

      expect(await cards.balanceOf(owner.address)).to.be.eq(5);
      expect(await cards.balanceOf(signers[2].address)).to.be.eq(0);

      expect(await cards.owner()).to.be.eq(owner.address);

      await cards.connect(owner).bundleTransfer([signers[2].address], [4]);
      await cards.connect(owner).bundleTransfer([signers[3].address], [5]);

      expect(await cards.balanceOf(signers[2].address)).to.be.eq(1);
      expect(await cards.balanceOf(signers[3].address)).to.be.eq(1);
    });

    it("Will check ownership of each token after transfer", async () => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));

      await cards.connect(owner).bundleTransfer([signers[1].address, signers[2].address, signers[3].address, signers[4].address, signers[5].address], createCards(5));

      for(let i=1; i<=5; i++){
        expect(await cards.ownerOf(i)).to.be.eq(signers[i].address);
      }
    });
  });

  describe("Batch Transfer From", async () => {
    it("BatchTransfer: Fail", async () => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));
      await expect(cards.connect(signers[1]).batchTransferFrom(signers[3].address, signers[4].address, [10,11])).to.be.revertedWith("Cards: transfer caller is not owner nor approved");
    });

    it("BatchTransfer: Fail", async () => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));

      await expect(cards.connect(owner).batchTransferFrom(owner.address, signers[4].address, [])).to.be.revertedWith("Cards: Invalid batch-size");
    });

    it("BatchTransfer: Fail", async () => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));

      await expect(cards.connect(owner).batchTransferFrom(owner.address, addressFromNumber(0), [1,5])).to.be.revertedWith("Cards: Invalid receiver address");
    });

    it("BatchTransfer: Fail", async () => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));

      await expect(cards.connect(owner).batchTransferFrom(owner.address, signers[2].address, [1,6])).to.be.revertedWith("Cards: Invalid TokenId");
    });

    it("Will check ownership of each token before transfer", async () => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));

      for(let i=1; i<=5; i++){
        expect(await cards.ownerOf(i)).to.be.eq(owner.address);
      }      
    });

    it("Check the balance before and after transfer", async() => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));

      expect(await cards.balanceOf(owner.address)).to.be.eq(5);
      expect(await cards.balanceOf(signers[2].address)).to.be.eq(0);

      await cards.connect(owner).batchTransferFrom(owner.address, signers[2].address, createCards(5));

      expect(await cards.balanceOf(owner.address)).to.be.eq(0);
      expect(await cards.balanceOf(signers[2].address)).to.be.eq(5);
    });

    it("Token owner can give approval to the operator", async() => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));
      await cards.connect(owner).batchTransferFrom(owner.address, signers[1].address, createCards(5));

      expect(await cards.isApprovedForAll(signers[1].address, signers[2].address)).to.eq(false);

      await cards.connect(signers[1]).setApprovalForAll(signers[2].address, true);

      expect(await cards.isApprovedForAll(signers[1].address, signers[2].address)).to.eq(true);
    });

    it("Operator transferring from owner after getting approval", async() => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));
      await cards.connect(owner).batchTransferFrom(owner.address, signers[1].address, createCards(5));

      await cards.connect(signers[1]).setApprovalForAll(signers[2].address, true);
      await cards.connect(signers[2]).batchTransferFrom(signers[1].address, signers[4].address, createCards(5));

      expect(await cards.balanceOf(signers[4].address)).to.be.eq(5);
      expect(await cards.ownerOf(5)).to.be.eq(signers[4].address);
      expect(await cards.ownerOf(2)).to.be.eq(signers[4].address);
    });

    it("Batch transfer multiple times", async() => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));
      await cards.connect(owner).batchTransferFrom(owner.address, signers[1].address, createCards(5));
      await cards.connect(signers[1]).batchTransferFrom(signers[1].address, signers[2].address, [1,2,4,5]);

      await cards.connect(signers[2]).setApprovalForAll(signers[3].address, true);
      await cards.connect(signers[3]).batchTransferFrom(signers[2].address, signers[4].address, [1,5,4]);

      await cards.connect(signers[4]).setApprovalForAll(signers[6].address, true);
      await cards.connect(signers[6]).batchTransferFrom(signers[4].address, signers[7].address, [1,4]);

      expect(await cards.balanceOf(signers[2].address)).to.be.eq(1);
      expect(await cards.balanceOf(signers[1].address)).to.be.eq(1);
      expect(await cards.balanceOf(signers[4].address)).to.be.eq(1);
      expect(await cards.balanceOf(owner.address)).to.be.eq(0);
      expect(await cards.balanceOf(signers[7].address)).to.be.eq(2);
    });

    it("Will check ownership of each token after transfer", async () => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));
      await cards.connect(owner).batchTransferFrom(owner.address, signers[1].address, createCards(5));

      await cards.connect(signers[1]).setApprovalForAll(signers[2].address, true);
      await cards.connect(signers[2]).batchTransferFrom(signers[1].address, signers[3].address, createCards(5));

      for(let i=1; i<=5; i++){
        expect(await cards.ownerOf(i)).to.be.eq(signers[3].address);
      }
    });

    it("Clear approvals after transfer", async () => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));
      await cards.connect(owner).batchTransferFrom(owner.address, signers[1].address, createCards(5));

      await cards.connect(signers[1]).setApprovalForAll(signers[2].address, true);
      await cards.connect(signers[2]).batchTransferFrom(signers[1].address, signers[3].address, createCards(5));

      for(let i=1; i<=5; i++){
        expect(await cards.getApproved(i)).to.be.eq(addressFromNumber(0));
      }
    });

    it("Check batchTransfer limit", async () => {
      await cards.connect(owner).bundleMint(createCards(390), createURI(390));
      // await cards.connect(owner).bundleMint(createTokenIds(798,390), createTokenURI(798,390));
      await cards.connect(owner).setApprovalForAll(signers[2].address, true);
      await cards.connect(signers[2]).batchTransferFrom(owner.address, signers[3].address, createCards(390));

      expect(await cards.balanceOf(signers[3].address)).to.be.eq(390);
      expect(await cards.balanceOf(signers[2].address)).to.be.eq(0);
      expect(await cards.balanceOf(owner.address)).to.be.eq(0);

      expect(await cards.ownerOf(129)).to.be.eq(signers[3].address);
      expect(await cards.ownerOf(99)).to.be.eq(signers[3].address);
      expect(await cards.ownerOf(1)).to.be.eq(signers[3].address);
      expect(await cards.ownerOf(390)).to.be.eq(signers[3].address);
    });
  });

  describe("Bundle Burn", async () => {
    it("BundleBurn: Fail", async () => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));
      await expect(cards.connect(signers[1]).bundleBurn([10,11])).to.be.revertedWith("MinterRole: Only minter has the access");
    });

    it("BundleBurn: Fail", async () => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));

      await expect(cards.connect(owner).bundleBurn([6,7])).to.be.revertedWith("Cards: Invalid TokenId");
    });

    it("BundleBurn: Fail", async () => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));
      await cards.connect(owner).batchTransferFrom(owner.address, signers[2].address, [1,3,5]);

      await expect(cards.connect(owner).bundleBurn([1,5])).to.be.revertedWith("Cards: Only token owner can burn");
    });

    it("Remove ownership after burning", async () => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));

      expect(await cards.exists(1)).to.be.eq(true);
      expect(await cards.exists(3)).to.be.eq(true);
      expect(await cards.exists(5)).to.be.eq(true);
  
      await cards.connect(owner).bundleBurn([1,3,5]);

      expect(await cards.exists(1)).to.be.eq(false);
      expect(await cards.exists(3)).to.be.eq(false);
      expect(await cards.exists(5)).to.be.eq(false);
    });

    it("Check the balance before and after burn", async() => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));

      expect(await cards.balanceOf(owner.address)).to.be.eq(5);
  
      await cards.connect(owner).bundleBurn([1,3,5]);

      expect(await cards.balanceOf(owner.address)).to.be.eq(2);
    });

    it("Clear approvals after bundle burn", async () => {
      await cards.connect(owner).bundleMint(createCards(5), createURI(5));

      expect(await cards.balanceOf(owner.address)).to.be.eq(5);
  
      await cards.connect(owner).bundleBurn([1,3,5]);

      await expect(cards.getApproved(1)).to.be.revertedWith("Cards: approved query for nonexistent token");
      await expect(cards.getApproved(3)).to.be.revertedWith("Cards: approved query for nonexistent token");
      await expect(cards.getApproved(5)).to.be.revertedWith("Cards: approved query for nonexistent token");
    });

    it("Check bundle burn limit", async () => {
      await cards.connect(owner).bundleMint(createCards(390), createURI(390));
      
      expect(await cards.balanceOf(owner.address)).to.be.eq(390);

      await cards.connect(owner).bundleBurn(createCards(390));

      expect(await cards.balanceOf(owner.address)).to.be.eq(0);
      
      await expect(cards.getApproved(176)).to.be.revertedWith("Cards: approved query for nonexistent token");
      await expect(cards.getApproved(199)).to.be.revertedWith("Cards: approved query for nonexistent token");
      await expect(cards.getApproved(390)).to.be.revertedWith("Cards: approved query for nonexistent token");
    });
  });

  describe("Transfer From", async() => {
    it("TransferFrom: Fail", async() => {
      await expect(cards.connect(signers[1]).transferFrom(signers[2].address, signers[3].address, 3)).to.be.revertedWith("Cards: operator query for nonexistent token");
    });

    it("Check token's existence", async() => {
      expect(await cards.exists(5)).to.be.eq(false);
      expect(await cards.exists(1)).to.be.eq(false);

      await cards.connect(owner).bundleMint(createCards(5), createURI(5));

      expect(await cards.exists(5)).to.be.eq(true);
      expect(await cards.exists(1)).to.be.eq(true);
      expect(await cards.exists(11)).to.be.eq(false);
    });

    it("Checking owner of each token before and after transfer", async () => {
      await cards.connect(owner).bundleMint([2,7,9,11,17,777,89878,1661616], ["a","b","c","d","e","f","g","h"]);

      expect(await cards.ownerOf(777)).to.be.eq(owner.address);
      expect(await cards.ownerOf(1661616)).to.be.eq(owner.address);

      await cards.connect(owner).transferFrom(owner.address, signers[3].address, 9);
      await cards.connect(owner).transferFrom(owner.address, signers[7].address, 89878);
      await cards.connect(owner).transferFrom(owner.address, signers[9].address, 17);
      
      expect(await cards.ownerOf(9)).to.be.eq(signers[3].address);
      expect(await cards.ownerOf(89878)).to.be.eq(signers[7].address);
      expect(await cards.ownerOf(17)).to.be.eq(signers[9].address);
    });

    it("Checking balance of token", async() => {
      await cards.connect(owner).bundleMint([2,7,9,11,17,777,89878,1661616], ["a","b","c","d","e","f","g","h"]);

      await cards.connect(owner).transferFrom(owner.address, signers[3].address, 9);

      await cards.connect(owner).setApprovalForAll(signers[2].address, true);
      await cards.connect(signers[2]).transferFrom(owner.address, signers[4].address, 1661616);

      expect(await cards.balanceOf(signers[3].address)).to.be.eq(1);
      expect(await cards.balanceOf(signers[4].address)).to.be.eq(1);
      expect(await cards.balanceOf(owner.address)).to.be.eq(6);
    });

    it("Set Approval for token transfer on behalf of owner", async() => {
      expect(await cards.isApprovedForAll(signers[1].address, signers[2].address)).to.eq(false);
      expect(await cards.isApprovedForAll(signers[3].address, signers[4].address)).to.eq(false);
      await cards.connect(signers[1]).setApprovalForAll(signers[2].address, true);
      await cards.connect(signers[3]).setApprovalForAll(signers[4].address, true);
      expect(await cards.isApprovedForAll(signers[1].address, signers[2].address)).to.eq(true);
      expect(await cards.isApprovedForAll(signers[3].address, signers[4].address)).to.eq(true);
    });

    it("Checking operator after giving approval", async() => {
      await cards.connect(owner).bundleMint([2,7,9,11,17,777,89878,1661616], ["a","b","c","d","e","f","g","h"]);
      await cards.connect(owner).approve(signers[5].address, 7);

      expect(await cards.getApproved(7)).to.be.eq(signers[5].address);
    });

    it("Transfer tokens after giving approval", async() => {
      await cards.connect(owner).bundleMint([2,7,9,11,17,777,89878,1661616], ["a","b","c","d","e","f","g","h"]);
      await cards.connect(owner).setApprovalForAll(signers[5].address, true);

      expect(await cards.isApprovedForAll(owner.address, signers[5].address)).to.eq(true);

      await cards.connect(signers[5]).transferFrom(owner.address, signers[6].address, 7);
      await cards.connect(signers[5]).transferFrom(owner.address, signers[9].address, 777);

      expect(await cards.ownerOf(7)).to.be.eq(signers[6].address);
      expect(await cards.ownerOf(777)).to.be.eq(signers[9].address);
    });
  });

  describe("Mint", async() => {
    it("Mint: Fail", async() => {
      await expect(cards.connect(signers[3]).mint(17456, "abc")).to.be.revertedWith("MinterRole: Only minter has the access");
    });

    it("Mint: Fail", async() => {
      await expect(cards.connect(signers[3]).mint(545, "a")).to.be.revertedWith("MinterRole: Only minter has the access");
    });

    it("BalanceOf: Fail", async() => {
      await expect(cards.balanceOf(addressFromNumber(0))).to.be.revertedWith("Cards: balance query for the zero address");
    });

    it("OwnerOf: Fail", async() => {
      await expect(cards.ownerOf(5)).to.be.revertedWith("Cards: Invalid TokenId");
    });

    it("Check balance before and after minting", async() => {
      expect(await cards.balanceOf(signers[1].address)).to.be.eq(0);
      await cards.connect(owner).mint(105, "a");
      expect(await cards.balanceOf(owner.address)).to.be.eq(1);
    });

    it("Check owner of token", async() => {
      await cards.connect(owner).mint(105, "a");
      expect(await cards.ownerOf(105)).to.be.eq(owner.address);
    });

    it("Check token existence", async() => {
      expect(await cards.exists(1)).to.be.eq(false);
      await cards.connect(owner).mint(105, "a");
      expect(await cards.exists(105)).to.be.eq(true);
    });

    it("Set URI after minting", async() => {
      expect(await cards.exists(1)).to.be.eq(false);
      await cards.connect(owner).mint(105, "a");
      expect(await cards.tokenURI(105)).to.be.eq("a");
    });
  });
});
