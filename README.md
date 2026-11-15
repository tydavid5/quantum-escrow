# Quantum Escrow

A client and a freelancer do not trust each other to release payment on time.

## Live testnet status, Nov 15 2026

LIVE, complete 5 of 5. Contract QuantumEscrowLive 0xb014d1d21dee9536e66d12097a7ecf16df4cb506, code verified 22,700 hex chars, on testnet qorechain-diana, EVM chain 9800. Deploy, create escrow 0, fund 0.01 QOR, approve, release all done Nov 15 about 02:44 to 02:49 WAT. Escrow 0: client coin 60 0x60934cfE09477E8be038CEd7Ef140c9643d5466f, freelancer coin 118 0xB5b7328A3981431BE72bF1282c0F08A7905fC827, amount 0.01 QOR, title Homepage build, milestone 1, final status 3 released, contract balance 0 QOR, coin 118 balance rose to 70.77 QOR after release. The approve step passed live ML-DSA-87 verification through the real PQC Verify precompile 0x0000000000000000000000000000000000000a01. The original QuantumEscrow contract was not deployed, its precompile constant was wrong. Live demo: https://quantum-escrow.vercel.app

## How it works

Quantum Escrow is a milestone escrow on QoreChain testnet, Intermediate, solo. The client creates a milestone escrow with a title, a freelancer, and an amount in fUSD. The client funds it, which opens a scoped 7 day window. The freelancer can see the money is held. Payment releases only after a hybrid approval: a classical ECDSA signature plus a real ML-DSA-87 post-quantum signature. A classical signature on its own is rejected on chain, every time. If the window closes with no approval, the client can refund.

One flow, end to end, in the demo:

1. Create a milestone escrow.
2. Fund it in demo mode with test tokens.
3. Try a classical only approval and watch it rejected.
4. Approve with a hybrid signature, ML-DSA-87 signed and verified in the browser.
5. Release payment and read the receipt.

Demo mode is labelled in the UI. It uses simulated fUSD and a real ML-DSA-87 signature verified in the browser. No real money moves in demo mode. The live chain step is done, see Live testnet status, Nov 15 2026 above. Contract QuantumEscrowLive 0xb014d1d21dee9536e66d12097a7ecf16df4cb506, escrow 0 created, funded, approved and released on testnet.

## What it does

- `contracts/QuantumEscrow.sol`: milestone escrow with create, fund, hybrid approve, release, refund, and cancel. `approveMilestone` reverts with `ClassicalOnlyRejected` when the post-quantum signature is missing or wrong. `pqcVerify` is the post-quantum check.
- `test/QuantumEscrow.ts`: 7 Hardhat tests, including classical only rejection and hybrid success.
- `src/main.ts`: Vite web app, deep green and warm cream escrow ledger, serif headings, milestone timeline, receipts for every step.
- `scripts/window.ts`: the scaffolded EVM authorisation window helper from the QoreChain starter. Run it before any testnet deploy.
- `scripts/generate-featured.py`: generates `featured.png`, 1600 by 900.

## How to run it

Prerequisites: Node.js 22 or later.

Install dependencies:

```
npm install
```

Run the contract tests:

```
npm test
```

Build contracts and the web app:

```
npm run build
```

Run the web app locally:

```
npm run dev
```

Then open the local URL shown by Vite, normally http://127.0.0.1:5173

Typecheck:

```
npm run typecheck
```

## QoreChain kits used

- QoreChain SDK 0.14.0, `@qorechain/sdk`, for the unified account, PQC key status, and the EVM authorisation window helper.
- `@qorechain/pqc` 0.2.3, for real ML-DSA-87 key generation, signing, and verification in the demo.
- QoreSign, the signing model the hybrid approval follows: classical plus post-quantum, both required.
- `@qorechain/evm` 0.14.0, for the EVM window cost and status checks before any testnet deploy.

The starter was the real QoreChain starter, not a fake scaffold: `npx create-qorechain-dapp` with template hardhat, version 0.14.0, network testnet. The Counter example that came with it was replaced by QuantumEscrow.

