// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {BugBountyPlatform} from "../src/BugBountyPlatform.sol";
import {MockUSDC} from "../src/MockUSDC.sol"; // We assume a MockERC20 exists or we deploy one

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        MockUSDC usdc = new MockUSDC(msg.sender);
        BugBountyPlatform platform = new BugBountyPlatform(treasury);

        vm.stopBroadcast();
    }
}
