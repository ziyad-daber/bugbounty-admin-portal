// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Reputation {
    address public platform;

    struct UserReputation {
        uint256 acceptedReports;
        uint256 rejectedReports;
        uint256 disputesWon;
        uint256 disputesLost;
        int64 repScoreCached;
        uint64 lastUpdate;
    }

    event ReputationPenalized(address indexed user, string reason);

    mapping(address => UserReputation) public reputations;

    error Unauthorized();

    modifier onlyPlatform() {
        if (msg.sender != platform) revert Unauthorized();
        _;
    }

    constructor() {
        platform = msg.sender;
    }

    function addAccepted(address user) external onlyPlatform {
        reputations[user].acceptedReports++;
        _updateRepScore(user, 3);
    }

    function addRejected(address user) external onlyPlatform {
        reputations[user].rejectedReports++;
        _updateRepScore(user, -2);
    }

    function addDisputeWon(address user) external onlyPlatform {
        reputations[user].disputesWon++;
        _updateRepScore(user, 2);
    }

    function addDisputeLost(address user) external onlyPlatform {
        reputations[user].disputesLost++;
        _updateRepScore(user, -3);
    }

    function penalizeNonReveal(address user) external onlyPlatform {
        _updateRepScore(user, -2);
        emit ReputationPenalized(user, "Failed to reveal vote");
    }

    function repScore(address user) public view returns (int64) {
        UserReputation storage r = reputations[user];
        if (r.lastUpdate == 0) return 0;
        
        int64 currentScore = r.repScoreCached;
        if (block.timestamp > r.lastUpdate) {
            uint256 dt = block.timestamp - r.lastUpdate;
            uint256 halfLives = dt / 90 days;
            if (halfLives > 0) {
                if (halfLives >= 64) {
                    currentScore = 0;
                } else {
                    currentScore = currentScore / int64(uint64(1) << uint64(halfLives));
                }
            }
        }
        return currentScore;
    }

    function _updateRepScore(address user, int64 delta) internal {
        reputations[user].repScoreCached = repScore(user) + delta;
        reputations[user].lastUpdate = uint64(block.timestamp);
    }
}
