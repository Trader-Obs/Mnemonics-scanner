const bip39 = require('bip39');
const { ethers } = require('ethers');
const fs = require('fs');

// === SETTINGS ===
const ETHERSCAN_API_KEY = '7SJMK79BVVCSJWJVRQZUTT7A8I9CA1QJK3'; // Replace with your actual API key
const provider = new ethers.EtherscanProvider('mainnet', ETHERSCAN_API_KEY);
const BATCH_SIZE = 4;
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

// Common wordlist that will be rotated and changed dynamically
let wordlist = [
  "apple", "banana", "cherry", "date", "elderberry", "fig", "grape", "honeydew", "kiwi", "lemon", "mango", "nectarine"
];

// Function to change wordlist after every batch
function updateWordlist() {
  // Shuffle the wordlist or rotate words for new combinations
  wordlist = wordlist.sort(() => Math.random() - 0.5);
}

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

  // Generate seed from mnemonic
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  
  // Create wallet from the seed
  const wallet = ethers.HDNodeWallet.fromSeed(seed);

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
    const found = `🎯 Wallet with Balance Found! 
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
  let noHitsCount = 0; // Counter to track if no hits are found

  while (!shouldStop && (STOP_AFTER === null || totalScanned < STOP_AFTER)) {
    const tasks = [];

    for (let i = 0; i < BATCH_SIZE; i++) {
      if (shouldStop || (STOP_AFTER !== null && totalScanned >= STOP_AFTER)) break;
      tasks.push(scanOne());
    }

    await Promise.all(tasks);

    // If no hits after the batch, update the wordlist (rotate or shuffle)
    if (noHitsCount >= 3) { // If 3 consecutive batches have no hits, change the wordlist
      console.log("\n🔄 No hits found in the last few batches. Updating wordlist...");
      updateWordlist();
      noHitsCount = 0; // Reset the counter
    }

    // Track if no hits were found in the last batch
    if (tasks.every(task => task === 0)) {
      noHitsCount++;
    }

    if (!shouldStop) {
      await delay(RATE_LIMIT_DELAY);
    }
  }

  console.log(`\n✅ Scanner stopped. Total scanned: ${totalScanned}`);
}

runScanner();
