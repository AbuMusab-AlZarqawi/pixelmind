// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * PixelMind — Collaborative Onchain Pixel Canvas
 * Deployed on Ritual Chain Testnet (Chain ID: 1979)
 *
 * Design principles:
 *  - Sparse storage: only colored pixels are written to chain
 *  - Uncolored pixels default to 0xFFFFFF (white)
 *  - Native RITUAL token payment per pixel
 *  - Owner can update price and withdraw funds
 */
contract PixelMind {
    // ─── Constants ────────────────────────────────────────────────────────────
    uint32 public constant CANVAS_WIDTH  = 1000;
    uint32 public constant CANVAS_HEIGHT = 500;
    uint32 public constant TOTAL_PIXELS  = CANVAS_WIDTH * CANVAS_HEIGHT; // 500,000

    // ─── State ────────────────────────────────────────────────────────────────
    address public owner;
    uint256 public pixelPrice; // in wei (RITUAL)

    struct Pixel {
        address painter;   // wallet that last colored this pixel
        uint24  color;     // RGB packed into 3 bytes (0xRRGGBB)
        uint64  timestamp; // block.timestamp when last colored
    }

    // pixelId → Pixel  (sparse: only exists if ever colored)
    mapping(uint32 => Pixel) private _pixels;

    // Track total revenue collected
    uint256 public totalRevenue;

    // ─── Events ───────────────────────────────────────────────────────────────
    event PixelColored(
        uint32 indexed pixelId,
        address indexed painter,
        uint24  color,
        uint256 timestamp
    );
    event PriceUpdated(uint256 oldPrice, uint256 newPrice);
    event Withdrawn(address indexed to, uint256 amount);

    // ─── Errors ───────────────────────────────────────────────────────────────
    error NotOwner();
    error InvalidPixelId(uint32 pixelId);
    error InsufficientPayment(uint256 sent, uint256 required);
    error ZeroBalance();
    error TransferFailed();
    error BatchTooLarge();
    error ArrayLengthMismatch();

    // ─── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(uint256 _pixelPrice) {
        owner = msg.sender;
        pixelPrice = _pixelPrice;
    }

    // ─── Core Functions ───────────────────────────────────────────────────────

    /**
     * @notice Color a single pixel on the canvas
     * @param pixelId  Linear index: row * CANVAS_WIDTH + col  (0 … 499,999)
     * @param color    RGB color packed as uint24 (0xRRGGBB)
     */
    function colorPixel(uint32 pixelId, uint24 color) external payable {
        if (pixelId >= TOTAL_PIXELS) revert InvalidPixelId(pixelId);
        if (msg.value < pixelPrice)  revert InsufficientPayment(msg.value, pixelPrice);

        _pixels[pixelId] = Pixel({
            painter:   msg.sender,
            color:     color,
            timestamp: uint64(block.timestamp)
        });

        totalRevenue += msg.value;

        emit PixelColored(pixelId, msg.sender, color, block.timestamp);
    }

    /**
     * @notice Color multiple pixels in one transaction (max 100 at a time)
     * @param pixelIds  Array of pixel indices
     * @param colors    Corresponding RGB colors
     */
    function colorPixelBatch(
        uint32[] calldata pixelIds,
        uint24[] calldata colors
    ) external payable {
        uint256 len = pixelIds.length;
        if (len > 100)       revert BatchTooLarge();
        if (len != colors.length) revert ArrayLengthMismatch();

        uint256 totalCost = pixelPrice * len;
        if (msg.value < totalCost) revert InsufficientPayment(msg.value, totalCost);

        for (uint256 i = 0; i < len; ) {
            uint32 pid = pixelIds[i];
            if (pid >= TOTAL_PIXELS) revert InvalidPixelId(pid);

            _pixels[pid] = Pixel({
                painter:   msg.sender,
                color:     colors[i],
                timestamp: uint64(block.timestamp)
            });

            emit PixelColored(pid, msg.sender, colors[i], block.timestamp);

            unchecked { ++i; }
        }

        totalRevenue += msg.value;
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    /**
     * @notice Get a single pixel's data (uncolored pixels return white / zero address)
     */
    function getPixel(uint32 pixelId) external view returns (
        address painter,
        uint24  color,
        uint64  timestamp
    ) {
        if (pixelId >= TOTAL_PIXELS) revert InvalidPixelId(pixelId);
        Pixel storage p = _pixels[pixelId];
        // Default color for uncolored pixels is white (0xFFFFFF)
        return (
            p.painter,
            p.painter == address(0) ? 0xFFFFFF : p.color,
            p.timestamp
        );
    }

    /**
     * @notice Batch fetch pixels for efficient canvas rendering
     * @param pixelIds  Array of pixel IDs to fetch
     */
    function getPixelsBatch(uint32[] calldata pixelIds) external view returns (
        address[] memory painters,
        uint24[]  memory colors,
        uint64[]  memory timestamps
    ) {
        uint256 len = pixelIds.length;
        painters   = new address[](len);
        colors     = new uint24[](len);
        timestamps = new uint64[](len);

        for (uint256 i = 0; i < len; ) {
            uint32 pid = pixelIds[i];
            if (pid < TOTAL_PIXELS) {
                Pixel storage p = _pixels[pid];
                painters[i]   = p.painter;
                colors[i]     = p.painter == address(0) ? 0xFFFFFF : p.color;
                timestamps[i] = p.timestamp;
            } else {
                colors[i] = 0xFFFFFF; // default white for out-of-range
            }
            unchecked { ++i; }
        }
    }

    // ─── Admin Functions ──────────────────────────────────────────────────────

    /**
     * @notice Update the price per pixel
     */
    function setPixelPrice(uint256 newPrice) external onlyOwner {
        emit PriceUpdated(pixelPrice, newPrice);
        pixelPrice = newPrice;
    }

    /**
     * @notice Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }

    /**
     * @notice Withdraw all accumulated RITUAL tokens to owner
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance == 0) revert ZeroBalance();
        (bool ok, ) = owner.call{value: balance}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(owner, balance);
    }

    /**
     * @notice Withdraw to a specific address
     */
    function withdrawTo(address payable recipient) external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance == 0) revert ZeroBalance();
        (bool ok, ) = recipient.call{value: balance}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(recipient, balance);
    }

    receive() external payable {
        totalRevenue += msg.value;
    }
}
