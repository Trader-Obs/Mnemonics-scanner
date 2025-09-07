const bip39 = require('bip39');
const { ethers } = require('ethers');
const fs = require('fs');
const axios = require('axios');
const notifier = require('node-notifier');

// === SETTINGS ===
const ALCHEMY_API_KEY = 'QtdVr5wgsKSuCmhuj3_LNMMfWa7yilCM'; // 👈 Replace with your actual API key
const provider = new ethers.JsonRpcProvider(`https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_API_KEY}`);
const BATCH_SIZE = 25; // Increased batch size
const RATE_LIMIT_DELAY = 1000; // 1 second between batches
const STOP_AFTER = null; // Set to a number to stop after X scans, or null to run forever

let totalScanned = 0;
let shouldStop = false;
const scannedFile = 'scanned.txt';
const hitsFile = 'hits.txt';

// Exclusion List (exchange wallets)
const excludedAddresses = [
    "0x742d35cc6634c0532925a3b844bc454e4438f44e",  // Bitfinex
    "0x876eabf441b2ee5b5b0554fd502a8e0600950cfa",  // Bitfinex
    "0x4fdd5eb2fb260149a3903859043e962ab89d8ed4",  // Bitfinex
    "0xfbb1b73c4f0bda4f67dca266ce6ef42f520fbb98",  // Bittrex
    "0xdc76cd25977e0a5ae17155770273ad58648900d3",  // Huobi
    "0x2910543af39aba0cd09dbb2d50200b3e800a63d2",  // Kraken
    "0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13",  // Kraken
    "0xe853c56864a2ebe4576a807d26fdc4a0ada51919",  // Kraken
    "0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0",  // Kraken
    "0xfe9e8709d3215310075d67e3ed32a380ccf451c8",  // Binance
    "0x0681d8db095565fe8a346fa0277bffde9c0edbbf",  // Binance
    "0x564286362092D8e7936f0549571a803B203aAceD",  // Binance
    "0xd551234ae421e3bcba99a0da6d736074f22192ff",  // Binance
    "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be",  // Binance
    "0x6cc5f688a315f3dc28a7781717a9a798a59fda7b",  // Okex
    "0xd24400ae8bfebb18ca49be86258a3c749cf46853",  // Gemini
    "0x1c4b70a3968436b9a0a9cf5205c787eb81bb558c",  // Gate.io
    "0x0d0707963952f2fba59dd06f2b425ace40b492fe",  // Gate.io
    "0x5baeac0a0417a05733884852aa068b706967e790",  // Cryptopia
    "0x32be343b94f860124dc4fee278fdcbd38c102d88"   // Poloniex
];

// 🧠 Load previously scanned addresses
const scannedAddresses = new Set(
  fs.existsSync(scannedFile)
    ? fs.readFileSync(scannedFile, 'utf-8').split('\n').filter(Boolean)
    : []
);

// Gracefully exit on Ctrl + C
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping scanner...');
  shouldStop = true;
});

async function checkWalletBalance(address) {
  try {
    const balance = await provider.getBalance(address);
    return parseFloat(ethers.formatEther(balance));
  } catch (error) {
    console.error('⚠️ Balance check failed:', error.message);
    return 0; // return 0 if it fails
  }
}

async function scanOne() {
  const mnemonic = bip39.generateMnemonic(128); // 12-word mnemonic
  const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic);

  if (scannedAddresses.has(wallet.address)) {
    console.log(`⏭️ Already scanned: ${wallet.address}`);
    return;
  }

  const balance = await checkWalletBalance(wallet.address);
  totalScanned++;

  // Save the scanned address
  scannedAddresses.add(wallet.address);
  fs.appendFileSync(scannedFile, wallet.address + '\n');

  if (balance > 0) {
    const found = `
🎯 Wallet with Balance Found!
Mnemonic: ${mnemonic}
Address: ${wallet.address}
Balance: ${balance} ETH
-----------------------------`;

    console.log(found);
    fs.appendFileSync(hitsFile, found + '\n');
  } else {
    console.log(`❌ ${totalScanned}: ${wallet.address} - 0 ETH`);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runScanner() {
  while (!shouldStop && (STOP_AFTER === null || totalScanned < STOP_AFTER)) {
    const tasks = [];

    for (let i = 0; i < BATCH_SIZE; i++) {
      if (shouldStop || (STOP_AFTER !== null && totalScanned >= STOP_AFTER)) break;
      tasks.push(scanOne());
    }

    await Promise.all(tasks);

    if (!shouldStop) {
      await delay(RATE_LIMIT_DELAY);
    }
  }

  console.log(`\n✅ Scanner stopped. Total scanned: ${totalScanned}`);
}

runScanner();