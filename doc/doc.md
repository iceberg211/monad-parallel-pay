
* 合约：Hardhat + Solidity
* 前端：Next.js + wagmi/viem（建议）
* 目标：**Parallel Pay 批量支付 / 分账协议 + 简单 Demo 前端**

你可以直接照着这个拆任务 + 编码。

---

## 一、整体架构设计

### 1.1 系统角色

* **Employer（发起人）**：创建批次、充值资金
* **Recipient（收款人）**：自己调用合约 `claim` 领取
* **Viewer（查看者）**：任何人都能查某个批次信息（方便 Demo）

### 1.2 模块划分

* **智能合约层（Hardhat）**

  * `PayoutManager` 合约：核心业务逻辑
  * 单元测试：创建/充值/领取/退款/异常用例

* **前端应用层（Next.js）**

  * Landing/说明页
  * 发起人控制台：创建批次 + 充值
  * 领取页面：输入 `payoutId` → 查询 → 一键领取
  * Demo “批量 claim”按钮（可选）

---

## 二、合约设计（Hardhat）

### 2.1 核心目标

* 支持发起人创建一个**批次支付任务（Payout）**
* 每个批次包含：

  * 支付 token（ERC20 或原生币）
  * 多个收款人 + 各自金额
* 发起人统一充值到合约
* 每个收款人独立 `claim`，互不影响（**并行友好**）

### 2.2 数据结构

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
}

contract PayoutManager {
    struct Payout {
        address creator;       // 批次创建者
        address token;         // 支付 token，address(0) 表示原生币
        uint256 totalAmount;   // 所有收款人理论总额
        uint256 fundedAmount;  // 当前已打入额度（用于检查是否足够）
        bool    closed;        // 是否关闭（关闭后不允许再 claim）
    }

    uint256 public nextPayoutId;
    mapping(uint256 => Payout) public payouts;

    // claimable[payoutId][user] = amount
    mapping(uint256 => mapping(address => uint256)) public claimable;
```

> 关键点：`claimable[payoutId][user]` 每个人的状态是独立的 storage slot，有利于并行。

### 2.3 公开接口（函数）

#### 1）创建批次

```solidity
    event PayoutCreated(
        uint256 indexed payoutId,
        address indexed creator,
        address indexed token,
        uint256 totalAmount,
        uint256 recipientsCount
    );

    function createPayout(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external returns (uint256 payoutId) {
        require(recipients.length == amounts.length, "Length mismatch");
        require(recipients.length > 0, "No recipients");

        uint256 total;
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Zero recipient");
            require(amounts[i] > 0, "Zero amount");
            // 独立格子，后续并行 claim
            claimable[nextPayoutId][recipients[i]] = amounts[i];
            total += amounts[i];
        }

        payouts[nextPayoutId] = Payout({
            creator: msg.sender,
            token: token,
            totalAmount: total,
            fundedAmount: 0,
            closed: false
        });

        emit PayoutCreated(nextPayoutId, msg.sender, token, total, recipients.length);

        payoutId = nextPayoutId;
        nextPayoutId++;
    }
```

#### 2）充值批次资金

```solidity
    event PayoutFunded(
        uint256 indexed payoutId,
        address indexed from,
        uint256 amount
    );

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
            require(IERC20(p.token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        }

        p.fundedAmount += amount;
        require(p.fundedAmount <= p.totalAmount, "Over funded"); // 可选

        emit PayoutFunded(payoutId, msg.sender, amount);
    }
```

#### 3）领取（收款人）

```solidity
    event PayoutClaimed(
        uint256 indexed payoutId,
        address indexed recipient,
        uint256 amount
    );

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
            require(IERC20(p.token).transfer(msg.sender, amount), "ERC20 transfer failed");
        }

        emit PayoutClaimed(payoutId, msg.sender, amount);
    }
```

#### 4）关闭批次 & 提取剩余资金（可选增强）

```solidity
    event PayoutClosed(uint256 indexed payoutId);
    event RemainingWithdrawn(uint256 indexed payoutId, uint256 amount);

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
            require(IERC20(p.token).transfer(msg.sender, amount), "ERC20 transfer failed");
        }

        emit RemainingWithdrawn(payoutId, amount);
    }
}
```

### 2.4 并行优化说明（给评委讲用）

* 每个收款人的 `claimable[payoutId][user]` 独立存储
* `claim()` 修改：

  * `claimable[payoutId][msg.sender]`
  * `p.fundedAmount`
* 大部分冲突都集中在用户各自 slot，多个收款人 claim 不会写到同一地址
* 这让 Monad 能够对大量 `claim()` 交易进行**并行执行**，在高峰批量发薪 / 空投时表现优异

---

## 三、Hardhat 工程结构

### 3.1 目录结构建议

```bash
monad-parallel-pay/
  ├─ contracts/
  │   └─ PayoutManager.sol
  ├─ scripts/
  │   ├─ deploy.ts
  │   └─ seedPayout.ts    # 可选：创建一个示例 payout 批次
  ├─ test/
  │   └─ PayoutManager.t.ts
  ├─ hardhat.config.ts
  ├─ package.json
  └─ .env                 # 存 RPC、私钥
