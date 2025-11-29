import { ethers } from "hardhat";

async function main() {
    const PayoutManager = await ethers.getContractFactory("PayoutManager");
    const payoutManager = await PayoutManager.deploy();

    await payoutManager.waitForDeployment();

    console.log("PayoutManager deployed to:", await payoutManager.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
