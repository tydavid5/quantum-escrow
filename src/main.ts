import { mldsa87 } from "@qorechain/pqc";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

type Step = "created" | "funded" | "approved" | "released";

const form = document.getElementById("createForm") as HTMLFormElement;
const titleInput = document.getElementById("title") as HTMLInputElement;
const freelancerInput = document.getElementById("freelancer") as HTMLInputElement;
const amountInput = document.getElementById("amount") as HTMLInputElement;
const escrowCard = document.getElementById("escrowCard") as HTMLElement;
const escrowTitle = document.getElementById("escrowTitle") as HTMLElement;
const escrowMeta = document.getElementById("escrowMeta") as HTMLElement;
const timeline = document.getElementById("timeline") as HTMLOListElement;
const receiptsBox = document.getElementById("receipts") as HTMLElement;
const balanceLine = document.getElementById("balanceLine") as HTMLElement;
const heroAmount = document.getElementById("heroAmount") as HTMLElement;
const heroBalance = document.getElementById("heroBalance") as HTMLElement;
const heroHeld = document.getElementById("heroHeld") as HTMLElement;
const heroReceived = document.getElementById("heroReceived") as HTMLElement;
const fundBtn = document.getElementById("fundBtn") as HTMLButtonElement;
const classicalBtn = document.getElementById("classicalBtn") as HTMLButtonElement;
const hybridBtn = document.getElementById("hybridBtn") as HTMLButtonElement;
const releaseBtn = document.getElementById("releaseBtn") as HTMLButtonElement;
const resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;

let step: Step = "created";
let amount = 250;
let title = "Homepage build, milestone 1";
let freelancer = "Ada, freelance designer";
let demoBalance = 1000;
let freelancerReceived = 0;
let classicalRejected = false;

function hex(bytes: Uint8Array, length = 24): string {
  const out = Array.from(bytes.slice(0, length))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `0x${out}...`;
}

function shortKey(bytes: Uint8Array): string {
  return hex(bytes, 16);
}

function addReceipt(text: string, kind: "good" | "bad" | "plain" = "plain"): void {
  const empty = receiptsBox.querySelector(".empty");
  if (empty) empty.remove();
  const div = document.createElement("div");
  div.className = `receipt ${kind}`;
  div.textContent = text;
  receiptsBox.prepend(div);
}

function markStep(name: Step, rejected = false): void {
  const item = timeline.querySelector(`[data-step="${name}"]`) as HTMLElement | null;
  if (!item) return;
  item.classList.add("done");
  if (rejected) item.classList.add("rejected");
}

function setHeroAmount(value: number): void {
  heroAmount.textContent = String(value);
  heroAmount.classList.remove("roll");
  void heroAmount.offsetWidth;
  heroAmount.classList.add("roll");
}

function showPill(text: string): void {
  const old = document.querySelector(".confirm-pill");
  if (old) old.remove();
  const pill = document.createElement("div");
  pill.className = "confirm-pill";
  pill.textContent = text;
  document.body.appendChild(pill);
  window.setTimeout(() => pill.remove(), 4500);
}

function refreshBalance(): void {
  const held = step === "funded" || step === "approved" ? amount : 0;
  balanceLine.textContent = `Demo fUSD balance: ${demoBalance} fUSD held by you, the client. Freelancer received: ${freelancerReceived} fUSD. Escrow held: ${held} fUSD.`;
  heroBalance.textContent = `${demoBalance} fUSD`;
  heroHeld.textContent = `${held} fUSD`;
  heroReceived.textContent = `${freelancerReceived} fUSD`;
}

function approvalMessage(): Uint8Array {
  const text = `APPROVE escrow 0, ${title}, ${amount} fUSD, freelancer ${freelancer}, chain qorechain-diana 9800`;
  return new TextEncoder().encode(text);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  title = titleInput.value.trim() || title;
  freelancer = freelancerInput.value.trim() || freelancer;
  amount = Math.max(1, Number(amountInput.value) || 250);
  step = "created";
  classicalRejected = false;
  setHeroAmount(amount);
  escrowCard.classList.remove("hidden");
  escrowTitle.textContent = `Milestone 0: ${title}`;
  escrowMeta.textContent = `Client: you (demo) | Freelancer: ${freelancer} | Amount: ${amount} fUSD | Window: 7 days from funding | Status: Created`;
  timeline.querySelectorAll("li").forEach((li) => li.classList.remove("done", "rejected"));
  markStep("created");
  fundBtn.disabled = false;
  classicalBtn.disabled = true;
  hybridBtn.disabled = true;
  releaseBtn.disabled = false;
  releaseBtn.disabled = true;
  refreshBalance();
  addReceipt(
    `Receipt 1, Created\nMilestone 0: ${title}\nFreelancer: ${freelancer}\nAmount: ${amount} fUSD\nStatus: Created, not funded yet.\nDemo mode: no chain transaction was sent.`,
    "plain",
  );
});

