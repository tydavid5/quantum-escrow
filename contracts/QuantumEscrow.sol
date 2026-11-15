// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title QuantumEscrow
/// @notice Milestone escrow where release needs a hybrid approval:
///         a classical ECDSA signature plus a post-quantum signature.
///         A classical only approval is rejected on chain.
/// @dev Local test mode simulates the PQC Verify precompile with a
///      deterministic check. On QoreChain testnet the same approval
///      path is meant to call the PQC Verify precompile, which is
///      active on testnet since Oct 27 2026 and not on mainnet.
///      The simulation is labelled as such in the README and in
///      BUILD-REPORT.md. It is not a real ML-DSA-87 verification.
contract QuantumEscrow {
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

    /// @notice Placeholder address for the PQC Verify precompile on testnet.
    ///         The live precompile address is confirmed from docs at deploy
    ///         time. Local tests run with usePrecompile set to false.
    address public constant PQC_VERIFY_PRECOMPILE = address(0x0000000000000000000000000000000000000901);
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

    /// @notice Create a milestone escrow. Funding is a separate step.
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

    /// @notice Fund a created escrow. Opens the scoped EVM window for it.
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

    /// @notice The message a client signs for one milestone approval.
    function approvalMessage(uint256 id) public view returns (bytes32) {
        Escrow storage e = escrows[id];
        return keccak256(abi.encodePacked(id, e.amount, e.freelancer, e.client, "APPROVE"));
    }

    /// @notice Post-quantum check. Local mode uses the deterministic
    ///         simulation described above. Testnet mode is reserved for
    ///         the live precompile call and reverts here until the live
    ///         precompile address and ABI are wired at deploy time.
    function pqcVerify(bytes32 messageHash, bytes32 pqSignature, bytes32 pqPublicKeyHash) public view returns (bool) {
        if (usePrecompile) {
            revert("Live precompile call is wired at deploy time, not in local tests");
        }
        bytes32 expected = keccak256(abi.encodePacked(messageHash, pqPublicKeyHash));
        return pqSignature == expected;
    }

    /// @notice Approve a funded milestone with a hybrid signature.
    ///         Classical only input is rejected, it never approves.
    function approveMilestone(uint256 id, bytes32 pqSignature, bytes calldata classicalSignature) external {
        Escrow storage e = escrows[id];
        if (msg.sender != e.client) revert NotClient();
        if (e.status != Status.Funded) revert WrongStatus();
        if (block.timestamp < e.windowStart || block.timestamp > e.windowEnd) revert WindowNotOpen();
        bytes32 messageHash = approvalMessage(id);
        if (!pqcVerify(messageHash, pqSignature, e.pqPublicKeyHash)) revert ClassicalOnlyRejected();
        bytes32 ethHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(classicalSignature);
        address signer = ecrecover(ethHash, v, r, s);
        if (signer != e.client) revert InvalidClassicalSignature();
        e.status = Status.Approved;
        emit MilestoneApproved(id, msg.sender);
    }

    /// @notice Release payment to the freelancer after hybrid approval.
    function release(uint256 id) external {
        Escrow storage e = escrows[id];
        if (e.status != Status.Approved) revert WrongStatus();
        e.status = Status.Released;
        (bool ok, ) = payable(e.freelancer).call{value: e.amount}("");
        require(ok, "payment transfer failed");
        emit PaymentReleased(id, e.freelancer, e.amount);
    }

    /// @notice Refund the client after the window closes with no approval.
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

    /// @notice Cancel a created escrow before it is funded.
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
