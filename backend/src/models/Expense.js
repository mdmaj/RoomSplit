
import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
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

    category: {
      type: String,
      enum: [
        "Rent",
        "Groceries",
        "Electricity",
        "Internet",
        "Food",
        "Transport",
        "Cleaning",
        "Other",
      ],
      default: "Other",
    },

    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        sharePaise: {
          type: Number,
          required: true,
          min: 0,
          validate: {
            validator: Number.isSafeInteger,
            message: "Share must be a whole number of paise.",
          },
        },
      },
    ],

    date: {
      type: Date,
      default: Date.now,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  { timestamps: true }
);

expenseSchema.index({ groupId: 1, date: -1 });

const Expense = mongoose.model("Expense", expenseSchema);

export default Expense;