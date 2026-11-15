import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { encodePacked, hexToBytes, keccak256, parseEther } from "viem";

const AMOUNT = parseEther("1");
const PQ_KEY_HASH = keccak256(encodePacked(["string"], ["demo-ml-dsa-87-public-key"]));

async function setup() {
  const { viem } = await network.create();
  const [client, freelancer] = await viem.getWalletClients();
  const escrow = await viem.deployContract("QuantumEscrow", [false]);
  return { viem, client, freelancer, escrow };
}

async function fundedEscrow(ctx: Awaited<ReturnType<typeof setup>>) {
  const { escrow, client, freelancer } = ctx;
  const hash = await escrow.write.createEscrow(
    [freelancer.account.address, "Homepage build, milestone 1", AMOUNT, PQ_KEY_HASH, 7n * 24n * 60n * 60n],
    { account: client.account },
  );
  void hash;
  const id = 0n;
  await escrow.write.fund([id], { account: client.account, value: AMOUNT });
  return id;
}

function pqSignature(messageHash: `0x${string}`) {
  return keccak256(encodePacked(["bytes32", "bytes32"], [messageHash, PQ_KEY_HASH]));
}

describe("QuantumEscrow", async () => {
  it("creates an escrow and funds it, opening the scoped window", async () => {
    const ctx = await setup();
    const { escrow, client, freelancer } = ctx;
    await escrow.write.createEscrow(
      [freelancer.account.address, "Homepage build, milestone 1", AMOUNT, PQ_KEY_HASH, 7n * 24n * 60n * 60n],
      { account: client.account },
    );
    await escrow.write.fund([0n], { account: client.account, value: AMOUNT });
    const e = (await escrow.read.getEscrow([0n])) as { status: number; amount: bigint; windowStart: bigint; windowEnd: bigint };
    assert.equal(e.status, 1);
    assert.equal(e.amount, AMOUNT);
    assert.ok(e.windowEnd > e.windowStart);
  });

  it("rejects a classical only approval, with an empty post-quantum signature", async () => {
    const ctx = await setup();
    const { escrow, client } = ctx;
    const id = await fundedEscrow(ctx);
    const messageHash = (await escrow.read.approvalMessage([id])) as `0x${string}`;
    const classical = await client.signMessage({
      account: client.account,
      message: { raw: hexToBytes(messageHash) },
    });
    await viem_assert_reverts(ctx, () =>
      escrow.write.approveMilestone([id, "0x0000000000000000000000000000000000000000000000000000000000000000", classical], {
        account: client.account,
      }),
    );
  });

  it("rejects a wrong post-quantum signature even with a valid classical signature", async () => {
    const ctx = await setup();
    const { escrow, client } = ctx;
    const id = await fundedEscrow(ctx);
    const messageHash = (await escrow.read.approvalMessage([id])) as `0x${string}`;
    const classical = await client.signMessage({
      account: client.account,
      message: { raw: hexToBytes(messageHash) },
    });
    const wrongPq = keccak256(encodePacked(["string"], ["wrong-pq-signature"]));
    await viem_assert_reverts(ctx, () =>
      escrow.write.approveMilestone([id, wrongPq, classical], { account: client.account }),
    );
  });

  it("rejects a hybrid approval signed classically by the wrong account", async () => {
    const ctx = await setup();
    const { escrow, client, freelancer } = ctx;
    const id = await fundedEscrow(ctx);
    const messageHash = (await escrow.read.approvalMessage([id])) as `0x${string}`;
    const pq = pqSignature(messageHash);
    const wrongClassical = await freelancer.signMessage({
      account: freelancer.account,
      message: { raw: hexToBytes(messageHash) },
    });
    await viem_assert_reverts(ctx, () =>
      escrow.write.approveMilestone([id, pq, wrongClassical], { account: client.account }),
    );
  });

  it("accepts a hybrid post-quantum approval and releases payment to the freelancer", async () => {
    const ctx = await setup();
    const { viem, escrow, client, freelancer } = ctx;
    const id = await fundedEscrow(ctx);
    const messageHash = (await escrow.read.approvalMessage([id])) as `0x${string}`;
    const pq = pqSignature(messageHash);
    const classical = await client.signMessage({
      account: client.account,
      message: { raw: hexToBytes(messageHash) },
    });
    assert.equal(await escrow.read.pqcVerify([messageHash, pq, PQ_KEY_HASH]), true);
    await escrow.write.approveMilestone([id, pq, classical], { account: client.account });
    const publicClient = await viem.getPublicClient();
    const contractAddress = escrow.address;
    const before = await publicClient.getBalance({ address: contractAddress });
    assert.equal(before, AMOUNT);
    await escrow.write.release([id], { account: client.account });
    const after = await publicClient.getBalance({ address: contractAddress });
    assert.equal(after, 0n);
    const e = (await escrow.read.getEscrow([id])) as { status: number };
    assert.equal(e.status, 3);
  });

  it("refuses release before approval", async () => {
    const ctx = await setup();
    const { escrow, client } = ctx;
    const id = await fundedEscrow(ctx);
    await viem_assert_reverts(ctx, () => escrow.write.release([id], { account: client.account }));
  });

  it("refunds the client after the window closes with no approval", async () => {
    const ctx = await setup();
    const { escrow, client } = ctx;
    const id = await fundedEscrow(ctx);
    const publicClient = await ctx.viem.getPublicClient();
    await publicClient.request({ method: "evm_increaseTime", params: [8 * 24 * 60 * 60] } as never);
    await publicClient.request({ method: "evm_mine", params: [] } as never);
    await escrow.write.refund([id], { account: client.account });
    const e = (await escrow.read.getEscrow([id])) as { status: number };
    assert.equal(e.status, 4);
  });
});

async function viem_assert_reverts(
  _ctx: Awaited<ReturnType<typeof setup>>,
  fn: () => Promise<unknown>,
) {
  await assert.rejects(fn);
}
