# AI Usage, Quantum Escrow

## Agent used

Muse, called Little 5, Meta's personal AI agent. It worked from the brief and concept pick of the human builder, Five (Taiwo John), in a chat session on Nov 14 to 15, 2026.

## Workflow

1. Five picked the concept, IN-B Quantum Escrow, and the Intermediate Post-Quantum dApp category.
2. Little 5 scaffolded the escrow contract, the demo app, the test suite and the docs, and ran the tests locally.
3. Five did every wallet and chain step himself through MetaMask on the deploy page: contract deploy, create escrow, fund, approve and release.
4. Little 5 verified each step on chain from the public EVM RPC and explorer, then wrote the live status into the README and build report.
5. Five approved the demo video narration and the final submission.

## What the AI generated

- The QuantumEscrowLive Solidity contract, including the call to the PQC Verify precompile 0x0000000000000000000000000000000000000a01 for the ML-DSA-87 check.
- The demo web app (Vite, TypeScript, React).
- The test suite, 7 tests, all passing.
- The deploy helper scripts and the deploy page used to coordinate the live steps.
- The README, BUILD-REPORT and STORYBOARD drafts, and the narration script for the demo video.

## Human contribution

- The concept, the category choice and every design decision.
- All signing: the deploy and the full 5 step escrow flow were sent by Five in MetaMask. Contract 0xb014d1d21dee9536e66d12097a7ecf16df4cb506, escrow 0 funded 0.01 QOR, approved with a real ML-DSA-87 signature verified on chain, released to the freelancer.
- Key management and the faucet claim.
- Approval of the demo video and of the final submission.

## Verification

No contract address, transaction hash or balance in this repo was invented. Every live step was read back from the QoreChain testnet by the agent and is checkable on the explorer. The original QuantumEscrow contract was not deployed, its precompile constant was wrong, and that is recorded in the build report.
