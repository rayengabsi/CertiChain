const { HDNodeWallet } = require("ethers");

const wallet = HDNodeWallet.fromPhrase(
  "test test test test test test test test test test test junk",
  undefined,
  "m/44'/60'/0'/0/2"
);

console.log("Address:", wallet.address);
console.log("Private key:", wallet.privateKey);