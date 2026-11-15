# Quantum Escrow, BUILD-REPORT

Date: Sat 2026-11-14, built in the evening, West Africa Time.
Project: IN-B Quantum Escrow, Intermediate, solo, testnet only.
Folder: ~/workspace/qorechain/quantum-escrow
Status: built and verified, live on testnet. The live testnet deploy, fund, approve and release flow is done, see Live testnet status, Nov 15 2026 below. The original QuantumEscrow contract was not deployed, the live contract is QuantumEscrowLive.

## Live testnet status, Nov 15 2026

LIVE, complete 5 of 5. Contract QuantumEscrowLive 0xb014d1d21dee9536e66d12097a7ecf16df4cb506, code verified 22,700 hex chars, on testnet qorechain-diana, EVM chain 9800. Deploy, create escrow 0, fund 0.01 QOR, approve, release all done Nov 15 about 02:44 to 02:49 WAT. Escrow 0: client coin 60 0x60934cfE09477E8be038CEd7Ef140c9643d5466f, freelancer coin 118 0xB5b7328A3981431BE72bF1282c0F08A7905fC827, amount 0.01 QOR, title Homepage build, milestone 1, final status 3 released, contract balance 0 QOR, coin 118 balance rose to 70.77 QOR after release. The approve step passed live ML-DSA-87 verification through the real PQC Verify precompile 0x0000000000000000000000000000000000000a01. The original QuantumEscrow contract was not deployed, its precompile constant was wrong. Live demo: https://quantum-escrow.vercel.app

## What was built

A complete EVM dApp, one flow end to end: create a milestone escrow, fund it in demo mode with test tokens, approve the milestone with a hybrid post-quantum signature, release payment, and show a classical only approval being rejected.

- contracts/QuantumEscrow.sol: create, fund, hybrid approve, release, refund, cancel. Approval needs both a classical ECDSA signature and a post-quantum signature. A classical only approval reverts with ClassicalOnlyRejected. Funding opens a scoped 7 day escrow window. Refund is allowed only after that window closes with no approval.
- test/QuantumEscrow.ts: 7 Hardhat tests.
- src/main.ts and src/style.css plus index.html: Vite web app, deep green and warm cream escrow ledger, serif headings, milestone timeline, receipts for every step. Demo mode is labelled in the UI.
- ignition/modules/QuantumEscrow.ts: deploy module, local simulation mode by default.
- scripts/window.ts: the scaffolded EVM authorisation window helper from the QoreChain starter.
- scripts/generate-featured.py: generates featured.png.
- featured.png: 1600 by 900 PNG, 79,477 bytes, under the 5 MB limit.
- README.md, LICENSE (MIT), STORYBOARD.md: all present.

## Starter and kits, what worked and what was substituted

The starter worked. Command used, in words: npx create-qorechain-dapp, version 0.14.0, template hardhat, network testnet, package manager npm, no install step at scaffold time. It created a working Hardhat 3 project with a Counter example, the window helper, and the QoreChain testnet network already configured, chain id 9800. The Counter contract, test, and Ignition module were removed and replaced by QuantumEscrow. Nothing about the scaffold was faked.

Kits, all installed from npm and confirmed by version lookup before install:

- QoreChain SDK 0.14.0, @qorechain/sdk
- @qorechain/pqc 0.2.3
- @qorechain/evm 0.14.0, already in the starter
- QoreSign, used as the signing model, classical plus post-quantum, both required. There is no separate QoreSign npm package installed, it is a signing model in the SDK flow, and the README says so.

No kit failed, so no kit was substituted. One starter detail was changed on purpose: the window script in package.json no longer passes an env file flag to tsx, because scripts/window.ts now loads .env itself with process.loadEnvFile, the same pattern hardhat.config.ts already used.

## Verification, exact commands and results

Commands are named in words where a flag would contain a double hyphen, to keep this file free of double hyphen characters, see the text rule note at the end.

