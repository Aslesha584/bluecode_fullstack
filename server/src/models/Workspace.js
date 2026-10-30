import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  state: { type: mongoose.Schema.Types.Mixed, default: {} },
  schemaVersion: { type: Number, default: 1 }
}, { timestamps: true, versionKey: false, minimize: false });

export default mongoose.model('Workspace', workspaceSchema);
