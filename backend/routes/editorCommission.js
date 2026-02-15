import express from 'express';
import User from '../models/User.js';
import EditProposal from '../models/EditProposal.js';
import ApprovedEdit from '../models/ApprovedEdit.js';
import Notification from '../models/Notification.js';
import Lesson from '../models/Lesson.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/editor-commission/members
// @desc    Get all editor commission members
// @access  Public
router.get('/members', async (req, res) => {
  try {
    const members = await User.find({ isEditorCommissionMember: true })
      .select('username email firstName lastName userType')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      count: members.length,
      data: members
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/editor-commission/toggle/:userId
// @desc    Toggle editor commission membership (owner only)
// @access  Private/Owner
router.put('/toggle/:userId', protect, authorize('owner'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Check if user is creator, editor, or staff
    if (!['creator', 'editor', 'staff'].includes(user.userType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Only creators, editors, and staff can be editor commission members' 
      });
    }

    // Check commission size limit
    if (!user.isEditorCommissionMember) {
      const currentCount = await User.countDocuments({ isEditorCommissionMember: true });
      if (currentCount >= 7) {
        return res.status(400).json({ 
          success: false, 
          message: 'Editor commission is full (maximum 7 members)' 
        });
      }
    }

    user.isEditorCommissionMember = !user.isEditorCommissionMember;
    await user.save();

    res.json({
      success: true,
      message: user.isEditorCommissionMember ? 'User added to editor commission' : 'User removed from editor commission',
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/editor-commission/propose
// @desc    Submit edit proposal (users only)
// @access  Private
router.post('/propose', protect, async (req, res) => {
  try {
    const { edits } = req.body;

    // Validate exactly 3 edits
    if (!edits || edits.length !== 3) {
      return res.status(400).json({ 
        success: false, 
        message: 'You must propose exactly 3 edits' 
      });
    }

    // Validate each edit
    for (const edit of edits) {
      if (!edit.lesson || !edit.editDescription || !edit.editContent) {
        return res.status(400).json({ 
          success: false, 
          message: 'Each edit must have lesson, description, and content' 
        });
      }

      // Check if lesson exists
      const lesson = await Lesson.findById(edit.lesson);
      if (!lesson) {
        return res.status(404).json({ 
          success: false, 
          message: `Lesson not found: ${edit.lesson}` 
        });
      }
    }

    const proposal = await EditProposal.create({
      proposedBy: req.user._id,
      edits,
      status: 'pending'
    });

    const populated = await EditProposal.findById(proposal._id)
      .populate('proposedBy', 'username email')
      .populate('edits.lesson', 'title');

    res.status(201).json({
      success: true,
      message: 'Edit proposal submitted for review',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/editor-commission/proposals
// @desc    Get pending edit proposals
// @access  Private (editor commission members only)
router.get('/proposals', protect, async (req, res) => {
  try {
    // Check if user is editor commission member
    if (!req.user.isEditorCommissionMember) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Editor commission members only.' 
      });
    }

    const proposals = await EditProposal.find({ status: 'pending' })
      .populate('proposedBy', 'username email firstName lastName')
      .populate({
        path: 'edits.lesson',
        select: 'title slug',
        populate: {
          path: 'category',
          select: 'name slug',
          populate: {
            path: 'domain',
            select: 'name slug',
            populate: {
              path: 'subject',
              select: 'name slug'
            }
          }
        }
      })
      .populate('votes.user', 'username')
      .sort('-createdAt');

    res.json({
      success: true,
      data: proposals
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/editor-commission/vote/:proposalId
// @desc    Vote on edit proposal
// @access  Private (editor commission members only)
router.post('/vote/:proposalId', protect, async (req, res) => {
  try {
    // Check if user is editor commission member
    if (!req.user.isEditorCommissionMember) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Editor commission members only.' 
      });
    }

    const { vote } = req.body;

    if (!['yes', 'no'].includes(vote)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vote must be "yes" or "no"' 
      });
    }

    const proposal = await EditProposal.findById(req.params.proposalId);

    if (!proposal) {
      return res.status(404).json({ 
        success: false, 
        message: 'Proposal not found' 
      });
    }

    if (proposal.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Proposal already processed' 
      });
    }

    // Check if user already voted
    const existingVote = proposal.votes.find(
      v => v.user.toString() === req.user._id.toString()
    );

    if (existingVote) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already voted on this proposal' 
      });
    }

    // Add vote
    proposal.votes.push({
      user: req.user._id,
      vote: vote,
      votedAt: new Date()
    });

    await proposal.save();

    // Check if all editor commission members have voted
    const commissionCount = await User.countDocuments({ isEditorCommissionMember: true });
    
    if (proposal.votes.length >= commissionCount) {
      // Count votes
      const yesVotes = proposal.votes.filter(v => v.vote === 'yes').length;
      const noVotes = proposal.votes.filter(v => v.vote === 'no').length;

      // Majority decision
      if (yesVotes > noVotes) {
        // Approve proposal
        proposal.status = 'approved';
        proposal.reviewedAt = new Date();
        proposal.reviewNote = `Approved by editor commission vote (${yesVotes}-${noVotes})`;
        await proposal.save();

        // Save approved edits
        for (const edit of proposal.edits) {
          await ApprovedEdit.create({
            proposedBy: proposal.proposedBy,
            lesson: edit.lesson,
            editDescription: edit.editDescription,
            editContent: edit.editContent,
            approvedAt: new Date(),
            votes: { yes: yesVotes, no: noVotes }
          });
        }

        // Promote user to editor
        const user = await User.findById(proposal.proposedBy);
        if (user && user.userType === 'user') {
          user.userType = 'editor';
          await user.save();

          // Create notification about promotion
          await Notification.create({
            user: proposal.proposedBy,
            type: 'lesson_approved',
            title: 'Promoted to Editor!',
            message: `Congratulations! Your edit proposals were approved and you have been promoted to Editor! (Vote: ${yesVotes}-${noVotes})`,
            isRead: false
          });
        } else {
          // Just notify about approval
          await Notification.create({
            user: proposal.proposedBy,
            type: 'lesson_approved',
            title: 'Edit Proposals Approved',
            message: `Your edit proposals have been approved by the editor commission! (Vote: ${yesVotes}-${noVotes})`,
            isRead: false
          });
        }

        return res.json({
          success: true,
          message: 'Proposal approved by editor commission',
          status: 'approved',
          votes: { yes: yesVotes, no: noVotes }
        });
      } else {
        // Reject proposal
        proposal.status = 'rejected';
        proposal.reviewedAt = new Date();
        proposal.reviewNote = `Rejected by editor commission vote (${yesVotes}-${noVotes})`;
        await proposal.save();

        // Create notification
        await Notification.create({
          user: proposal.proposedBy,
          type: 'lesson_rejected',
          title: 'Edit Proposals Rejected',
          message: `Your edit proposals were rejected by the editor commission. (Vote: ${yesVotes}-${noVotes})`,
          isRead: false
        });

        return res.json({
          success: true,
          message: 'Proposal rejected by editor commission',
          status: 'rejected',
          votes: { yes: yesVotes, no: noVotes }
        });
      }
    }

    res.json({
      success: true,
      message: 'Vote recorded',
      votesCount: proposal.votes.length,
      totalNeeded: commissionCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/editor-commission/approved-edits
// @desc    Get approved edits
// @access  Private (editor commission members only)
router.get('/approved-edits', protect, async (req, res) => {
  try {
    // Check if user is editor commission member
    if (!req.user.isEditorCommissionMember) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Editor commission members only.' 
      });
    }

    const edits = await ApprovedEdit.find()
      .populate('proposedBy', 'username email')
      .populate({
        path: 'lesson',
        select: 'title slug',
        populate: {
          path: 'category',
          select: 'name slug',
          populate: {
            path: 'domain',
            select: 'name slug',
            populate: {
              path: 'subject',
              select: 'name slug'
            }
          }
        }
      })
      .sort('-approvedAt');

    res.json({
      success: true,
      data: edits
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/editor-commission/approved-edits/:editId
// @desc    Delete approved edit
// @access  Private (editor commission members only)
router.delete('/approved-edits/:editId', protect, async (req, res) => {
  try {
    // Check if user is editor commission member
    if (!req.user.isEditorCommissionMember) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Editor commission members only.' 
      });
    }

    const edit = await ApprovedEdit.findById(req.params.editId);

    if (!edit) {
      return res.status(404).json({ 
        success: false, 
        message: 'Edit not found' 
      });
    }

    await edit.deleteOne();

    res.json({
      success: true,
      message: 'Edit deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
