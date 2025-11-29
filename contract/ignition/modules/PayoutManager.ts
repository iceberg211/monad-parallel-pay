import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("PayoutManagerModule", (m) => {
  // 部署 PayoutManager 合约
  const payoutManager = m.contract("PayoutManager");

  return { payoutManager };
});
