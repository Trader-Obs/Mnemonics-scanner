# Description
Ethereum Mnemonics Scanner – generates random BIP39 seed phrases, derives wallets, and checks balances using Alchemy RPC. Includes batching, duplicate filtering, and hit notifications.

# Mnemonics Scanner
An educational Ethereum wallet scanner that generates random **BIP39 mnemonic seed phrases**, derives wallets, and checks their balances.  
Built with **Node.js** and powered by the **Alchemy Ethereum RPC API**.

---

## 🚀 Features
- Generates random 12-word BIP39 mnemonics.
- Derives Ethereum wallets from mnemonics.
- Checks balances via **Alchemy RPC**.
- Batch scanning support (default: 25 wallets per cycle).
- Skips duplicates to save resources.
- Sends local **desktop notifications** for hits.
- Logs successful wallets into a JSON file.

---

## 📦 Installation

1. Clone the repository:
   ```bash
    git clone https://github.com/yourusername/Mnemonics-scanner.git
   cd Mnemonics-scanner

---

2. Install dependencies:

npm install


3. Edit the script and set your Alchemy API key:

const ALCHEMY_API_KEY = "your-api-key-here";

---

▶️ Usage

Run the scanner with:

node index.js

---

The script will:

Generate random mnemonics.

Derive Ethereum accounts.

Query balances from Alchemy.

Notify and save wallets with non-zero balances.

---

📂 Example Output

hits.json

[
  {
    "address": "0x123abc...",
    "balance": "0.845 ETH",
    "mnemonic": "sample seed phrase ..."
  }
]

---

⚠️ Disclaimer

This project is for educational and research purposes only.
Do not use it for malicious, illegal, or unauthorized activities.
You are solely responsible for how you use this tool.
