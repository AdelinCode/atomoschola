import express from 'express';
import PendingRequest from '../models/PendingRequest.js';
import Subject from '../models/Subject.js';
import Domain from '../models/Domain.js';
import Category from '../models/Category.js';
import Lesson from '../models/Lesson.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/pending-requests
// @desc    Create a pending request (domain, category, or lesson)
// @access  Private (creator, editor, owner)
router.post('/', protect, authorize('creator', 'editor', 'owner'), async (req, res) => {
  try {
    const { type, data } = req.body;

    const pendingRequest = await PendingRequest.create({
      type,
      data,
      requestedBy: req.user._id,
      status: 'pending'
    });

    const populated = await PendingRequest.findById(pendingRequest._id)
      .populate('requestedBy', 'username email firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Request submitted for approval',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/pending-requests
// @desc    Get all pending requests
// @access  Private (owner only)
router.get('/', protect, authorize('owner'), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : { status: 'pending' };

    const requests = await PendingRequest.find(filter)
      .populate('requestedBy', 'username email firstName lastName userType')
      .populate('reviewedBy', 'username email')
      .sort('-createdAt');

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/pending-requests/:id/approve
// @desc    Approve a pending request
// @access  Private (owner only)
router.put('/:id/approve', protect, authorize('owner'), async (req, res) => {
  try {
    const request = await PendingRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    // Create the actual resource based on type
    let createdResource;

    if (request.type === 'domain') {
      const domain = await Domain.create(request.data);
      
      // Add to subject
      if (request.data.subject) {
        await Subject.findByIdAndUpdate(request.data.subject, {
          $push: { domains: domain._id }
        });
      }
      
      createdResource = domain;
    } else if (request.type === 'category') {
      const category = await Category.create(request.data);
      
      // Add to domain
      if (request.data.domain) {
        await Domain.findByIdAndUpdate(request.data.domain, {
          $push: { categories: category._id }
        });
      }
      
      createdResource = category;
    } else if (request.type === 'lesson') {
      const lesson = await Lesson.create(request.data);
      
      // Add to category
      if (request.data.category) {
        await Category.findByIdAndUpdate(request.data.category, {
          $push: { lessons: lesson._id }
        });
      }
      
      createdResource = lesson;
    }

    // Update request status
    request.status = 'approved';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.reviewNote = req.body.note || '';
    await request.save();

    res.json({
      success: true,
      message: `${request.type} approved and created successfully`,
      data: {
        request,
        created: createdResource
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/pending-requests/:id/reject
// @desc    Reject a pending request
// @access  Private (owner only)
router.put('/:id/reject', protect, authorize('owner'), async (req, res) => {
  try {
    const request = await PendingRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    request.status = 'rejected';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.reviewNote = req.body.note || '';
    await request.save();

    res.json({
      success: true,
      message: 'Request rejected',
      data: request
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