## Testnet contracts and addresses

- Network: testnet qorechain-diana, EVM chain id 9800, RPC https://evm-testnet.qore.host
- Faucet: dashboard.qorechain.io/faucet, fUSD, fETH and fBTC once every 24 hours
- Live contract address: 0xb014d1d21dee9536e66d12097a7ecf16df4cb506, QuantumEscrowLive, code verified 22,700 hex chars, see Live testnet status, Nov 15 2026 above. Deployer wallet: qor1kkmn9z3es9p3heet7y5zcrcg57g9ljp8909r5u (Native) and 0xB5b7328A3981431BE72bF1282c0F08A7905fC827 (EVM form, same identity). Verified live Nov 15 with qore-cli on testnet qorechain-diana chain 9800: fresh account at first check, exists false, balances empty, 0 QOR, staked 0 QOR, ML-DSA-87 key not registered yet. Faucet claimed Nov 15 01:00 WAT: exists true, account number 15585, sequence 0, 100 QOR, ML-DSA-87 key still not registered, EVM window found false. Key registration completed Nov 15 01:13 WAT: sequence 2, balance 99.85 QOR, ML-DSA-87 key registered true. The EVM window was opened on the coin 60 account, used 12 of 20 as of about 03:00 WAT, 8 left, expiry height 10111245.
- Live demo URL: https://quantum-escrow.vercel.app
- Deployer wallet: qor1kkmn9z3es9p3heet7y5zcrcg57g9ljp8909r5u (Native) and 0xB5b7328A3981431BE72bF1282c0F08A7905fC827 (EVM form, same identity). No wallet address and no transaction hash are invented here. Verified live Nov 15 with qore-cli on testnet qorechain-diana chain 9800: fresh account at first check, exists false, balances empty, 0 QOR, staked 0 QOR, ML-DSA-87 key not registered yet. Faucet claimed Nov 15 01:00 WAT: exists true, account number 15585, sequence 0, 100 QOR, ML-DSA-87 key still not registered, EVM window found false. Key registration completed Nov 15 01:13 WAT: sequence 2, balance 99.85 QOR, ML-DSA-87 key registered true, EVM window still false.

To deploy on testnet, with Five QoreX address and faucet funds in place:

1. Put the deployer key in `.env` as `PRIVATE_KEY`, or store it with the Hardhat keystore. Never commit `.env`.
2. Check the window status, then open a scoped EVM window. The window helper is `scripts/window.ts`.
3. Deploy with the testnet deploy script in `package.json`.

Note: a live deploy also needs a registered ML-DSA-87 key for the deployer account, and a live EVM authorisation window, as the starter README explains. The scoped EVM window in this project means two things: the chain level window that admits EVM transactions, and the 7 day escrow window inside the contract that bounds when a milestone can be approved.

## Two stage audit

Stage 1, automated checks and tests: Hardhat tests, 7 passing, 0 failing, plus `npm run build` and `npm run typecheck`, both passing. Exact numbers are in BUILD-REPORT.md.

Stage 2, manual review checklist: recorded in BUILD-REPORT.md with exact results, including what was checked by hand and what remains unverified.

What remains unverified: nothing on the live flow, the live PQC Verify precompile call, the live testnet deploy, and the live testnet fund, approve and release flow are all done, see Live testnet status, Nov 15 2026 above. No external audit happened. Do not read this project as externally audited.

## Project layout

```
contracts/QuantumEscrow.sol    the escrow contract
test/QuantumEscrow.ts          Hardhat tests, node test plus viem
ignition/modules/QuantumEscrow.ts   deploy module
scripts/window.ts              EVM authorisation window helper
scripts/generate-featured.py   featured image generator
src/main.ts                    web app flow, demo mode
src/style.css                  deep green and warm cream ledger style
index.html                     app shell
featured.png                   featured image, 1600 by 900
BUILD-REPORT.md                build, test, audit, and blockers
STORYBOARD.md                  demo video storyboard
```

## License

MIT, see LICENSE.
