// run in terminal to generate required keypair.json file for use by server

const fs = require('fs');
const anchor = require("@project-serum/anchor");

const account = anchor.web3.Keypair.generate();

fs.writeFileSync('./keypair.json', JSON.stringify(account));