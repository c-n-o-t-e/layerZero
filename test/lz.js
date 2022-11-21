const { expect } = require("chai");
const { ethers } = require("hardhat");
let owner;
let lzAppA;
let LzAppB;
let chainIdSrc;
let chainIdDst;
let tokenA;
let tokenB;
let layerZeroEndpointMockSrc;
let layerZeroEndpointMockDst;

describe("bridgeToken", function () {
  beforeEach(async function () {
    const accounts = await ethers.getSigners();
    owner = accounts[0];

    // use this chainId
    chainIdSrc = 1;
    chainIdDst = 2;

    // create a LayerZero Endpoint mock for testing
    const LZEndpointMock = await ethers.getContractFactory("LZEndpointMock");
    layerZeroEndpointMockSrc = await LZEndpointMock.deploy(chainIdSrc);
    layerZeroEndpointMockDst = await LZEndpointMock.deploy(chainIdDst);

    const TokenMock = await ethers.getContractFactory("Token");
    tokenA = await TokenMock.deploy("Demo1", "D1", "100000000000000000000");

    tokenB = await TokenMock.deploy("Demo1", "D1", 0);

    // create two LzApp instances
    const LzApp = await ethers.getContractFactory("LzApp");

    lzAppA = await LzApp.deploy(
      layerZeroEndpointMockSrc.address,
      tokenA.address
    );

    LzAppB = await LzApp.deploy(
      layerZeroEndpointMockDst.address,
      tokenB.address
    );

    await layerZeroEndpointMockSrc.setDestLzEndpoint(
      LzAppB.address,
      layerZeroEndpointMockDst.address
    );
    await layerZeroEndpointMockDst.setDestLzEndpoint(
      lzAppA.address,
      layerZeroEndpointMockSrc.address
    );

    // set each contracts source address so it can send to each other
    await lzAppA.setTrustedRemote(
      chainIdDst,
      ethers.utils.solidityPack(
        ["address", "address"],
        [LzAppB.address, lzAppA.address]
      )
    ); // for A, set B
    await LzAppB.setTrustedRemote(
      chainIdSrc,
      ethers.utils.solidityPack(
        ["address", "address"],
        [lzAppA.address, LzAppB.address]
      )
    ); // for B, set A

    await lzAppA.enable(true);
    await LzAppB.enable(true);
  });

  it("increment the counter of the destination PingPong when paused should revert", async function () {
    await expect(lzAppA.bridgeToken(chainIdDst, 10000)).to.revertedWith(
      "Pausable: paused"
    );
  });

  it("increment the counter of the destination PingPong when unpaused show not revert", async function () {
    await lzAppA.enable(false);
    await lzAppA.setMinDstGasLookup(chainIdDst, 350000);

    const bal = await tokenA.balanceOf(owner.address);
    console.log(bal);

    await lzAppA.bridgeToken(chainIdDst, "10000000000000000000", {
      value: ethers.utils.parseEther("0.5"),
    });

    const balL = await tokenA.balanceOf(owner.address);
    console.log(balL);

    const balLM = await tokenB.balanceOf(owner.address);
    console.log(balLM);
  });
});
