import mongoose from "mongoose";
import crypto from "crypto";

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["admin", "member"],
          default: "member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    inviteCode: {
      type: String,
      unique: true,
      index: true,
    },
  },
  { timestamps: true }
);

groupSchema.pre("validate", function () {
  if (!this.inviteCode) {
    this.inviteCode = crypto.randomBytes(5).toString("hex").toUpperCase();
  }
});

const Group = mongoose.model("Group", groupSchema);

export default Group;