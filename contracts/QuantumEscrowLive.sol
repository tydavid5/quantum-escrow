// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title QuantumEscrowLive
/// @notice Live variant of QuantumEscrow for QoreChain testnet.
///         Difference from contracts/QuantumEscrow.sol, stated plainly:
///         the original contract has two defects for live use.
///         1. Its PQC_VERIFY_PRECOMPILE constant is 0x...0901, which is
///            the Cross-VM Bridge precompile, not the PQC Verify precompile.
///         2. Its pqcVerify in usePrecompile mode reverts, so a live
///            approval could never succeed, and its bytes32 signature
///            argument cannot hold a 4627 byte ML-DSA-87 signature.
///         This variant fixes both. It calls the real PQC Verify
///         precompile at 0x0000000000000000000000000000000000000a01, with
///         the ABI published in the QoreChain EVM package, IQORE_PQC_ABI:
///         pqcVerify(bytes pubkey, bytes signature, bytes message)
///         returns (bool valid). The ML-DSA-87 public key is 2592 bytes,
///         the signature is 4627 bytes, the message is the 32 byte
///         approval message hash. The stored pqPublicKeyHash is
///         keccak256 of the full public key, checked before the call.
///         When usePrecompile is false the original deterministic local
///         simulation is used, so the existing local tests still pass
///         against the original contract. Do not deploy this contract
///         with usePrecompile false on testnet and claim real on chain
///         verification. Deploy with usePrecompile true.
contract QuantumEscrowLive {
    enum Status {
        Created,
        Funded,
        Approved,
        Released,
        Refunded,
        Cancelled
    }

    struct Escrow {
        address client;
        address freelancer;
        uint256 amount;
        string title;
        Status status;
        uint256 windowStart;
        uint256 windowEnd;
        uint256 windowSeconds;
        bytes32 pqPublicKeyHash;
    }

    uint256 public nextEscrowId;
    mapping(uint256 => Escrow) public escrows;

    /// @notice Real PQC Verify precompile on QoreChain testnet, active
    ///         since Oct 27 2026, not on mainnet. Lowercase hex here is
    ///         the same address; viem also needs the lowercase form.
    address public constant PQC_VERIFY_PRECOMPILE = address(0x0000000000000000000000000000000000000a01);
    uint256 public constant PQC_PUBLIC_KEY_LENGTH = 2592;
    uint256 public constant PQC_SIGNATURE_LENGTH = 4627;
    bool public immutable usePrecompile;

    event EscrowCreated(uint256 indexed id, address indexed client, address indexed freelancer, uint256 amount, string title);
    event EscrowFunded(uint256 indexed id, uint256 amount, uint256 windowStart, uint256 windowEnd);
    event MilestoneApproved(uint256 indexed id, address indexed client);
    event PaymentReleased(uint256 indexed id, address indexed freelancer, uint256 amount);
    event EscrowRefunded(uint256 indexed id, address indexed client, uint256 amount);
    event EscrowCancelled(uint256 indexed id);

    error ClassicalOnlyRejected();
    error InvalidClassicalSignature();
    error InvalidPqSignature();
    error NotClient();
    error WrongStatus();
    error WrongAmount();
    error WindowNotOpen();
    error WindowNotClosed();

    constructor(bool _usePrecompile) {
        usePrecompile = _usePrecompile;
    }

    function createEscrow(
        address freelancer,
        string calldata title,
        uint256 amount,
        bytes32 pqPublicKeyHash,
        uint256 windowSeconds
    ) external returns (uint256 id) {
        require(freelancer != address(0), "freelancer required");
        require(amount > 0, "amount required");
        require(pqPublicKeyHash != bytes32(0), "post-quantum key required");
        id = nextEscrowId;
        nextEscrowId += 1;
        uint256 window = windowSeconds == 0 ? 7 days : windowSeconds;
        escrows[id] = Escrow({
            client: msg.sender,
            freelancer: freelancer,
            amount: amount,
            title: title,
            status: Status.Created,
            windowStart: 0,
            windowEnd: 0,
            windowSeconds: window,
            pqPublicKeyHash: pqPublicKeyHash
        });
        emit EscrowCreated(id, msg.sender, freelancer, amount, title);
    }

    function fund(uint256 id) external payable {
        Escrow storage e = escrows[id];
        if (msg.sender != e.client) revert NotClient();
        if (e.status != Status.Created) revert WrongStatus();
        if (msg.value != e.amount) revert WrongAmount();
        e.status = Status.Funded;
        e.windowStart = block.timestamp;
        e.windowEnd = block.timestamp + e.windowSeconds;
        emit EscrowFunded(id, msg.value, e.windowStart, e.windowEnd);
    }

    function approvalMessage(uint256 id) public view returns (bytes32) {
        Escrow storage e = escrows[id];
        return keccak256(abi.encodePacked(id, e.amount, e.freelancer, e.client, "APPROVE"));
    }

    /// @notice Real on chain ML-DSA-87 check through the precompile.
    ///         Returns false, never reverts, when the key or signature
    ///         has the wrong length, the key hash does not match, the
    ///         precompile call fails, or it answers empty. The caller
    ///         must sign the 32 byte approval message hash, as bytes,
    ///         with ML-DSA-87.
    function pqcVerifyLive(
        bytes32 messageHash,
        bytes calldata pqPublicKey,
        bytes calldata pqSignature,
        bytes32 pqPublicKeyHash
    ) public view returns (bool) {
        if (!usePrecompile) revert("live check needs usePrecompile true");
        if (pqPublicKey.length != PQC_PUBLIC_KEY_LENGTH) return false;
        if (pqSignature.length != PQC_SIGNATURE_LENGTH) return false;
        if (keccak256(pqPublicKey) != pqPublicKeyHash) return false;
        bytes memory callData = abi.encodeWithSignature(
            "pqcVerify(bytes,bytes,bytes)",
            pqPublicKey,
            pqSignature,
            abi.encodePacked(messageHash)
        );
        (bool ok, bytes memory ret) = PQC_VERIFY_PRECOMPILE.staticcall(callData);
        if (!ok) return false;
        if (ret.length < 32) return false;
        return abi.decode(ret, (bool));
    }

    /// @notice Local simulation, kept for tests only. Not real verification.
    function pqcVerifySimulated(bytes32 messageHash, bytes32 pqSignature, bytes32 pqPublicKeyHash) public pure returns (bool) {
        bytes32 expected = keccak256(abi.encodePacked(messageHash, pqPublicKeyHash));
        return pqSignature == expected;
    }

    /// @notice Approve with a full hybrid signature: the ML-DSA-87
    ///         signature is verified on chain by the precompile, the
    ///         classical ECDSA signature is recovered on chain.
    function approveMilestoneLive(
        uint256 id,
        bytes calldata pqPublicKey,
        bytes calldata pqSignature,
        bytes calldata classicalSignature
    ) external {
        Escrow storage e = escrows[id];
        if (msg.sender != e.client) revert NotClient();
        if (e.status != Status.Funded) revert WrongStatus();
        if (block.timestamp < e.windowStart || block.timestamp > e.windowEnd) revert WindowNotOpen();
        bytes32 messageHash = approvalMessage(id);
        if (!pqcVerifyLive(messageHash, pqPublicKey, pqSignature, e.pqPublicKeyHash)) revert InvalidPqSignature();
        bytes32 ethHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(classicalSignature);
        address signer = ecrecover(ethHash, v, r, s);
        if (signer != e.client) revert InvalidClassicalSignature();
        e.status = Status.Approved;
        emit MilestoneApproved(id, msg.sender);
    }

    function release(uint256 id) external {
        Escrow storage e = escrows[id];
        if (e.status != Status.Approved) revert WrongStatus();
        e.status = Status.Released;
        (bool ok, ) = payable(e.freelancer).call{value: e.amount}("");
        require(ok, "payment transfer failed");
        emit PaymentReleased(id, e.freelancer, e.amount);
    }

    function refund(uint256 id) external {
        Escrow storage e = escrows[id];
        if (msg.sender != e.client) revert NotClient();
        if (e.status != Status.Funded) revert WrongStatus();
        if (block.timestamp <= e.windowEnd) revert WindowNotClosed();
        e.status = Status.Refunded;
        (bool ok, ) = payable(e.client).call{value: e.amount}("");
        require(ok, "refund transfer failed");
        emit EscrowRefunded(id, e.client, e.amount);
    }

    function cancel(uint256 id) external {
        Escrow storage e = escrows[id];
        if (msg.sender != e.client) revert NotClient();
        if (e.status != Status.Created) revert WrongStatus();
        e.status = Status.Cancelled;
        emit EscrowCancelled(id);
    }

    function getEscrow(uint256 id) external view returns (Escrow memory) {
        return escrows[id];
    }

    function splitSignature(bytes calldata sig) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "signature must be 65 bytes");
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
    }
}
