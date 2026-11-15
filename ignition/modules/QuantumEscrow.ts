import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys QuantumEscrow in local simulation mode, usePrecompile false.
 * On QoreChain testnet the deployer needs a registered ML-DSA-87 key
 * and a live EVM authorisation window first (see README: npm run window open).
 * The live precompile call is wired at deploy time, see BUILD-REPORT.md.
 */
export default buildModule("QuantumEscrowModule", (m) => {
  const usePrecompile = m.getParameter("usePrecompile", false);
  const escrow = m.contract("QuantumEscrow", [usePrecompile]);
  return { escrow };
});
