const mongoose = require('mongoose');

const emailQueueSchema = new Schema({
  recipientEmail: {
    type: String,
    required: true,
    lowercase: true
  },
  recipientName: String,
  subject: {
    type: String,
    required: true
  },
  htmlBody: {
    type: String,
    required: true
  },
  textBody: String,
  templateName: String,
  templateData: {
    type: Map,
    of: Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending',
    index: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  errorMessage: String,
  scheduledAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  sentAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'email_queue'
});

emailQueueSchema.index({ status: 1, scheduledAt: 1 });

module.exports = mongoose.model('EmailQueue', emailQueueSchema);