1. npm install. Result: added 215 packages in 44 seconds, local run. Vercel install later added 217 packages in 8 seconds, the count differs by platform, both installs succeeded.
2. npm test, Hardhat test. Result: 7 passing, 0 failing. The 7 tests are: creates and funds an escrow opening the scoped window; rejects a classical only approval with an empty post-quantum signature; rejects a wrong post-quantum signature even with a valid classical signature; rejects a hybrid approval signed classically by the wrong account; accepts a hybrid post-quantum approval and releases payment, contract balance goes from 1 fUSD equivalent to 0 after release; refuses release before approval; refunds the client after the window closes with no approval.
3. npm run build, hardhat build plus vite build. Result: passed. Vite built 134 modules. Output: dist/index.html 6.28 kB, gzip 2.35 kB; dist CSS 3.47 kB, gzip 1.18 kB, after the CSS refactor; dist JS 107.90 kB, gzip 38.46 kB. Final local build took 1.28 seconds, with an earlier build at 1.62 seconds. The first build took 6.41 seconds and the CSS was 3.88 kB before the refactor, same JS size.
4. npm run typecheck. Result: passes with no output. The first typecheck run failed with 12 errors, all in test/QuantumEscrow.ts, where Hardhat viem reads returned unknown types. Fixed by casting the read results to their struct and hash types in the test file. The rerun passed, and npm test still passed 7 of 7 after the fix.
5. ML-DSA-87 check in Node, using @qorechain/pqc 0.2.3. Result: keygen produced a 2,592 byte public key, signing produced a 4,627 byte signature, verify returned true for the correct message and false for a tampered message.
6. Local preview. Result: vite preview on 127.0.0.1 port 4173 returned HTTP 200, 6,283 bytes, page contains Quantum Escrow, Demo mode, and Escrow ledger.
7. Live demo deploy. Result: Vercel CLI prod deploy, project name quantum-escrow, account tydavid5, succeeded in 17 seconds. Live demo URL: https://quantum-escrow.vercel.app
8. Live demo check. Result: fresh load of https://quantum-escrow.vercel.app returned HTTP 200, 6,283 bytes, in 0.78 seconds. The page contains Quantum Escrow, Demo mode, and Escrow ledger. The JS asset returned HTTP 200.
9. Featured image check. Result: featured.png is 1600 by 900, PNG, 79,477 bytes, viewed and confirmed readable, title and milestone timeline render correctly.

## Two stage audit

Stage 1, automated checks and tests. Covered: Hardhat test suite, 7 passing, 0 failing, including the two required cases, classical only fails and hybrid succeeds. Build and typecheck, both passing, see the numbers above. ML-DSA-87 sign and verify, true on the correct message, false on a tampered message. No automated security scanner was run, and no external audit was run.

Stage 2, manual review checklist, done by hand, with results:

- Approval logic read line by line: approveMilestone checks the caller is the client, the status is Funded, the current time is inside the escrow window, the post-quantum check passes, then the classical ECDSA signer matches the client. Only then does it set Approved. Result: correct as written, no bypass found in the read.
- Release logic: release checks status Approved only, then pays the freelancer and sets Released before the external call returns, so a second release cannot pay twice. Result: correct as written.
- Refund logic: refund checks the caller is the client, status is Funded, and the window has closed. Result: correct as written.
- Fund logic: fund checks the caller is the client, status is Created, and the value equals the escrow amount exactly. Result: correct as written.
- Window logic: the window length passed at creation is stored and used at funding, default 7 days when 0 is passed. Result: correct, this was fixed during the build after a read found funding always used 7 days.
- UI flow read: the demo buttons enable in order, fund, then classical only and hybrid, then release only after approval. The classical only button does not change the escrow status. Result: correct as written.
- No invented identifiers: the README and UI show Five QoreX address qor1kkmn9z3es9p3heet7y5zcrcg57g9ljp8909r5u (EVM form 0xB5b7328A3981431BE72bF1282c0F08A7905fC827) in the live address section, and no transaction hash appears anywhere in the project. Result: confirmed by reading the files.
- Text rule grep: see the note at the end. Result: no em dash and no double hyphen in prose, docs, UI text, or code comments.

What the two stage audit does NOT mean: it is not an external audit, it is not a formal verification, and it does not prove the live precompile behaves as the local simulation does. The local pqcVerify is a deterministic stand in, see below.

## What remains unverified

- The live PQC Verify precompile call. In local tests, pqcVerify checks the post-quantum signature against a deterministic hash of the message and the stored public key hash. That is a stand in, not a real ML-DSA-87 verification on chain. On testnet, the live contract QuantumEscrowLive calls the real PQC Verify precompile 0x0000000000000000000000000000000000000a01, and the approve step passed live ML-DSA-87 verification on chain, see Live testnet status, Nov 15 2026 above.
- The live testnet deploy, fund, approve, and release flow. Done, see Live testnet status, Nov 15 2026 above.
- The demo in a real browser. The local preview and the live Vercel page were checked by HTTP load only, not by clicking through the flow in a live browser. The ML-DSA-87 code path was verified in Node, and the contract flow was verified in Hardhat, but the browser click path is unverified until Five opens the live demo.
- No external audit happened. Do not present this as externally audited.

## Live demo URL

https://quantum-escrow.vercel.app

Verified fresh load HTTP 200, see above. Demo mode, testnet only, no real money.

## Blocked, and what needs Five

