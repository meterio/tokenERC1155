import "hardhat-typechain";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@openzeppelin/hardhat-upgrades";
import { task } from "hardhat/config";
import { ContractTransaction, BytesLike, utils, Signer } from "ethers";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { compileSetting, allowVerifyChain } from "./scripts/deployTool";
import { RPCS } from "./scripts/network";
const SHA256 = require('crypto-js/sha256')



import {
  deployContract,
  BN,
  getContract,
  getContractJson,
  MINTER_ROLE,
} from "./scripts/helper";
import { MerkleTree } from 'merkletreejs';


import { TokenERC1155 } from './typechain'


const dotenv = require("dotenv");
dotenv.config();
// import Colors = require("colors.ts");
// Colors.enable();

task("accounts", "Prints the list of accounts", async (taskArgs, bre) => {
  const accounts = await bre.ethers.getSigners();

  for (const account of accounts) {
    let address = await account.getAddress();
    console.log(
      address,
      (await bre.ethers.provider.getBalance(address)).toString()
    );
  }
});

// npx hardhat deploy --name ttt --symbol ttt --uri "https://www.google.com/" --network metermain
task("deploy", "deploy ERC1155 contract")
  .addParam("name", "Token name")
  .addParam("symbol", "Token symbol")
  .addParam("uri", "Token base uri")
  .setAction(
    async ({ name, symbol, uri }, { ethers, run, network }) => {
      await run("compile");
      const signers = await ethers.getSigners();
      const token = await deployContract(
        ethers,
        "TokenERC1155",
        network.name,
        signers[0],
        [name, symbol, uri]
      ) as TokenERC1155;
    }
  );

// npx hardhat mint --to 0x319a0cfD7595b0085fF6003643C7eD685269F851 --id 1 --amount 1000 --network metermain
task("mint", "mint token")
  .addParam("to", "mint to address")
  .addParam("id", "token id")
  .addParam("amount", "mint amount")
  .setAction(
    async ({ to, id, amount }, { ethers, run, network }) => {

      await run("compile");
      const signers = await ethers.getSigners();

      let token = (await ethers.getContractAt(
        "TokenERC1155",
        getContract(network.name, "TokenERC1155"),
        signers[0]
      )) as TokenERC1155;

      await token["mint(address,uint256,uint256)"](to, id, amount,);
    }
  );

// npx hardhat grant --account 0x319a0cfD7595b0085fF6003643C7eD685269F851 --network metermain
task("grant", "grant minter Role")
  .addParam("account", "account")
  .setAction(
    async ({ account }, { ethers, run, network }) => {

      await run("compile");
      const signers = await ethers.getSigners();

      let token = (await ethers.getContractAt(
        "TokenERC1155",
        getContract(network.name, "TokenERC1155"),
        signers[0]
      )) as TokenERC1155;

      await token.grantRole(MINTER_ROLE, account);
    }
  );
// npx hardhat revoke --account 0x319a0cfD7595b0085fF6003643C7eD685269F851 --network metermain
task("revoke", "revoke minter Role")
  .addParam("account", "account")
  .setAction(
    async ({ account }, { ethers, run, network }) => {

      await run("compile");
      const signers = await ethers.getSigners();

      let token = (await ethers.getContractAt(
        "TokenERC1155",
        getContract(network.name, "TokenERC1155"),
        signers[0]
      )) as TokenERC1155;

      await token.revokeRole(MINTER_ROLE, account);
    }
  );
