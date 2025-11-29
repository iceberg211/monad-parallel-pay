// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
}

contract PayoutManager {
    struct Payout {
        address creator; // 批次创建者
        address token; // 支付 token，address(0) 表示原生币
        uint256 totalAmount; // 所有收款人理论总额
        uint256 fundedAmount; // 当前已打入额度（用于检查是否足够）
        bool closed; // 是否关闭（关闭后不允许再 claim）
        string title; // 标题/备注 (e.g. "2023-10 Payroll")
        uint8 payoutType; // 类型 (1=Payroll, 2=Grant, 3=Event, etc.)
    }

    struct PayoutTemplate {
        address creator;
        string name; // 模版名称 (e.g. "Engineering Team Payroll")
        address token;
        address[] recipients;
        uint256[] amounts;
    }

    uint256 public nextPayoutId;
    mapping(uint256 => Payout) public payouts;

    // claimable[payoutId][user] = amount
    mapping(uint256 => mapping(address => uint256)) public claimable;

    uint256 public nextTemplateId;
    mapping(uint256 => PayoutTemplate) public templates;

    event PayoutCreated(
        uint256 indexed payoutId,
        address indexed creator,
        address indexed token,
        uint256 totalAmount,
        uint256 recipientsCount,
        string title,
        uint8 payoutType
    );

    event PayoutFunded(
        uint256 indexed payoutId,
        address indexed from,
        uint256 amount
    );

    event PayoutClaimed(
        uint256 indexed payoutId,
        address indexed recipient,
        uint256 amount
    );

    event PayoutClosed(uint256 indexed payoutId);
    event RemainingWithdrawn(uint256 indexed payoutId, uint256 amount);

    event TemplateCreated(
        uint256 indexed templateId,
        address indexed creator,
        string name
    );

    // Internal function to handle payout creation logic
    function _createPayout(
        address token,
        address[] memory recipients,
        uint256[] memory amounts,
        string memory title,
        uint8 payoutType
    ) internal returns (uint256 payoutId) {
        require(recipients.length == amounts.length, "Length mismatch");
        require(recipients.length > 0, "No recipients");

        uint256 total;
        payoutId = nextPayoutId;
        nextPayoutId++;

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Zero recipient");
            require(amounts[i] > 0, "Zero amount");
            // 独立格子，后续并行 claim
            claimable[payoutId][recipients[i]] = amounts[i];
            total += amounts[i];
        }

        payouts[payoutId] = Payout({
            creator: msg.sender,
            token: token,
            totalAmount: total,
            fundedAmount: 0,
            closed: false,
            title: title,
            payoutType: payoutType
        });

        emit PayoutCreated(
            payoutId,
            msg.sender,
            token,
            total,
            recipients.length,
            title,
            payoutType
        );
    }

    function createPayout(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts,
        string calldata title,
        uint8 payoutType
    ) external returns (uint256 payoutId) {
        return _createPayout(token, recipients, amounts, title, payoutType);
    }

    function createTemplate(
        string calldata name,
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external returns (uint256 templateId) {
        require(recipients.length == amounts.length, "Length mismatch");
        require(recipients.length > 0, "No recipients");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Zero recipient");
            require(amounts[i] > 0, "Zero amount");
        }

        templateId = nextTemplateId;
        nextTemplateId++;

        PayoutTemplate storage t = templates[templateId];
        t.creator = msg.sender;
        t.name = name;
        t.token = token;
        t.recipients = recipients;
        t.amounts = amounts;

        emit TemplateCreated(templateId, msg.sender, name);
    }

    function createPayoutFromTemplate(
        uint256 templateId,
        string calldata title,
        uint8 payoutType
    ) external returns (uint256 payoutId) {
        PayoutTemplate storage t = templates[templateId];
        require(t.creator == msg.sender, "Not template creator");

        return _createPayout(t.token, t.recipients, t.amounts, title, payoutType);
    }

    function getTemplate(uint256 templateId) external view returns (
        string memory name,
        address token,
        address[] memory recipients,
        uint256[] memory amounts
    ) {
        PayoutTemplate storage t = templates[templateId];
        return (t.name, t.token, t.recipients, t.amounts);
    }

    function fundPayout(uint256 payoutId, uint256 amount) external payable {
        Payout storage p = payouts[payoutId];
        require(!p.closed, "Payout closed");

        if (p.token == address(0)) {
            // 原生币
            require(msg.value == amount, "Value mismatch");
        } else {
            // ERC20
            require(msg.value == 0, "No native");
            require(amount > 0, "Zero amount");
            require(
                IERC20(p.token).transferFrom(msg.sender, address(this), amount),
                "Transfer failed"
            );
        }

        p.fundedAmount += amount;
        // require(p.fundedAmount <= p.totalAmount, "Over funded"); // Optional check

        emit PayoutFunded(payoutId, msg.sender, amount);
    }

    function claim(uint256 payoutId) external {
        Payout storage p = payouts[payoutId];
        require(!p.closed, "Payout closed");

        uint256 amount = claimable[payoutId][msg.sender];
        require(amount > 0, "Nothing to claim");
        require(p.fundedAmount >= amount, "Not enough funded");

        // 更新状态（先改状态，再转钱，防重入）
        claimable[payoutId][msg.sender] = 0;
        p.fundedAmount -= amount;

        if (p.token == address(0)) {
            (bool ok, ) = msg.sender.call{value: amount}("");
            require(ok, "Native transfer failed");
        } else {
            require(
                IERC20(p.token).transfer(msg.sender, amount),
                "ERC20 transfer failed"
            );
        }

        emit PayoutClaimed(payoutId, msg.sender, amount);
    }

    function closePayout(uint256 payoutId) external {
        Payout storage p = payouts[payoutId];
        require(msg.sender == p.creator, "Not creator");
        require(!p.closed, "Already closed");
        p.closed = true;
        emit PayoutClosed(payoutId);
    }

    function withdrawRemaining(uint256 payoutId) external {
        Payout storage p = payouts[payoutId];
        require(msg.sender == p.creator, "Not creator");
        require(p.closed, "Not closed");
        uint256 amount = p.fundedAmount;
        require(amount > 0, "Nothing remaining");

        p.fundedAmount = 0;
        if (p.token == address(0)) {
            (bool ok, ) = msg.sender.call{value: amount}("");
            require(ok, "Native transfer failed");
        } else {
            require(
                IERC20(p.token).transfer(msg.sender, amount),
                "ERC20 transfer failed"
            );
        }

        emit RemainingWithdrawn(payoutId, amount);
    }

    function getBatchClaimable(
        uint256 payoutId,
        address[] calldata users
    ) external view returns (uint256[] memory amounts) {
        amounts = new uint256[](users.length);
        for (uint256 i = 0; i < users.length; i++) {
            amounts[i] = claimable[payoutId][users[i]];
        }
    }
}