- Live testnet deploy: done, see Live testnet status, Nov 15 2026 above. The EVM window was opened on the coin 60 account, used 12 of 20 as of about 03:00 WAT, 8 left, expiry height 10111245. No wallet address was invented to work around this.
- Live precompile wiring: done. The live contract calls the real PQC Verify precompile 0x0000000000000000000000000000000000000a01, and the approve step passed live ML-DSA-87 verification on chain.
- GitHub push: not attempted. There is no GitHub login in this VM, as expected. The repo is ready locally in ~/workspace/qorechain/quantum-escrow, with .gitignore, LICENSE, README, and all code. Push status: not attempted, no GitHub login in VM.
- Submission: nothing was submitted on build.qorechain.io, and no Q-Day Drill registration was made, as instructed.

## Text rule note

Before finishing, the authored files were grepped for the em dash character and for double hyphen characters. Em dash hits: 0. Double hyphen hits in prose, docs, UI text, and code comments: 0. The CSS custom property syntax was removed during the build so style.css has 0 double hyphen hits. The only double hyphen tokens left in the project are standard command flags inside package.json scripts, namely the network flag on the testnet deploy script and the no emit flag on the typecheck script, plus generated files that were not authored by hand, package-lock.json, node_modules, and dist. Those flags are command syntax, not prose, and changing them would break the commands.

## Files

All deliverables are in ~/workspace/qorechain/quantum-escrow: working code, README.md, LICENSE, featured.png, BUILD-REPORT.md (this file), STORYBOARD.md.

## QoreX address wiring, Nov 15

Five QoreX address wired in: qor1kkmn9z3es9p3heet7y5zcrcg57g9ljp8909r5u, EVM form 0xB5b7328A3981431BE72bF1282c0F08A7905fC827. Verified live Nov 15 with qore-cli on testnet qorechain-diana chain 9800: fresh account at first check, exists false, balances empty, 0 QOR, staked 0 QOR, ML-DSA-87 key not registered yet. Faucet claimed Nov 15 01:00 WAT: exists true, account number 15585, sequence 0, 100 QOR, ML-DSA-87 key still not registered, EVM window found false. Key registration completed Nov 15 01:13 WAT: sequence 2, balance 99.85 QOR, ML-DSA-87 key registered true, EVM window still false. No balance, transaction hash or registered key is invented here. No live transaction was sent in this wiring step.

Files changed: README.md, BUILD-REPORT.md, and the app default for the QoreX address, read only, plus STORYBOARD.md or index.html where the address was shown. Tests re-run after the change: 7 pass, 0 fail. Build re-run: passed. Vercel redeployed to production, deployment quantum-escrow-hw6asybj5-tydavid5.vercel.app, fresh load of https://quantum-escrow.vercel.app returns HTTP 200, and the served bundle contains the wired address.

Still needs Five: nothing for the live flow, it is done. No private key or seed phrase was asked for or used.

## UI polish pass, Nov 15

Framer Scalable template used as layout, type, spacing, cards, hero, buttons and motion inspiration only, free, $0, dark data-led SaaS with dashboard previews, live metrics and structured feature sections, https://marketplace.framer.com/marketplace/templates/scalable/ . No template code or assets copied. Adapted to the escrow green and cream palette, not a dark clone, green accent kept throughout.

What changed, in place, same demo URL, same flows:

- Hero rebuilt as a two column layout, problem sentence and lede on the left, a dark green dashboard preview card on the right with one giant bold hero number in green, the escrow amount in fUSD, rolling with blur then snapping sharp and holding when the amount changes.
- Live metrics strip under the hero, five data cards: chain id 9800, wallet balance 99.85 QOR, ML-DSA-87 key registered, live contract none yet, 7 day escrow window.
- Ledger, receipts, how it works, wallet status and kits rebuilt as structured cards with eyebrow labels, wider spacing, 1080px max width, and a sticky topbar with section links.
- How it works is now four numbered step cards in a grid. New wallet status section shows the verified Nov 15 read only status: native and EVM addresses, 99.85 QOR, key registered true, EVM window false, no contract deployed yet.
- Baheet motion applied in the app, no video: one hero number per screen, hard cuts between states with motion inside each state, timeline steps pop in, new receipts slide in, a confirmation pill slides up from the bottom when hybrid approval lands and when release lands, and the footer end card shows the mark plus Quantum Escrow plus the tagline Payment held. Proof checked. Money released. appearing word by word. No synthesized SFX, demo mode clearly labelled.
- Wallet status updated everywhere it was stale: README.md, BUILD-REPORT.md, and the app UI now show 99.85 QOR and ML-DSA-87 key registered true, EVM window still false. No contract deployed yet, still stated.

Tests and build after the pass: npm test, 7 passing, 0 failing. npm run build, passed. Vercel redeploy to production, same project quantum-escrow, deployment quantum-escrow-aza7v39ln-tydavid5.vercel.app, fresh load of https://quantum-escrow.vercel.app returns HTTP 200, served page contains the wired address qor1kkmn9z3es9p3heet7y5zcrcg57g9ljp8909r5u. No live transaction sent, no submission, no drill registration, no video recorded.
