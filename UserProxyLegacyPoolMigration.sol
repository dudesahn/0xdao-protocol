// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./UserProxyStorageLayout.sol";
import "./UserProxyLpInteractions.sol";

/**
 * @title UserProxyLegacyPoolMigration
 * @author 0xDAO
 * @notice Core logic for all user LP migration from legacy pools
 * @dev All implementations must inherit from UserProxyStorageLayout and UserProxyLpInteractions
 */
contract UserProxyLegacyPoolMigration is
    UserProxyLpInteractions
{
    using SafeERC20 for IERC20;

    /*******************************************************
     *                     LP Interactions
     *******************************************************/

    function migrateAll(bool restake) external {
        address[] memory stakingPools = new address[](stakingPoolsLength);
        uint256 j = 0;
        for (uint256 i; i < stakingPoolsLength; i++) {
            IMultiRewards multiRewards = IMultiRewards(
                stakingAddressByIndex[i]
            );
            IOxPool oxPool = IOxPool(multiRewards.stakingToken());
            address solidPoolAddress = oxPool.solidPoolAddress();
            if (oxLens.oxPoolBySolidPool(solidPoolAddress) != address(oxPool)) {
                stakingPools[j] = address(oxPool);
                j++;
            }
        }
        migrate(stakingPools, restake);
    }

    /**
    @notice Migrates legacy oxPools to new oxPools or transfers back to owner if new oxPool is not found
    * 
    */
    function migrate(address[] memory legacyOxPools, bool restake) public {
        for (uint256 i; i < legacyOxPools.length; i++) {
            // Break loop if address is empty
            if (legacyOxPools[i] == address(0)) {
                break;
            }

            // Set up addresses and interfaces
            IOxPool legacyPool = IOxPool(legacyOxPools[i]);
            address legacyStakingAddress = legacyPool.stakingAddress();
            IMultiRewards legacyMultiRewards = IMultiRewards(
                legacyStakingAddress
            );
            address solidPoolAddress = legacyPool.solidPoolAddress();
            IERC20 solidPool = IERC20(solidPoolAddress);

            // Unstake from legacyMultiRewards
            uint256 stakedBalance = legacyMultiRewards.balanceOf(address(this));
            if (stakedBalance > 0) {
                legacyMultiRewards.withdraw(stakedBalance);
            }

            // Claim rewards
            claimStakingRewards(legacyStakingAddress);

            // Unstake from legacyPool
            uint256 legacyPoolBalance = legacyPool.balanceOf(address(this));

            if (legacyPoolBalance > 0) {
                legacyPool.withdrawLp(legacyPoolBalance);
            }

            // Register withdrawal
            registerUnstake(legacyStakingAddress);

            // If new oxPool exists, stake into new oxPool
            if (
                oxLens.oxPoolBySolidPool(legacyPool.solidPoolAddress()) !=
                address(0) &&
                restake
            ) {
                uint256 amount = solidPool.balanceOf(address(this));

                if (amount > 0) {
                    address oxPoolAddress = oxLens.oxPoolBySolidPool(
                        solidPoolAddress
                    );
                    IOxPool oxPool = IOxPool(oxPoolAddress);

                    // Transfer Solidly LP to ox pool to receive Ox pool LP receipt token
                    solidPool.approve(oxPoolAddress, amount);
                    oxPool.depositLp(amount);

                    // Save staking balance
                    address stakingAddress = oxPool.stakingAddress();

                    // Stake oxLP in multirewards
                    oxPool.approve(stakingAddress, amount);
                    IMultiRewards(stakingAddress).stake(amount);

                    // Register deposit
                    registerStake(stakingAddress);
                }
            }

            //transfer solidPool to owner if no pool or not restaking
            uint256 solidPoolBalance = solidPool.balanceOf(address(this));
            if (solidPoolBalance > 0) {
                solidPool.safeTransfer(
                    ownerAddress,
                    solidPool.balanceOf(address(this))
                );
            }
        }
    }
}
