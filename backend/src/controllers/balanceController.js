import mongoose from "mongoose";
import Group from "../models/Group.js";
import Expense from "../models/Expense.js";
import Settlement from "../models/Settlement.js";

const isMember = (group, userId) =>
  group.members.some((member) => {
    const memberUserId = member.user?._id ?? member.user;
    return memberUserId?.toString() === userId?.toString();
  });

const getUserId = (user) => (user?._id ?? user)?.toString();

const getGroupBalancesData = async (groupId, group) => {
  const members = group.members.map((member) => {
    const user = member.user?._id ? member.user : member.user;
    const userId = getUserId(user);

    return {
      userId,
      name: member.user?.name ?? "Member",
      email: member.user?.email ?? "",
      totalPaidPaise: 0,
      totalSharePaise: 0,
      netBalancePaise: 0,
    };
  });

  const balances = new Map(members.map((member) => [member.userId, member]));

  const expenses = await Expense.find({ groupId });

  for (const expense of expenses) {
    const amountPaise = expense.amountPaise;
    const payerId = getUserId(expense.paidBy);
    const payer = balances.get(payerId);

    // Actual spending is recorded only against the roommate who paid.
    if (payer) {
      payer.totalPaidPaise += amountPaise;
    }

    const participants = Array.isArray(expense.participants)
      ? expense.participants
      : [];

    if (participants.length > 0) {
      // Preserve legacy expenses with saved individual shares.
      for (const participant of participants) {
        const participantId = getUserId(participant.user);
        const balance = balances.get(participantId);

        if (balance) {
          balance.totalSharePaise += participant.sharePaise;
        }
      }
    } else if (members.length > 0) {
      // New expenses: divide equally across all group members.
      const baseShare = Math.floor(amountPaise / members.length);
      const remainder = amountPaise % members.length;

      members.forEach((member, index) => {
        const balance = balances.get(member.userId);

        if (balance) {
          balance.totalSharePaise += baseShare + (index < remainder ? 1 : 0);
        }
      });
    }
  }

  // Settlements change outstanding balances, NOT spending totals.
  const settlements = await Settlement.find({
    groupId,
    status: "completed",
  });

  for (const settlement of settlements) {
    const payer = balances.get(getUserId(settlement.paidBy));
    const receiver = balances.get(getUserId(settlement.paidTo));

    if (payer) {
      payer.netBalancePaise += settlement.amountPaise;
    }

    if (receiver) {
      receiver.netBalancePaise -= settlement.amountPaise;
    }
  }

  // Net = expenses paid - fair share + settlements sent - settlements received.
  for (const balance of members) {
    balance.netBalancePaise = balance.totalPaidPaise - balance.totalSharePaise;

    // Recalculate settlement effects below to avoid mixing them with spending.
  }

  for (const settlement of settlements) {
    const payer = balances.get(getUserId(settlement.paidBy));
    const receiver = balances.get(getUserId(settlement.paidTo));

    if (payer) {
      payer.netBalancePaise += settlement.amountPaise;
    }

    if (receiver) {
      receiver.netBalancePaise -= settlement.amountPaise;
    }
  }

  return {
    balances: members,
    settlements,
  };
};

const buildSuggestedTransfers = (balanceList) => {
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

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];

    const amountPaise = Math.min(
      creditor.remainingPaise,
      debtor.remainingPaise,
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

  return suggestedTransfers;
};

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
      "name email",
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

    const { balances } = await getGroupBalancesData(groupId, group);

    return res.status(200).json({
      success: true,
      balances,
      suggestedTransfers: buildSuggestedTransfers(balances),
    });
  } catch (error) {
    console.error("Get balances error:", error);

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

    if (
      !mongoose.isValidObjectId(groupId) ||
      !mongoose.isValidObjectId(paidTo)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid group and recipient IDs are required.",
      });
    }

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number in rupees.",
      });
    }

    const amountPaise = Math.round(amount * 100);

    if (
      !Number.isSafeInteger(amountPaise) ||
      Math.abs(amount * 100 - amountPaise) > 1e-7
    ) {
      return res.status(400).json({
        success: false,
        message: "Amount must have at most 2 decimal places.",
      });
    }

    if (
      note !== undefined &&
      note !== null &&
      (typeof note !== "string" || note.trim().length > 300)
    ) {
      return res.status(400).json({
        success: false,
        message: "Note must not exceed 300 characters.",
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
        message: "You cannot record a payment to yourself.",
      });
    }

    const populatedGroup = await Group.findById(groupId).populate(
      "members.user",
      "name email",
    );

    const { balances } = await getGroupBalancesData(groupId, populatedGroup);

    const senderBalance = balances.find(
      (balance) => balance.userId === req.user._id.toString(),
    );

    const recipientBalance = balances.find(
      (balance) => balance.userId === paidTo.toString(),
    );

    if (
      !senderBalance ||
      !recipientBalance ||
      senderBalance.netBalancePaise >= 0 ||
      recipientBalance.netBalancePaise <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "No outstanding payment is due between these members.",
      });
    }

    const outstandingPaise = Math.min(
      -senderBalance.netBalancePaise,
      recipientBalance.netBalancePaise,
    );

    if (amountPaise > outstandingPaise) {
      return res.status(400).json({
        success: false,
        message: `Payment exceeds the outstanding amount of ₹${(
          outstandingPaise / 100
        ).toFixed(2)}.`,
      });
    }

    const settlement = await Settlement.create({
      groupId,
      paidBy: req.user._id,
      paidTo,
      amountPaise,
      note: typeof note === "string" ? note.trim() : "",
      status: "completed",
    });

    const populatedSettlement = await Settlement.findById(settlement._id)
      .populate("paidBy", "name email")
      .populate("paidTo", "name email");

    return res.status(201).json({
      success: true,
      message: "Payment recorded successfully.",
      settlement: populatedSettlement,
    });
  } catch (error) {
    console.error("Create settlement error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to record payment.",
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
    console.error("Get settlements error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch payments.",
    });
  }
};
