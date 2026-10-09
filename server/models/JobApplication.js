const mongoose = require('mongoose');

const STATUSES = ['Applied', 'Assessment', 'Interview', 'Offer', 'Rejected'];

const jobApplicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    company: { type: String, required: true, trim: true, maxlength: 150 },
    role: { type: String, required: true, trim: true, maxlength: 150 },
    jobUrl: { type: String, trim: true, maxlength: 500, default: '' },
    appliedDate: { type: Date, required: true },
    status: { type: String, enum: STATUSES, default: 'Applied' },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('JobApplication', jobApplicationSchema);
module.exports.STATUSES = STATUSES;
