import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("AirdropSystemModule", (m) => {
  // 代币参数 - Monad Hackathon 主题
  const name = m.getParameter("name", "Monad Hackathon Token");
  const symbol = m.getParameter("symbol", "MHT");
  const decimals = m.getParameter("decimals", 18);
  const initialSupply = m.getParameter("initialSupply", "10000000000000000000000000"); // 10,000,000 tokens with 18 decimals

  // 部署 AirdropToken 合约
  const token = m.contract("AirdropToken", [name, symbol, decimals, initialSupply]);

  // 部署 PayoutManager 合约
  const payoutManager = m.contract("PayoutManager");

  return { token, payoutManager };
});
