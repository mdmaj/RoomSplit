import mongoose from "mongoose";
import Expense from "../models/Expense.js";
import Group from "../models/Group.js";

// Check whether a user belongs to the group.
const isMember = (group, userId) =>
  group.members.some((member) => {
    const memberUserId = member.user?._id ?? member.user;
    return memberUserId?.toString() === userId?.toString();
  });

// Add a new expense.
export const createExpense = async (req, res) => {
  try {
    const { title, amount, category, paidBy, participants, date, notes } =
      req.body;

    const { groupId } = req.params;

    // Validate group ID.
    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group ID.",
      });
    }

    // Validate title.
    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Title is required and must not exceed 100 characters.",
      });
    }

    // Validate amount in rupees, allowing at most 2 decimal places.
    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isSafeInteger(Math.round(amount * 100)) ||
      Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7
    ) {
      return res.status(400).json({
        success: false,
        message: "Amount must be positive and have at most 2 decimal places.",
      });
    }

    // Validate category.
    const allowedCategories = [
      "Rent",
      "Groceries",
      "Electricity",
      "Internet",
      "Food",
      "Transport",
      "Cleaning",
      "Other",
    ];

    const expenseCategory = category?.trim() || "Other";

    if (!allowedCategories.includes(expenseCategory)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid expense category.",
      });
    }

    // Validate notes.
    if (
      notes !== undefined &&
      notes !== null &&
      (typeof notes !== "string" || notes.length > 500)
    ) {
      return res.status(400).json({
        success: false,
        message: "Notes must not exceed 500 characters.",
      });
    }

    // Validate date.
    let expenseDate = new Date();

    if (date !== undefined && date !== null && date !== "") {
      expenseDate = new Date(date);

      if (Number.isNaN(expenseDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid expense date.",
        });
      }
    }

    // Find group.
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found.",
      });
    }

    // Verify that the current user belongs to the group.
    if (!isMember(group, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group.",
      });
    }

    const memberIds = new Set(
      group.members.map((member) => {
        const memberUserId = member.user?._id ?? member.user;
        return memberUserId.toString();
      }),
    );

    // Default payer is the logged-in user.
    const payerId =
      paidBy === undefined || paidBy === null || paidBy === ""
        ? req.user._id.toString()
        : String(paidBy);

    if (!mongoose.isValidObjectId(payerId) || !memberIds.has(payerId)) {
      return res.status(400).json({
        success: false,
        message: "The payer must be a valid member of this group.",
      });
    }

    // Participants are optional for new expenses.
    // If supplied by an older client, preserve the existing split behavior.
    let splitParticipants = [];

    if (participants !== undefined && participants !== null) {
      if (!Array.isArray(participants)) {
        return res.status(400).json({
          success: false,
          message: "Participants must be an array.",
        });
      }

      const participantIds = participants.map((id) => String(id));

      if (
        participantIds.some(
          (id) => !mongoose.isValidObjectId(id) || !memberIds.has(id),
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Every participant must be a member of this group.",
        });
      }

      if (new Set(participantIds).size !== participantIds.length) {
        return res.status(400).json({
          success: false,
          message: "Duplicate participants are not allowed.",
        });
      }

      // Divide in paise to avoid floating-point money errors.
      const amountPaise = Math.round(amount * 100);
      const baseShare =
        participantIds.length > 0
          ? Math.floor(amountPaise / participantIds.length)
          : 0;
      const remainder =
        participantIds.length > 0 ? amountPaise % participantIds.length : 0;

      splitParticipants = participantIds.map((user, index) => ({
        user,
        sharePaise: baseShare + (index < remainder ? 1 : 0),
      }));
    }

    // Create expense. The full amount is attributed to the actual payer.
    const expense = await Expense.create({
      groupId,
      title: title.trim(),
      amountPaise: Math.round(amount * 100),
      category: expenseCategory,
      paidBy: payerId,
      participants: splitParticipants,
      date: expenseDate,
      notes: notes?.trim() || "",
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate("paidBy", "name email")
      .populate("participants.user", "name email");

    return res.status(201).json({
      success: true,
      message: "Expense created successfully.",
      expense: populatedExpense,
    });
  } catch (error) {
    console.error("Create expense error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create expense.",
    });
  }
};

// Get all expenses for a group.
export const getGroupExpenses = async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group ID.",
      });
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found.",
      });
    }

    if (!isMember(group, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group.",
      });
    }

    const expenses = await Expense.find({ groupId })
      .populate("paidBy", "name email")
      .populate("participants.user", "name email")
      .sort({ date: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: expenses.length,
      expenses,
    });
  } catch (error) {
    console.error("Get expenses error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch expenses.",
    });
  }
};

// Get one expense.
export const getExpenseById = async (req, res) => {
  try {
    const { expenseId } = req.params;

    if (!mongoose.isValidObjectId(expenseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID.",
      });
    }

    const expense = await Expense.findById(expenseId)
      .populate("paidBy", "name email")
      .populate("participants.user", "name email");

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found.",
      });
    }

    const group = await Group.findById(expense.groupId);

    if (!group || !isMember(group, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this expense.",
      });
    }

    return res.status(200).json({
      success: true,
      expense,
    });
  } catch (error) {
    console.error("Get expense error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch expense.",
    });
  }
};

// Delete an expense: payer or group creator only.
export const deleteExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;

    if (!mongoose.isValidObjectId(expenseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID.",
      });
    }

    const expense = await Expense.findById(expenseId);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found.",
      });
    }

    const group = await Group.findById(expense.groupId);

    if (!group || !isMember(group, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this expense.",
      });
    }

    const isPayer = expense.paidBy.toString() === req.user._id.toString();

    const isCreator = group.createdBy.toString() === req.user._id.toString();

    if (!isPayer && !isCreator) {
      return res.status(403).json({
        success: false,
        message: "Only the payer or group creator can delete this expense.",
      });
    }

    await expense.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Expense deleted successfully.",
    });
  } catch (error) {
    console.error("Delete expense error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete expense.",
    });
  }
};