fundBtn.addEventListener("click", () => {
  if (step !== "created") return;
  if (amount > demoBalance) {
    addReceipt(`Funding failed in demo mode: amount ${amount} fUSD is more than the demo balance ${demoBalance} fUSD.`, "bad");
    return;
  }
  demoBalance -= amount;
  step = "funded";
  markStep("funded");
  escrowMeta.textContent = `Client: you (demo) | Freelancer: ${freelancer} | Amount: ${amount} fUSD | Window: 7 days from funding | Status: Funded, window open`;
  fundBtn.disabled = true;
  classicalBtn.disabled = false;
  hybridBtn.disabled = false;
  refreshBalance();
  addReceipt(
    `Receipt 2, Funded in demo mode\n${amount} fUSD moved from your demo balance into escrow.\nWindow: 7 days. If it closes with no approval, the client can refund.\nDemo mode: simulated fUSD, no chain transaction was sent.`,
    "good",
  );
});

classicalBtn.addEventListener("click", async () => {
  if (step !== "funded") return;
  const message = approvalMessage();
  const account = privateKeyToAccount(generatePrivateKey());
  const classical = await account.signMessage({ message: { raw: message } });
  classicalRejected = true;
  const item = timeline.querySelector('[data-step="approved"]') as HTMLElement | null;
  if (item) item.classList.add("rejected");
  addReceipt(
    `Receipt 3, Classical only approval REJECTED\nClassical ECDSA signature: ${classical.slice(0, 24)}...\nPost-quantum signature: missing.\nResult: rejected. Release needs a hybrid approval, classical plus ML-DSA-87.\nThe escrow stays Funded. Nothing was released.`,
    "bad",
  );
});

hybridBtn.addEventListener("click", async () => {
  if (step !== "funded") return;
  hybridBtn.disabled = true;
  hybridBtn.textContent = "Signing with ML-DSA-87...";
  try {
    const message = approvalMessage();
    const account = privateKeyToAccount(generatePrivateKey());
    const classical = await account.signMessage({ message: { raw: message } });
    const keypair = mldsa87.keygen();
    const pqSignature = mldsa87.sign(keypair.secretKey, message);
    const pqOk = mldsa87.verify(keypair.publicKey, message, pqSignature);
    if (!pqOk) {
      addReceipt("Hybrid approval failed: the ML-DSA-87 signature did not verify in the browser. Nothing was approved.", "bad");
      hybridBtn.disabled = false;
      hybridBtn.textContent = "Approve with hybrid signature";
      return;
    }
    step = "approved";
    markStep("approved");
    classicalBtn.disabled = true;
    releaseBtn.disabled = false;
    showPill("Hybrid approval accepted, payment can now release.");
    escrowMeta.textContent = `Client: you (demo) | Freelancer: ${freelancer} | Amount: ${amount} fUSD | Window: 7 days from funding | Status: Approved, hybrid`;
    refreshBalance();
    addReceipt(
      `Receipt 4, Hybrid approval ACCEPTED\nClassical ECDSA signature: ${classical.slice(0, 24)}...\nML-DSA-87 public key: ${shortKey(keypair.publicKey)}\nML-DSA-87 signature: ${hex(pqSignature, 24)}\nML-DSA-87 verify in browser: true.\nClassical only was ${classicalRejected ? "already rejected above" : "not tried in this run"}.\nStatus: Approved. Payment can now release.`,
      "good",
    );
  } finally {
    hybridBtn.textContent = "Approve with hybrid signature";
  }
});

releaseBtn.addEventListener("click", () => {
  if (step !== "approved") return;
  step = "released";
  markStep("released");
  freelancerReceived += amount;
  releaseBtn.disabled = true;
  showPill("Payment released to the freelancer.");
  escrowMeta.textContent = `Client: you (demo) | Freelancer: ${freelancer} | Amount: ${amount} fUSD | Window: 7 days from funding | Status: Released`;
  refreshBalance();
  addReceipt(
    `Receipt 5, Payment released\n${amount} fUSD sent to ${freelancer}.\nFreelancer received so far: ${freelancerReceived} fUSD.\nStatus: Released. The milestone is closed.\nDemo mode: simulated fUSD, no chain transaction was sent in this local run. Live testnet flow is complete: escrow 0 released Nov 15 about 02:44 to 02:49 WAT, contract QuantumEscrowLive 0xb014d1d21dee9536e66d12097a7ecf16df4cb506, fund 0.01 QOR, approve with live ML-DSA-87 verification via the real PQC Verify precompile 0x0000000000000000000000000000000000000a01, final status released, contract balance 0 QOR.`,
    "good",
  );
});

resetBtn.addEventListener("click", () => {
  step = "created";
  demoBalance = 1000;
  freelancerReceived = 0;
  classicalRejected = false;
  escrowCard.classList.add("hidden");
  receiptsBox.innerHTML = '<p class="empty">No receipts yet. Create a milestone escrow to begin.</p>';
  refreshBalance();
});

refreshBalance();
setHeroAmount(amount);
