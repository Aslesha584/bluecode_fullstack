import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['owner', 'member'], default: 'owner' },
  startupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Startup', default: null }
}, { timestamps: true, versionKey: false });

export default mongoose.model('User', userSchema);
