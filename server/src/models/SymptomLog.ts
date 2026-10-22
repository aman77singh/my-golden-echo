import { Schema, model, Document, Types } from "mongoose";

export interface ISymptomLogDoc extends Document {
  userId: Types.ObjectId;
  coupleId: Types.ObjectId;
  date: string; // YYYY-MM-DD
  symptoms: string[];
  pain?: number;
  mood?: string;
  createdAt: Date;
  updatedAt: Date;
}

const symptomLogSchema = new Schema<ISymptomLogDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
    date: { type: String, required: true }, // Normalized YYYY-MM-DD string
    symptoms: { type: [String], default: [] },
    pain: { type: Number, min: 0, max: 10 },
    mood: { type: String },
  },
  { timestamps: true }
);

// Unique compound index on userId + date
symptomLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export const SymptomLog = model<ISymptomLogDoc>("SymptomLog", symptomLogSchema);
