
import mongoose from "mongoose";
import ExcelJS from "exceljs";

import Group from "../models/Group.js";
import Expense from "../models/Expense.js";
import Settlement from "../models/Settlement.js";

const isMember = (group, userId) =>
  group.members.some(
    (member) =>
      (member.user._id || member.user).toString() === userId.toString()
  );

const toRupees = (paise) => paise / 100;

export const exportGroupExpenses = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { month } = req.query; // Optional: YYYY-MM

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
    const settlementFilter = { groupId };

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
      expenseSheet.addRow({
        date: expense.date,
        title: expense.title,
        category: expense.category,
        payer: expense.paidBy?.name || "Unknown",
        participants: expense.participants
          .map((p) => p.user?.name || "Unknown")
          .join(", "),
        amount: toRupees(expense.amountPaise),
        notes: expense.notes || "",
      });
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

    const balances = new Map();

    for (const member of populatedGroup.members) {
      const user = member.user;
      balances.set(user._id.toString(), {
        name: user.name,
        email: user.email,
        paidPaise: 0,
        sharePaise: 0,
      });
    }

    for (const expense of expenses) {
      const payer = balances.get(expense.paidBy?._id.toString());

      if (payer) payer.paidPaise += expense.amountPaise;

      for (const participant of expense.participants) {
        const balance = balances.get(
          participant.user?._id.toString()
        );

        if (balance) balance.sharePaise += participant.sharePaise;
      }
    }

    for (const settlement of settlements) {
      const sender = balances.get(settlement.paidBy?._id.toString());
      const receiver = balances.get(settlement.paidTo?._id.toString());

      if (sender) sender.paidPaise += settlement.amountPaise;
      if (receiver) receiver.paidPaise -= settlement.amountPaise;
    }

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

    // Sheet 3: Settlement history
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

    // Format headers and monetary columns
    for (const sheet of workbook.worksheets) {
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).alignment = { vertical: "middle" };
      sheet.views = [{ state: "frozen", ySplit: 1 }];

      sheet.getRow(1).eachCell((cell) => {
        cell.border = {
          bottom: { style: "thin" },
        };
      });
    }

    for (const sheet of [
      expenseSheet,
      summarySheet,
      settlementSheet,
      categorySheet,
    ]) {
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.eachCell((cell) => {
            if (typeof cell.value === "number") {
              cell.numFmt = '#,##0.00;[Red]-#,##0.00';
            }
          });
        }
      });
    }

    const filename = `RoomSplit-${month || "all-time"}-${groupId}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export error:", error.message);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to export the Excel report.",
      });
    }

    res.end();
  }
};