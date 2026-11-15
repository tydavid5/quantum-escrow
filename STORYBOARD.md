# Quantum Escrow, demo video storyboard

Baheet beats: five beats, about 3 seconds each, one claim per beat, problem first. True screencast only, no faked results. Demo mode is labelled on screen in every beat. No video was recorded or uploaded for this storyboard.

## Beat 1, 0 to 3 seconds, the problem

Claim: A client and a freelancer do not trust each other to release payment on time.

Visual: the hero line on screen, deep green and warm cream ledger page, no code, no fake balance. Voice: read the problem sentence once, plainly.

## Beat 2, 3 to 6 seconds, the hold

Claim: The money is held in escrow first, so both sides can see it.

Visual: screencast of creating the milestone, then funding it in demo mode. The demo balance drops from 1,000 fUSD to 750 fUSD, the escrow shows 250 fUSD held, the timeline marks Funded. The demo mode pill stays visible.

## Beat 3, 6 to 9 seconds, the rejection

Claim: A classical signature on its own is rejected.

Visual: screencast of clicking Try classical only approval. The receipt appears in red: Classical only approval REJECTED, post-quantum signature missing, escrow stays Funded, nothing released.

## Beat 4, 9 to 12 seconds, the hybrid approval

Claim: A real ML-DSA-87 signature plus the classical signature approves it.

Visual: screencast of clicking Approve with hybrid signature. The receipt shows the ML-DSA-87 public key and signature, and ML-DSA-87 verify in browser: true. The timeline marks Approved, hybrid.

## Beat 5, 12 to 15 seconds, the release

Claim: Payment releases, with a receipt, and the milestone closes.

Visual: screencast of clicking Release payment. The freelancer received total rises to 250 fUSD, the timeline marks Released, the final receipt reads Payment released. End card: Quantum Escrow, QoreChain testnet, demo mode, no real money, live contract pending faucet funds and ML-DSA-87 key registration for Five QoreX address qor1kkmn9z3es9p3heet7y5zcrcg57g9ljp8909r5u.

## Notes for the recorder

- Record the real local app or the live Vercel demo, in one take per beat if needed, hard cuts between beats.
- Do not type a wallet address or a transaction hash that does not exist. The live address line now shows Five QoreX address qor1kkmn9z3es9p3heet7y5zcrcg57g9ljp8909r5u. A real deploy still waits for faucet funds and ML-DSA-87 key registration.
- Keep the demo mode pill in frame. Do not crop it out.
- Sound: real recorded voice only, no synthesized sound effects. One claim per beat, no extra claims.
