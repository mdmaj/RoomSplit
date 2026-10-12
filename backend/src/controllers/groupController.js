
import Group from "../models/Group.js";

export const createGroup = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Group name must contain at least 2 characters.",
      });
    }

    const group = await Group.create({
      name: name.trim(),
      createdBy: req.user._id,
      members: [
        {
          user: req.user._id,
          role: "admin",
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: "Group created successfully.",
      group,
    });
  } catch (error) {
    console.error("Create group error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create group.",
    });
  }
};

export const getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({
      "members.user": req.user._id,
    })
      .populate("members.user", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: groups.length,
      groups,
    });
  } catch (error) {
    console.error("Get groups error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch groups.",
    });
  }
};

export const joinGroup = async (req, res) => {
  try {
    const inviteCode = req.body.inviteCode?.trim().toUpperCase();

    if (!inviteCode) {
      return res.status(400).json({
        success: false,
        message: "Invite code is required.",
      });
    }

    const group = await Group.findOne({ inviteCode });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Invalid invite code.",
      });
    }

    const alreadyMember = group.members.some(
      (member) => member.user.toString() === req.user._id.toString()
    );

    if (alreadyMember) {
      return res.status(409).json({
        success: false,
        message: "You are already a member of this group.",
      });
    }

    group.members.push({
      user: req.user._id,
      role: "member",
    });

    await group.save();

    return res.status(200).json({
      success: true,
      message: "Joined group successfully.",
      group,
    });
  } catch (error) {
    console.error("Join group error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to join group.",
    });
  }
};