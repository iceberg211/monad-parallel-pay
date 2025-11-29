## 开发计划（根据 doc.md / 场景.md / 合约）

### checkList
- [x] 阅读 doc.md、场景.md、PayoutManager.sol，梳理页面与交互需求
- [x] 初始化 `frontend`：Next.js + TypeScript + TailwindCSS + wagmi（含基本布局/样式配置）
- [x] 准备合约配置：填入 PayoutManager 地址常量（占位即可）与 ABI（基于合约源码）
- [x] 实现页面 `/`（Landing）：介绍 + 导航按钮至 `/employer` 与 `/claim`
- [x] 实现页面 `/employer`：连接钱包、创建批次表单（token 地址 + 收款人列表）、批次创建结果展示、充值区域（查询并显示 total/funded/剩余，调用 fundPayout）
- [x] 实现页面 `/claim`：输入 payoutId 查询信息（token、total、funded、closed、当前地址可领取）、一键 claim、成功后刷新数据与提示
- [x] 简单自检：基本交互流程连通（不要求真链），补充使用说明与后续待办
