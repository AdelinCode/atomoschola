import mongoose from 'mongoose';

const pendingRequestSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['domain', 'category', 'lesson'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  reviewNote: {
    type: String
  }
}, {
  timestamps: true
});

const PendingRequest = mongoose.model('PendingRequest', pendingRequestSchema);

export default PendingRequest;
