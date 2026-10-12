
import mongoose from "mongoose";
import Expense from "../models/Expense.js";
import Group from "../models/Group.js";

const isMember = (group, userId) =>
  group.members.some(
    (member) => member.user.toString() === userId.toString()
  );

// Add a new expense
export const createExpense = async (req, res) => {
  try {
    const { title, amount, category, paidBy, participants, date, notes } =
      req.body;
    const { groupId } = req.params;

    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group ID.",
      });
    }

    if (!title?.trim() || title.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: "Title is required and must be under 100 characters.",
      });
    }

    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isSafeInteger(Math.round(amount * 100))
    ) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number in rupees.",
      });
    }

    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one participant.",
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

    const payerId = paidBy || req.user._id.toString();

    if (!isMember(group, payerId)) {
      return res.status(400).json({
        success: false,
        message: "The payer must be a member of this group.",
      });
    }

    const memberIds = new Set(
      group.members.map((member) => member.user.toString())
    );

    const participantIds = participants.map((id) => String(id));

    if (
      participantIds.some(
        (id) => !mongoose.isValidObjectId(id) || !memberIds.has(id)
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

    const amountPaise = Math.round(amount * 100);
    const baseShare = Math.floor(amountPaise / participantIds.length);
    const remainder = amountPaise % participantIds.length;

    const splitParticipants = participantIds.map((user, index) => ({
      user,
      sharePaise: baseShare + (index < remainder ? 1 : 0),
    }));

    const expense = await Expense.create({
      groupId,
      title: title.trim(),
      amountPaise,
      category: category || "Other",
      paidBy: payerId,
      participants: splitParticipants,
      date: date ? new Date(date) : new Date(),
      notes: notes || "",
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
    console.error("Create expense error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create expense.",
    });
  }
};

// Get all expenses for a group
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
    console.error("Get expenses error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch expenses.",
    });
  }
};

// Get one expense
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
    console.error("Get expense error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch expense.",
    });
  }
};

// Delete an expense: payer or group creator only
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

    const isPayer =
      expense.paidBy.toString() === req.user._id.toString();

    const isCreator =
      group.createdBy.toString() === req.user._id.toString();

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
    console.error("Delete expense error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete expense.",
    });
  }
};