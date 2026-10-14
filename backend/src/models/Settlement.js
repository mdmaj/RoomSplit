import mongoose from "mongoose";

const settlementSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },

    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    paidTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    amountPaise: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: "Amount must be a whole number of paise.",
      },
    },

    // Month this settlement belongs to, e.g. "2026-10".
    // Optional so older settlement records remain valid.
    month: {
      type: String,
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, "Month must use YYYY-MM format."],
      default: undefined,
    },

    note: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    status: {
      type: String,
      enum: ["completed"],
      default: "completed",
    },
  },
  { timestamps: true },
);

settlementSchema.index({ groupId: 1, createdAt: -1 });
settlementSchema.index({ groupId: 1, month: 1 });

const Settlement = mongoose.model("Settlement", settlementSchema);

export default Settlement;
