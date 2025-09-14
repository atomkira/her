import mongoose from 'mongoose'

const CalendarTaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    category: { 
      type: String, 
      enum: ['study', 'food', 'chores', 'exercise', 'other'], 
      default: 'study' 
    },
    date: { type: String, required: true }, // YYYY-MM-DD format
    time: { type: String, required: true }, // HH:MM format
    endTime: { type: String, default: '' }, // HH:MM format
    priority: { 
      type: String, 
      enum: ['high', 'medium', 'low'], 
      default: 'medium' 
    },
    completed: { type: Boolean, default: false },
    notificationSent: { type: Boolean, default: false },
    userId: { type: String, default: 'default' } // For future multi-user support
  },
  { timestamps: true }
)

// Index for efficient querying by date
CalendarTaskSchema.index({ date: 1, userId: 1 })

export default mongoose.model('CalendarTask', CalendarTaskSchema)
