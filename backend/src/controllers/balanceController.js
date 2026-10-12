
import mongoose from "mongoose";
import Group from "../models/Group.js";
import Expense from "../models/Expense.js";
import Settlement from "../models/Settlement.js";


const isMember = (group, userId) =>
  group.members.some((member) => {
    const memberUserId = member.user?._id ?? member.user;

    return memberUserId?.toString() === userId?.toString();
  });

export const getGroupBalances = async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group ID.",
      });
    }

    const group = await Group.findById(groupId).populate(
      "members.user",
      "name email"
    );

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

    const balances = new Map();

    for (const member of group.members) {
      const user = member.user;

      balances.set(user._id.toString(), {
        userId: user._id,
        name: user.name,
        email: user.email,
        totalPaidPaise: 0,
        totalSharePaise: 0,
        netBalancePaise: 0,
      });
    }

    const expenses = await Expense.find({ groupId });

    for (const expense of expenses) {
      const payerId = expense.paidBy.toString();
      const payerBalance = balances.get(payerId);

      if (payerBalance) {
        payerBalance.totalPaidPaise += expense.amountPaise;
      }

      for (const participant of expense.participants) {
        const participantId = participant.user.toString();
        const participantBalance = balances.get(participantId);

        if (participantBalance) {
          participantBalance.totalSharePaise += participant.sharePaise;
        }
      }
    }

    const settlements = await Settlement.find({
      groupId,
      status: "completed",
    });

    for (const settlement of settlements) {
      const payerBalance = balances.get(settlement.paidBy.toString());
      const receiverBalance = balances.get(settlement.paidTo.toString());

      if (payerBalance) {
        payerBalance.totalPaidPaise += settlement.amountPaise;
      }

      if (receiverBalance) {
        receiverBalance.totalPaidPaise -= settlement.amountPaise;
      }
    }

    const balanceList = Array.from(balances.values()).map((balance) => ({
      ...balance,
      netBalancePaise:
        balance.totalPaidPaise - balance.totalSharePaise,
    }));

    // Positive = should receive; negative = owes money.
    // Greedily match debtors and creditors to suggest transfers.
    const creditors = balanceList
      .filter((balance) => balance.netBalancePaise > 0)
      .map((balance) => ({
        userId: balance.userId,
        name: balance.name,
        remainingPaise: balance.netBalancePaise,
      }));

    const debtors = balanceList
      .filter((balance) => balance.netBalancePaise < 0)
      .map((balance) => ({
        userId: balance.userId,
        name: balance.name,
        remainingPaise: -balance.netBalancePaise,
      }));

    const suggestedTransfers = [];
    let creditorIndex = 0;
    let debtorIndex = 0;

    while (
      creditorIndex < creditors.length &&
      debtorIndex < debtors.length
    ) {
      const creditor = creditors[creditorIndex];
      const debtor = debtors[debtorIndex];

      const amountPaise = Math.min(
        creditor.remainingPaise,
        debtor.remainingPaise
      );

      if (amountPaise > 0) {
        suggestedTransfers.push({
          from: {
            userId: debtor.userId,
            name: debtor.name,
          },
          to: {
            userId: creditor.userId,
            name: creditor.name,
          },
          amountPaise,
        });
      }

      creditor.remainingPaise -= amountPaise;
      debtor.remainingPaise -= amountPaise;

      if (creditor.remainingPaise === 0) creditorIndex++;
      if (debtor.remainingPaise === 0) debtorIndex++;
    }

    return res.status(200).json({
      success: true,
      balances: balanceList,
      suggestedTransfers,
    });
  } catch (error) {
    console.error("Get balances error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to calculate balances.",
    });
  }
};

export const createSettlement = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { paidTo, amount, note } = req.body;

    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group ID.",
      });
    }

    if (!mongoose.isValidObjectId(paidTo)) {
      return res.status(400).json({
        success: false,
        message: "A valid recipient user ID is required.",
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

    if (note && (typeof note !== "string" || note.length > 300)) {
      return res.status(400).json({
        success: false,
        message: "Note must be a string of at most 300 characters.",
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

    if (!isMember(group, paidTo)) {
      return res.status(400).json({
        success: false,
        message: "Recipient must be a member of this group.",
      });
    }

    if (paidTo.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot settle a payment with yourself.",
      });
    }

    const settlement = await Settlement.create({
      groupId,
      paidBy: req.user._id,
      paidTo,
      amountPaise: Math.round(amount * 100),
      note: note?.trim() || "",
      status: "completed",
    });

    const populatedSettlement = await Settlement.findById(settlement._id)
      .populate("paidBy", "name email")
      .populate("paidTo", "name email");

    return res.status(201).json({
      success: true,
      message: "Settlement recorded successfully.",
      settlement: populatedSettlement,
    });
  } catch (error) {
    console.error("Create settlement error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to record settlement.",
    });
  }
};

export const getGroupSettlements = async (req, res) => {
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

    const settlements = await Settlement.find({ groupId })
      .populate("paidBy", "name email")
      .populate("paidTo", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: settlements.length,
      settlements,
    });
  } catch (error) {
    console.error("Get settlements error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch settlements.",
    });
  }
};