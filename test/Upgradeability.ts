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
  chai.use(require("chai-bignumber")(BigNumber));

  describe("Marketplace", () => {
    let cards: Cards;
    let impl0: Cards;
    let impl1: Cards;
    let proxy: OwnedUpgradeabilityProxy;
    let owner: SignerWithAddress;
    let signers: SignerWithAddress[];

    beforeEach(async () => {
      signers = await ethers.getSigners();
      owner = await signers[0];
      impl0 = await new Cards__factory(owner).deploy();
      impl1 = await new Cards__factory(owner).deploy();
      proxy = await new OwnedUpgradeabilityProxy__factory(owner).deploy();
      cards = await new Cards__factory(owner).attach(proxy.address);

      const initializeData = impl0.interface.encodeFunctionData('initialize', [
        owner.address, "Centurion", "CTR"
      ]);

      await proxy.upgradeToAndCall(impl0.address, initializeData);
    });

    describe("Upgradeability", async () => {
      it("Set contract deployer as proxy owner", async () => {
        expect(await proxy.proxyOwner()).to.be.eq(owner.address);
      });

      it("Existing owner can transfer ownership", async () => {
        await proxy.transferProxyOwnership(signers[1].address);

        expect(await proxy.proxyOwner()).to.be.eq(signers[1].address);

        await proxy.connect(signers[1]).transferProxyOwnership(signers[2].address);

        expect(await proxy.proxyOwner()).to.be.eq(signers[2].address);
      });

      it("Set Implementation address", async () => {
        expect(await proxy.implementation()).to.be.eq(impl0.address);
      });

      it("Proxy owner can change implementation address", async () => {
        expect(await proxy.implementation()).to.be.eq(impl0.address);

        await proxy.upgradeTo(impl1.address);

        expect(await proxy.implementation()).to.be.eq(impl1.address);

        await proxy.transferProxyOwnership(signers[1].address);
        await proxy.connect(signers[1]).upgradeTo(impl0.address);

        expect(await proxy.implementation()).to.be.eq(impl0.address);
      });

      it("Owner can update maintenance status", async () => {
        expect(await proxy.maintenance()).to.be.eq(false);

        await proxy.setMaintenance(true);

        expect(await proxy.maintenance()).to.be.eq(true);

        await proxy.transferProxyOwnership(signers[1].address);
        await proxy.connect(signers[1]).setMaintenance(false);

        expect(await proxy.maintenance()).to.be.eq(false);
      });
    });
  });
