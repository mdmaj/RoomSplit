import mongoose from "mongoose";
import ExcelJS from "exceljs";

import Group from "../models/Group.js";
import Expense from "../models/Expense.js";
import Settlement from "../models/Settlement.js";

const getUserId = (user) => (user?._id ?? user)?.toString();

const isMember = (group, userId) =>
  group.members.some((member) => getUserId(member.user) === getUserId(userId));

const toRupees = (paise) => paise / 100;

export const exportGroupExpenses = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { month } = req.query;

    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group ID.",
      });
    }

    let startDate;
    let endDate;

    if (month !== undefined) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        return res.status(400).json({
          success: false,
          message: "Month must be in YYYY-MM format.",
        });
      }

      const [year, monthNumber] = month.split("-").map(Number);
      startDate = new Date(Date.UTC(year, monthNumber - 1, 1));
      endDate = new Date(Date.UTC(year, monthNumber, 1));
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

    const expenseFilter = { groupId };
    const settlementFilter = { groupId, status: "completed" };

    if (startDate && endDate) {
      expenseFilter.date = { $gte: startDate, $lt: endDate };
      settlementFilter.createdAt = {
        $gte: startDate,
        $lt: endDate,
      };
    }

    const [expenses, settlements, populatedGroup] = await Promise.all([
      Expense.find(expenseFilter)
        .populate("paidBy", "name email")
        .populate("participants.user", "name email")
        .sort({ date: 1 }),

      Settlement.find(settlementFilter)
        .populate("paidBy", "name email")
        .populate("paidTo", "name email")
        .sort({ createdAt: 1 }),

      Group.findById(groupId).populate("members.user", "name email"),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "RoomSplit";
    workbook.created = new Date();
    workbook.subject = "Group expense report";

    // Sheet 1: Expense details
    const expenseSheet = workbook.addWorksheet("Expense Details");

    expenseSheet.columns = [
      { header: "Date", key: "date", width: 16 },
      { header: "Expense", key: "title", width: 28 },
      { header: "Category", key: "category", width: 18 },
      { header: "Paid By", key: "payer", width: 25 },
      { header: "Participants", key: "participants", width: 40 },
      { header: "Total (INR)", key: "amount", width: 16 },
      { header: "Notes", key: "notes", width: 35 },
    ];

    for (const expense of expenses) {
      const participantNames = expense.participants
        .map((participant) => participant.user?.name || "Unknown")
        .join(", ");

      expenseSheet.addRow({
        date: expense.date,
        title: expense.title,
        category: expense.category,
        payer: expense.paidBy?.name || "Unknown",
        participants: participantNames || "Equal split among group",
        amount: toRupees(expense.amountPaise),
        notes: expense.notes || "",
      });
    }

    // Build actual expense totals and fair shares.
    // Settlements are intentionally excluded from these calculations.
    const balances = new Map();

    for (const member of populatedGroup.members) {
      const user = member.user;
      if (!user?._id) continue;

      balances.set(user._id.toString(), {
        name: user.name || "Roommate",
        email: user.email || "",
        paidPaise: 0,
        sharePaise: 0,
      });
    }

    for (const expense of expenses) {
      const payerId = getUserId(expense.paidBy);
      const payer = balances.get(payerId);

      if (payer) {
        payer.paidPaise += expense.amountPaise;
      }

      const participants = Array.isArray(expense.participants)
        ? expense.participants
        : [];

      // Preserve shares saved on older expenses.
      if (participants.length > 0) {
        for (const participant of participants) {
          const participantId = getUserId(participant.user);
          const balance = balances.get(participantId);

          if (balance) {
            balance.sharePaise += participant.sharePaise || 0;
          }
        }
      } else {
        // New expenses without selected participants are split equally.
        const memberIds = [...balances.keys()];

        if (memberIds.length > 0) {
          const baseShare = Math.floor(expense.amountPaise / memberIds.length);
          const remainder = expense.amountPaise % memberIds.length;

          memberIds.forEach((id, index) => {
            const balance = balances.get(id);
            balance.sharePaise += baseShare + (index < remainder ? 1 : 0);
          });
        }
      }
    }

    // Sheet 2: Roommate summary
    const summarySheet = workbook.addWorksheet("Roommate Summary");

    summarySheet.columns = [
      { header: "Name", key: "name", width: 25 },
      { header: "Email", key: "email", width: 32 },
      { header: "Total Paid (INR)", key: "paid", width: 20 },
      { header: "Fair Share (INR)", key: "share", width: 20 },
      { header: "Net Balance (INR)", key: "net", width: 22 },
      { header: "Status", key: "status", width: 18 },
    ];

    for (const balance of balances.values()) {
      const netPaise = balance.paidPaise - balance.sharePaise;

      summarySheet.addRow({
        name: balance.name,
        email: balance.email,
        paid: toRupees(balance.paidPaise),
        share: toRupees(balance.sharePaise),
        net: toRupees(netPaise),
        status:
          netPaise > 0
            ? "Should receive"
            : netPaise < 0
              ? "Owes money"
              : "Settled",
      });
    }

    // Sheet 3: Actual settlement history
    const settlementSheet = workbook.addWorksheet("Settlements");

    settlementSheet.columns = [
      { header: "Date", key: "date", width: 18 },
      { header: "Paid By", key: "paidBy", width: 25 },
      { header: "Paid To", key: "paidTo", width: 25 },
      { header: "Amount (INR)", key: "amount", width: 18 },
      { header: "Note", key: "note", width: 35 },
      { header: "Status", key: "status", width: 15 },
    ];

    for (const settlement of settlements) {
      settlementSheet.addRow({
        date: settlement.createdAt,
        paidBy: settlement.paidBy?.name || "Unknown",
        paidTo: settlement.paidTo?.name || "Unknown",
        amount: toRupees(settlement.amountPaise),
        note: settlement.note || "",
        status: settlement.status,
      });
    }

    // Sheet 4: Category summary
    const categorySheet = workbook.addWorksheet("Category Summary");

    categorySheet.columns = [
      { header: "Category", key: "category", width: 25 },
      { header: "Number of Expenses", key: "count", width: 22 },
      { header: "Total (INR)", key: "total", width: 20 },
    ];

    const categoryTotals = new Map();

    for (const expense of expenses) {
      const category = expense.category || "Other";
      const current = categoryTotals.get(category) || {
        count: 0,
        totalPaise: 0,
      };

      current.count += 1;
      current.totalPaise += expense.amountPaise;
      categoryTotals.set(category, current);
    }

    for (const [category, data] of categoryTotals) {
      categorySheet.addRow({
        category,
        count: data.count,
        total: toRupees(data.totalPaise),
      });
    }

    // Format all worksheets
    for (const sheet of workbook.worksheets) {
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).alignment = { vertical: "middle" };
      sheet.views = [{ state: "frozen", ySplit: 1 }];

      sheet.getRow(1).eachCell((cell) => {
        cell.border = { bottom: { style: "thin" } };
      });

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.eachCell((cell) => {
            if (typeof cell.value === "number") {
              cell.numFmt = "#,##0.00;[Red]-#,##0.00";
            }
          });
        }
      });
    }

    const filename = `RoomSplit-${month || "all-time"}-${groupId}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to export the Excel report.",
      });
    }

    res.end();
  }
};