// npx hardhat setroot --json ./leaves.json
task("setroot", "set root")
  .addParam("json", "json file")
  .setAction(
    async ({ json }, { ethers, run, network }) => {

      await run("compile");
      const signers = await ethers.getSigners();

      let jsonArr = JSON.parse(readFileSync(json).toString());
      let hashArr = [];
      for (let i = 0; i < jsonArr.length; i++) {
        hashArr[i] = utils.defaultAbiCoder.encode(["uint256", "uint256", "address"], [BN(jsonArr[i].id), BN(jsonArr[i].amount), jsonArr[i].address]);
      }
      const leaves = hashArr.map(x => ethers.utils.keccak256(x));
      const tree = new MerkleTree(leaves, ethers.utils.keccak256, { sort: true });
      const root = "0x" + tree.getRoot().toString('hex')

      let token = (await ethers.getContractAt(
        "TokenERC1155",
        getContract(network.name, "TokenERC1155"),
        signers[0]
      )) as TokenERC1155;

      await token.setRoot(root);

      console.log('root:', root, await token.roots(root))
    }
  );
// npx hardhat getproof --json ./leaves.json --address 0x270E63f5EC6e6B5E3003ba77392c17f60C9f4E75
task("getproof", "get proof")
  .addParam("json", "json file")
  .addParam("address", "account address")
  .setAction(
    async ({ json, address }, { ethers, run, network }) => {

      await run("compile");
      const signers = await ethers.getSigners();

      let jsonArr = JSON.parse(readFileSync(json).toString());
      let hashArr = [];
      let index: number;
      for (let i = 0; i < jsonArr.length; i++) {
        if (jsonArr[i].address == address) {
          index = i;
        }
        hashArr[i] = utils.defaultAbiCoder.encode(["uint256", "uint256", "address"], [BN(jsonArr[i].id), BN(jsonArr[i].amount), jsonArr[i].address]);
      }
      const leaves = hashArr.map(x => ethers.utils.keccak256(x));
      const tree = new MerkleTree(leaves, ethers.utils.keccak256, { sort: true });
      const root = "0x" + tree.getRoot().toString('hex')

      let token = (await ethers.getContractAt(
        "TokenERC1155",
        getContract(network.name, "TokenERC1155"),
        signers[0]
      )) as TokenERC1155;

      let result = await token.roots(root);
      if (result == true) {
        console.log(root)
        const leaf = ethers.utils.keccak256(hashArr[index]);
        const proof = tree.getHexProof(leaf);
        console.log("verify:", tree.verify(proof, leaf, root))
        console.log("proof", proof)
        console.log("root", root)
      }
    }
  );
// npx hardhat proofmint --proof '["0xfa35fdb7f6ab88c2ec641536e3a102daafba42a39b98c6f24f2243ac0db6ef4a","0x7df1e83dafed14f473b02408b84dc52d9803dcb1bab2276c5c6194f1df774099"]' --root 0xc546592e4b435361a9fda2f965438a820d231ddeb8ba0f6c9c6904f07f94c21a --id 1 --amount 100
task("proofmint", "mint token with proof")
  .addParam("proof", "proof")
  .addParam("root", "root")
  .addParam("id", "token Id")
  .addParam("amount", "amount")
  .setAction(
    async ({ proof, root, id, amount }, { ethers, run, network }) => {

      await run("compile");
      const signers = await ethers.getSigners();

      let token = (await ethers.getContractAt(
        "TokenERC1155",
        getContract(network.name, "TokenERC1155"),
        signers[0]
      )) as TokenERC1155;

      console.log("JSON.parse(proof)", JSON.parse(proof))
      let receipt = await token["mint(bytes32[],bytes32,uint256,uint256)"](
        JSON.parse(proof), root, id, amount
      )
      console.log("receipt", receipt)
      console.log(await receipt.wait())
    }
  );
// npx hardhat veri
task("veri", "verify contracts").setAction(
  async ({ }, { ethers, run, network }) => {
    if (allowVerifyChain.indexOf(network.name) > -1) {
      await run(
        "verify:verify",
        getContractJson(network.name, "TokenERC1155")
      );
    }
  }
);

export default {
  networks: RPCS,
  etherscan: {
    apiKey: process.env.ETHERSCAN_APIKEY,
  },
  solidity: {
    compilers: [compileSetting("0.8.4", 200)],
  },
  mocha: {
    timeout: 200000,
  },
};
