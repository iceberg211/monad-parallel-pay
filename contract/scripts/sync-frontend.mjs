import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const contractRoot = path.resolve(repoRoot, "contract");
const frontendConfigDir = path.resolve(repoRoot, "frontend", "config");

const chainFlag = process.argv.find((arg) => arg.startsWith("--chain="));
const chainId = chainFlag ? chainFlag.split("=")[1] : process.env.CHAIN_ID || "10143";

if (!chainId) {
  throw new Error("请提供链 ID，例如 --chain=10143 或设置环境变量 CHAIN_ID");
}

const deployedPath = path.join(
  contractRoot,
  "ignition",
  "deployments",
  `chain-${chainId}`,
  "deployed_addresses.json"
);
const artifactPath = path.join(
  contractRoot,
  "artifacts",
  "contracts",
  "PayoutManager.sol",
  "PayoutManager.json"
);

const deployed = JSON.parse(readFileSync(deployedPath, "utf8"));

// 获取 PayoutManager 地址（支持不同模块名，匹配后缀）
const payoutEntry = Object.entries(deployed).find(([key]) => key.endsWith("#PayoutManager"));
if (!payoutEntry) {
  throw new Error(`未找到 PayoutManager 地址，检查 ${deployedPath}`);
}
const payoutAddress = payoutEntry[1];

// 获取 AirdropToken（如果存在）
const airdropEntry = Object.entries(deployed).find(([key]) => key.endsWith("#AirdropToken"));
const airdropAddress = airdropEntry?.[1];

const payoutArtifact = JSON.parse(readFileSync(artifactPath, "utf8"));
const payoutAbi = payoutArtifact.abi;
if (!Array.isArray(payoutAbi)) {
  throw new Error(`PayoutManager ABI 读取失败，检查 ${artifactPath}`);
}

const airdropArtifactPath = path.join(
  contractRoot,
  "artifacts",
  "contracts",
  "AirdropToken.sol",
  "AirdropToken.json"
);
const airdropAbi = airdropAddress
  ? JSON.parse(readFileSync(airdropArtifactPath, "utf8")).abi
  : null;

mkdirSync(frontendConfigDir, { recursive: true });

// 写 PayoutManager
const payoutAbiPath = path.join(frontendConfigDir, "payoutManager.abi.json");
const payoutDeploymentPath = path.join(frontendConfigDir, "payoutManager.deployment.json");
writeFileSync(payoutAbiPath, JSON.stringify(payoutAbi, null, 2));
writeFileSync(
  payoutDeploymentPath,
  JSON.stringify({ chainId: Number(chainId), address: payoutAddress }, null, 2)
);

console.log(`已写入 ABI -> ${payoutAbiPath}`);
console.log(`已写入部署信息 -> ${payoutDeploymentPath}`);
console.log(`PayoutManager chainId: ${chainId}, address: ${payoutAddress}, ABI entries: ${payoutAbi.length}`);

// 写 AirdropToken（如果存在）
if (airdropAddress && Array.isArray(airdropAbi)) {
  const airdropAbiPath = path.join(frontendConfigDir, "airdropToken.abi.json");
  const airdropDeploymentPath = path.join(frontendConfigDir, "airdropToken.deployment.json");
  writeFileSync(airdropAbiPath, JSON.stringify(airdropAbi, null, 2));
  writeFileSync(
    airdropDeploymentPath,
    JSON.stringify({ chainId: Number(chainId), address: airdropAddress }, null, 2)
  );
  console.log(`已写入 ABI -> ${airdropAbiPath}`);
  console.log(`已写入部署信息 -> ${airdropDeploymentPath}`);
  console.log(`AirdropToken chainId: ${chainId}, address: ${airdropAddress}, ABI entries: ${airdropAbi.length}`);
}
