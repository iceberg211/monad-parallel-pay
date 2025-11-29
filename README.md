# Monad Parallel Pay

本仓库包含 Monad 测试网的批量支付演示：Hardhat 合约与 Next.js 前端。雇主创建支付清单/模板，资金到账后收款人自助领取；附带空投代币示例。

## 功能与场景

- 批量发薪 / 拨款（雇主视角）
  - 在雇主页面一次性配置多个收款人和金额，创建批次清单
  - 通过原生币或 ERC20 充值批次余额，支持分批充值
  - 批次关闭后，未领取余额可回收
- 自助领取（收款人视角）
  - 在领取页面输入 `payoutId`，查看自己可领取金额
  - 满足条件时一键 `claim`，并行领取互不阻塞
- 空投示例（AirdropToken）
  - 可通过 `AirdropToken` 演示自定义 `decimals` 的 ERC20 空投
  - 同样复用批量支付 / 自助领取的交互模式

## 仓库结构

- `contract/`：Hardhat 项目（PayoutManager、AirdropToken），包含 Ignition 部署与 ABI 同步脚本
- `frontend/`：Next.js 15 前端，提供雇主管理页与领取页
- `doc.md`：业务说明；`PLAN.md`：开发计划

## 快速开始

### 合约

```bash
cd contract
pnpm install

# .env 示例（已支持自动补 0x 前缀）：
# MONAD_RPC_URL=https://testnet-rpc.monad.xyz/
# PRIVATE_KEY=<私钥>

# 编译
pnpm compile

# 部署（Ignition，默认 monadTestnet，chainId=10143）
pnpm deploy:testnet

# 部署后同步 ABI/地址到前端（chainId 可替换）
pnpm sync-frontend -- --chain=10143
```

### 前端

```bash
cd frontend
pnpm install

# 如需手动覆盖合约地址，设置 NEXT_PUBLIC_PAYOUT_MANAGER_ADDRESS
pnpm dev      # 本地调试
pnpm build    # 产物构建
```

前端主要页面：

- `/`：首页，介绍三种场景并引导到具体页面
- `/employer`：雇主管理台，创建/充值批次
- `/claim`：收款人领取页，根据 `payoutId` 查询并领取

## 常见问题

- **out of gas**：提高交易 gas 限额（例如创建清单时传入较大的 gas），并确保账户余额充足。
- **RPC 报错/不可用**：更换可用的 Monad Testnet RPC，或稍后重试。
- **ABI/地址不同步**：部署后务必运行 `pnpm --filter contract run sync-frontend -- --chain=<id>`，前端读取 `frontend/config/*.deployment.json` 与 `*.abi.json`。

## 参考

- `contract/ignition/modules/`：部署模块
- `frontend/config/contract.ts`：前端合约配置入口
