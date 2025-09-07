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

