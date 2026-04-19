// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ERC2771Context} from "@openzeppelin/contracts/metatx/ERC2771Context.sol";

import "./interfaces/IBugBounty.sol";
import "./modules/Escrow.sol";
import "./modules/StakeManager.sol";
import "./modules/Reputation.sol";
import "./modules/DisputeModule.sol";

contract BugBountyPlatform is IBugBounty, ReentrancyGuard, ERC2771Context {
    using SafeERC20 for IERC20;

    uint256 public bountyCount;
    address public treasury;

    Escrow public escrow;
    StakeManager public stakeManager;
    Reputation public reputation;
    DisputeModule public disputeModule;

    mapping(uint256 => Bounty) private _bounties;
    mapping(uint256 => mapping(address => bool)) public isCommitteeMember;
    mapping(uint256 => mapping(address => uint256)) public activeReports;
    mapping(address => mapping(uint256 => uint256)) public userSubmissionIdx;
    mapping(uint256 => uint256) public reportCount;
    mapping(uint256 => mapping(uint256 => Report)) public reports;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasVoted;
    
    // Address => Bounty => Timestamps of submissions for Rate Limiting
    mapping(address => mapping(uint256 => uint64[])) public userSubmissions;

    modifier onlyBountyOwner(uint256 bountyId) {
        if (_msgSender() != _bounties[bountyId].owner) revert NotBountyOwner();
        _;
    }

    modifier onlyCommittee(uint256 bountyId) {
        if (!isCommitteeMember[bountyId][_msgSender()]) revert NotCommitteeMember();
        _;
    }

    constructor(address _treasury, address _trustedForwarder) ERC2771Context(_trustedForwarder) {
        treasury = _treasury;
        escrow = new Escrow();
        stakeManager = new StakeManager(_treasury);
        reputation = new Reputation();
        disputeModule = new DisputeModule();
    }

    function createBounty(
        address token,
        uint256 rewardAmount,
        uint256 stakeAmount,
        uint256 appealBond,
        uint64 submissionDeadline,
        uint32 reviewSLA,
        uint32 rateLimitWindow,
        uint16 stakeEscalationBps,
        uint8 maxInWindow,
        uint8 maxActiveSubmissions,
        address[] calldata committee,
        uint8 thresholdK,
        uint32 disputeCommitSeconds,
        uint32 disputeRevealSeconds,
        string calldata metadataCid,
        uint256 initialFund
    ) external returns (uint256 bountyId) {
        if (committee.length == 0) revert InvalidCommittee();
        if (thresholdK == 0 || thresholdK > committee.length) revert InvalidThreshold();
        if (submissionDeadline <= block.timestamp) revert SubmissionClosed();

        bountyId = bountyCount++;

        Bounty storage b = _bounties[bountyId];
        b.owner = _msgSender();
        b.submissionDeadline = submissionDeadline;
        b.reviewSLA = reviewSLA;
        b.token = IERC20(token);
        b.rateLimitWindow = rateLimitWindow;
        b.stakeEscalationBps = stakeEscalationBps;
        b.maxInWindow = maxInWindow;
        b.maxActiveSubmissions = maxActiveSubmissions;
        b.committeeSize = uint8(committee.length);
        b.thresholdK = thresholdK;
        b.disputeCommitSeconds = disputeCommitSeconds;
        b.disputeRevealSeconds = disputeRevealSeconds;
        b.active = true;
        b.rewardAmount = rewardAmount;
        b.stakeAmount = stakeAmount;
        b.escrowBalance = 0;
        b.appealBond = appealBond;
        b.metadataCidDigest = keccak256(abi.encodePacked(metadataCid));

        if (initialFund > 0) {
            b.token.safeTransferFrom(_msgSender(), address(escrow), initialFund);
            escrow.deposit(bountyId, initialFund);
            b.escrowBalance = initialFund;
        }

        for (uint256 i = 0; i < committee.length; i++) {
            address member = committee[i];
            if (member == address(0) || isCommitteeMember[bountyId][member]) revert InvalidCommittee();
            isCommitteeMember[bountyId][member] = true;
        }

        emit BountyCreated(
            bountyId,
            _msgSender(),
            token,
            rewardAmount,
            stakeAmount,
            appealBond,
            submissionDeadline,
            uint8(committee.length),
            thresholdK,
            metadataCid
        );

        if (initialFund > 0) {
            emit BountyFunded(bountyId, initialFund);
        }
    }

    function fundBounty(uint256 bountyId, uint256 amount) external onlyBountyOwner(bountyId) {
        Bounty storage b = _bounties[bountyId];
        b.token.safeTransferFrom(_msgSender(), address(escrow), amount);
        escrow.deposit(bountyId, amount);
        
        b.escrowBalance += amount;

        emit BountyFunded(bountyId, amount);
    }

    function getRequiredStake(uint256 bountyId, address user) public view returns (uint256) {
        Bounty storage b = _bounties[bountyId];
        if (b.stakeAmount == 0) return 0;
        
        int64 score = reputation.repScore(user);
        int256 mult = int256(10000) - (int256(score) * int256(uint256(b.stakeEscalationBps)));
        if (mult < 5000) mult = 5000;
        if (mult > 50000) mult = 50000;
        
        return (b.stakeAmount * uint256(mult)) / 10000;
    }

    function submitReport(
        uint256 bountyId,
        bytes32 salt,
        bytes32 cidDigest,
        bytes32 hSteps,
        bytes32 hImpact,
        bytes32 hPoc
    ) external nonReentrant returns (uint256 reportId) {
        Bounty storage b = _bounties[bountyId];

        if (!b.active) revert BountyInactive();
        if (block.timestamp > b.submissionDeadline) revert SubmissionClosed();
        if (b.escrowBalance < b.rewardAmount) revert InsufficientEscrow(); // Solvency logic
        if (hSteps == bytes32(0) || hImpact == bytes32(0) || hPoc == bytes32(0)) revert InvalidReport(); // Structure hash logic

        if (activeReports[bountyId][_msgSender()] >= b.maxActiveSubmissions) revert RateLimitExceeded();

        // Anti-spam: Rate limiting check using Ring Buffer
        uint64[] storage subs = userSubmissions[_msgSender()][bountyId];
        if (subs.length < b.maxInWindow) {
            subs.push(uint64(block.timestamp));
        } else {
            uint256 idx = userSubmissionIdx[_msgSender()][bountyId] % (b.maxInWindow > 0 ? b.maxInWindow : 1);
            if (subs[idx] + b.rateLimitWindow > block.timestamp) revert RateLimitExceeded();
            subs[idx] = uint64(block.timestamp);
            userSubmissionIdx[_msgSender()][bountyId] = (idx + 1) % b.maxInWindow;
        }

        activeReports[bountyId][_msgSender()]++;

        // Security: Secure domain-separated commit hash
        bytes32 commitHash = keccak256(abi.encodePacked(bountyId, _msgSender(), cidDigest, salt, hSteps, hImpact, hPoc));

        // Security: Escalating stake via Reputation
        uint256 actualStake = getRequiredStake(bountyId, _msgSender());

        reportId = reportCount[bountyId]++;

        reports[bountyId][reportId] = Report({
            researcher: _msgSender(),
            submittedAt: uint64(block.timestamp),
            paid: false,
            status: ReportStatus.Submitted,
            acceptVotes: 0,
            rejectVotes: 0,
            commitHash: commitHash,
            cidDigest: cidDigest,
            hSteps: hSteps,
            hImpact: hImpact,
            hPoc: hPoc,
            stakeAmount: actualStake
        });

        if (actualStake > 0) {
            b.token.safeTransferFrom(_msgSender(), address(this), actualStake);
            b.token.safeIncreaseAllowance(address(stakeManager), actualStake);
            stakeManager.lockStake(reportId, b.token, actualStake, address(this));
        }

        emit ReportCommitted(bountyId, reportId, _msgSender(), commitHash, cidDigest, hSteps, hImpact, hPoc, actualStake);
    }

    function voteReport(uint256 bountyId, uint256 reportId, bool accepted) external nonReentrant onlyCommittee(bountyId) {
        Report storage r = reports[bountyId][reportId];
        Bounty storage b = _bounties[bountyId];

        if (r.researcher == address(0)) revert InvalidReport();
        if (r.status != ReportStatus.Submitted) revert ReportNotSubmittable();
        if (block.timestamp > r.submittedAt + b.reviewSLA) revert DeadlinePassed();
        if (hasVoted[bountyId][reportId][_msgSender()]) revert AlreadyVoted();

        hasVoted[bountyId][reportId][_msgSender()] = true;

        if (accepted) {
            r.acceptVotes += 1;
            if (r.acceptVotes >= b.thresholdK) {
                r.status = ReportStatus.Accepted;
                activeReports[bountyId][r.researcher]--;
                emit ReportAccepted(bountyId, reportId);
            }
        } else {
            r.rejectVotes += 1;
            if (r.rejectVotes >= b.thresholdK) {
                r.status = ReportStatus.Rejected;
                activeReports[bountyId][r.researcher]--;
                emit ReportRejected(bountyId, reportId);
            }
        }

        emit ReportVoted(bountyId, reportId, _msgSender(), accepted);
    }
    
    function raiseDispute(uint256 bountyId, uint256 reportId) external nonReentrant {
        Report storage r = reports[bountyId][reportId];
        Bounty storage b = _bounties[bountyId];
        if (_msgSender() != r.researcher) revert NotAuthorized();
        if (r.status != ReportStatus.Submitted && r.status != ReportStatus.Rejected) revert ReportNotDisputable();
        
        // Anti-spam: Require appeal bond
        if (b.appealBond > 0) {
            b.token.safeTransferFrom(_msgSender(), address(escrow), b.appealBond);
            escrow.deposit(bountyId, b.appealBond);
        }

        if (r.status == ReportStatus.Rejected) {
            activeReports[bountyId][r.researcher]++;
        }
        r.status = ReportStatus.Disputed;
        disputeModule.raiseDispute(reportId, b.disputeCommitSeconds, b.disputeRevealSeconds);
        emit DisputeOpened(bountyId, reportId, false);
    }

    function triggerEscalation(uint256 bountyId, uint256 reportId) external nonReentrant {
        Report storage r = reports[bountyId][reportId];
        Bounty storage b = _bounties[bountyId];

        if (r.status != ReportStatus.Submitted) revert ReportNotDisputable();
        if (block.timestamp <= r.submittedAt + b.reviewSLA) revert SLANotExpired(); 

        r.status = ReportStatus.Disputed;
        disputeModule.raiseDispute(reportId, b.disputeCommitSeconds, b.disputeRevealSeconds);
        emit DisputeOpened(bountyId, reportId, true);
    }

    function commitVote(uint256 bountyId, uint256 reportId, bytes32 commitHash) external nonReentrant onlyCommittee(bountyId) {
        Report storage r = reports[bountyId][reportId];
        if (r.status != ReportStatus.Disputed) revert ReportNotDisputable();
        disputeModule.commitVote(reportId, _msgSender(), commitHash);
        emit VoteCommitted(bountyId, reportId, _msgSender());
    }

    function revealVote(uint256 bountyId, uint256 reportId, bool vote, string calldata salt) external nonReentrant onlyCommittee(bountyId) {
        Report storage r = reports[bountyId][reportId];
        if (r.status != ReportStatus.Disputed) revert ReportNotDisputable();
        disputeModule.revealVote(reportId, _msgSender(), vote, salt);
        emit VoteRevealed(bountyId, reportId, _msgSender(), vote);
    }

    function resolveDispute(uint256 bountyId, uint256 reportId) external nonReentrant {
        Report storage r = reports[bountyId][reportId];
        Bounty storage b = _bounties[bountyId];
        if (r.status != ReportStatus.Disputed) revert ReportNotDisputable();

        (ReportStatus resolvedStatus, address[] memory nonRevealers) = disputeModule.resolveDispute(reportId, b.thresholdK);
        
        // CEI Pattern: perform state logic before external calls
        r.status = resolvedStatus;
        activeReports[bountyId][r.researcher]--;

        for (uint256 i = 0; i < nonRevealers.length; i++) {
            reputation.penalizeNonReveal(nonRevealers[i]);
        }

        if (resolvedStatus == ReportStatus.Accepted) {
            reputation.addDisputeWon(r.researcher);
            reputation.addDisputeLost(b.owner);
            if (b.appealBond > 0) escrow.release(bountyId, b.token, r.researcher, b.appealBond);
        } else {
            reputation.addDisputeLost(r.researcher);
            reputation.addDisputeWon(b.owner);
            if (b.appealBond > 0) escrow.release(bountyId, b.token, treasury, b.appealBond);
        }

        emit DisputeFinalized(bountyId, reportId, resolvedStatus);
        _finalize(bountyId, reportId, resolvedStatus);
    }

    function finalizeReport(uint256 bountyId, uint256 reportId) external nonReentrant {
        Report storage r = reports[bountyId][reportId];
        if (r.status != ReportStatus.Accepted && r.status != ReportStatus.Rejected) {
            revert ReportNotFinalizable();
        }
        _finalize(bountyId, reportId, r.status);
    }

    function _finalize(uint256 bountyId, uint256 reportId, ReportStatus finalStatus) internal {
        Report storage r = reports[bountyId][reportId];
        Bounty storage b = _bounties[bountyId];

        if (r.paid) revert AlreadyPaid();

        r.paid = true;
        r.status = ReportStatus.Finalized;

        if (finalStatus == ReportStatus.Accepted) {
            if (b.escrowBalance < b.rewardAmount) revert InsufficientEscrow();
            b.escrowBalance -= b.rewardAmount;
            
            reputation.addAccepted(r.researcher);

            if (b.rewardAmount > 0) {
                escrow.release(bountyId, b.token, r.researcher, b.rewardAmount);
            }
            if (r.stakeAmount > 0) {
                stakeManager.refundStake(reportId, b.token, r.researcher);
            }

            emit ReportFinalized(bountyId, reportId, ReportStatus.Accepted);
        } else {
            reputation.addRejected(r.researcher);

            if (r.stakeAmount > 0) {
                stakeManager.slashStake(reportId, b.token);
            }

            emit ReportFinalized(bountyId, reportId, ReportStatus.Rejected);
        }
    }

    function getBountyCore(uint256 bountyId) external view returns (
        address owner,
        IERC20 token,
        uint256 rewardAmount,
        uint256 stakeAmount,
        uint256 appealBond,
        uint64 submissionDeadline,
        uint32 reviewSLA,
        uint32 rateLimitWindow,
        uint16 stakeEscalationBps,
        uint8 maxInWindow,
        bytes32 metadataCidDigest
    ) {
        Bounty storage b = _bounties[bountyId];
        return (
            b.owner,
            b.token,
            b.rewardAmount,
            b.stakeAmount,
            b.appealBond,
            b.submissionDeadline,
            b.reviewSLA,
            b.rateLimitWindow,
            b.stakeEscalationBps,
            b.maxInWindow,
            b.metadataCidDigest
        );
    }

    function getBountyState(uint256 bountyId) external view returns (
        uint8 maxActiveSubmissions,
        uint8 committeeSize,
        uint8 thresholdK,
        uint32 disputeCommitSeconds,
        uint32 disputeRevealSeconds,
        bool active,
        uint256 escrowBalance
    ) {
        Bounty storage b = _bounties[bountyId];
        return (
            b.maxActiveSubmissions,
            b.committeeSize,
            b.thresholdK,
            b.disputeCommitSeconds,
            b.disputeRevealSeconds,
            b.active,
            b.escrowBalance
        );
    }
}