```

### 3.2 hardhat.config.ts 核心点

```ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    monadTestnet: {
      url: process.env.MONAD_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};

export default config;
```

### 3.3 部署脚本（示例）

```ts
import { ethers } from "hardhat";

async function main() {
  const PayoutManager = await ethers.getContractFactory("PayoutManager");
  const payoutManager = await PayoutManager.deploy();
  await payoutManager.deployed();
  console.log("PayoutManager deployed to:", payoutManager.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

---

## 四、前端设计（Next.js）

假设用 **Next.js 13+ App Router + TypeScript + wagmi + viem**。

### 4.1 技术栈

* Next.js（SSR + 前端路由）
* wagmi + viem（钱包连接 & 合约交互）
* UI 框架（任选：ChakraUI, Ant Design, Tailwind，随你顺手）

### 4.2 页面结构

建议：

```bash
app/
  ├─ layout.tsx
  ├─ page.tsx                # Landing，项目简介 + 两个入口
  ├─ employer/
  │   └─ page.tsx            # 发起人控制台
  └─ claim/
      └─ page.tsx            # 领取页面
```

#### 1）Landing 页（`/`）

* 简短介绍：

  * 项目是什么
  * Monad 并行 + 秒级 finality 的卖点
* 两个按钮：

  * “我是发钱的人” → `/employer`
  * “我要领钱” → `/claim`

#### 2）发起人控制台（`/employer`）

功能：

* 连接钱包（Connect Wallet）
* 表单：

  * Token 地址（或者一个下拉选择：原生币 / 某个固定 ERC20）
  * 收款人列表（地址 + 金额）

    * 支持添加行 / 删除行
    * 为了省时间可以先用硬编码假数据 + 一个“添加3个示例地址”按钮
* “创建批次”按钮：

  * 调用 `createPayout`
  * 返回 `payoutId` 显示在页面上
* “为批次充值”区域：

  * 输入 `payoutId` 或使用刚返回的
  * 从合约读取 `totalAmount` / `fundedAmount`
  * 显示“还需充值 X”
  * 按钮调用 `fundPayout`

#### 3）领取页面（`/claim`）

功能：

* 输入框：

  * `payoutId`
* 显示信息：

  * 该批次的 token、总额、当前已充值额度、是否关闭
  * 当前钱包地址可领取金额（`getClaimable` / 直接读 `claimable`）
* 按钮：

  * “一键领取”：调用 `claim(payoutId)`
* 交易成功后：

  * 刷新可领取金额
  * 显示提示 Toast

### 4.3 与合约交互（wagmi/viem）

创建一个 `config/contract.ts`：

```ts
export const PAYOUT_MANAGER_ADDRESS = "0x..."; // 部署后填

export const payoutManagerAbi = [ /* 从编译产物拷贝 */ ];
```

使用 wagmi hook（例子）：

```ts
import { useContractWrite, usePrepareContractWrite, useContractRead } from "wagmi";
import { PAYOUT_MANAGER_ADDRESS, payoutManagerAbi } from "@/config/contract";

const { data: payoutInfo } = useContractRead({
  address: PAYOUT_MANAGER_ADDRESS,
  abi: payoutManagerAbi,
  functionName: "payouts",
  args: [payoutId],
});

const { write: claim, isLoading } = useContractWrite({
  address: PAYOUT_MANAGER_ADDRESS,
  abi: payoutManagerAbi,
  functionName: "claim",
});
```

> 你可以先不搞太花哨：
> 把核心场景 “创建批次 → 充值 → 领取” 跑通就够了。

---

## 五、Demo 展示流程（给你排个剧本）

1. **开场 10 秒**

   * “我们做的是 Monad 上的并行批量支付 & 分账协议，适合工资、空投、收益分成。”

2. **雇主视角**

   * 在 `/employer` 页面：

     * 填 3~5 个收款人地址 + 金额
     * 点击 `创建批次` → 得到 `payoutId`
     * 显示 `totalAmount`
   * 立刻 `fundPayout`，告诉评委：发起人只做两步操作。

3. **收款人视角**

   * 切钱包 / 用另一个浏览器窗口打开 `/claim`
   * 输入 `payoutId`，看到自己可领金额
   * 点“领取”，几秒内到账（展示钱包 / 区块浏览器）

4. **并行效果（加分项）**

   * 提前准备一个包含 20 个收款人的批次
   * 跑脚本 / 调调 UI 一键触发多地址 `claim`
   * 打开浏览器给评委看同一 block 中大量 claim

5. **收尾 10 秒**

   * “我们的合约特意用 per-user 独立 storage 设计，非常适合 Monad 的并行 EVM，将来可以扩展成工资系统、创作者分成、DAO 财务后台。”

---




