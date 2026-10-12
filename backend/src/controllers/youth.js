const prisma = require("../lib/prisma");
const crypto = require("crypto");

function createRegistrationCode() {
  // 8 random bytes provide a high-entropy, human-shareable one-time code.
  const raw = crypto.randomBytes(8).toString("hex").toUpperCase();
  return `IK-${raw.slice(0, 8)}-${raw.slice(8)}`;
}

function hashRegistrationCode(code) {
  return crypto.createHash("sha256").update(String(code).trim().toUpperCase()).digest("hex");
}

// Fields returned to the mobile app
const youthSelect = {
  id: true,
  userId: true,
  name: true,
  gender: true,
  age: true,
  birthday: true,
  address: true,
  cellLeader: true,
  category: true,
  accountRole: true,
  image: true,
  createdAt: true,
  updatedAt: true,
};

// Existing schema stores the assigned Leader's display name in cellLeader.
// Keep that schema for this patch, and compare names consistently.
const isAssignedToLeader = (youth, user) =>
  String(youth?.cellLeader || "").trim().toLocaleLowerCase() ===
  String(user?.name || "").trim().toLocaleLowerCase();

const denyUnlessAdminOrAssignedLeader = (req, res, youth) => {
  if (req.user?.role === "ADMIN") return false;
  if (req.user?.role === "LEADER" && isAssignedToLeader(youth, req.user)) return false;
  res.status(404).json({ success: false, message: "Youth profile not found" });
  return true;
};

// Get all youth profiles
const getYouth = async (req, res) => {
  try {
    // All authenticated users may view the roster. Write permissions remain role-restricted.
    const where = {};

    const youth = await prisma.youthProfile.findMany({
      where,
      select: youthSelect,
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      youth,
    });
  } catch (error) {
    console.error("Get youth error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get youth profiles",
    });
  }
};

// Get one youth profile
const getYouthById = async (req, res) => {
  try {
    const { id } = req.params;

    const youth = await prisma.youthProfile.findUnique({
      where: {
        id,
      },
      select: youthSelect,
    });

    if (!youth) {
      return res.status(404).json({ success: false, message: "Youth profile not found" });
    }

    res.json({ success: true, youth });
  } catch (error) {
    console.error("Get youth by ID error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get youth profile",
    });
  }
};

// Create youth profile
const createYouth = async (req, res) => {
  try {
    const {
      name,
      gender,
      age,
      birthday,
      address,
      cellLeader,
      category,
      image,
      accountRole,
    } = req.body;

    // Name is required
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    // Validate gender
    let normalizedGender = null;

    if (gender !== undefined && gender !== null && gender !== "") {
      if (!["Male", "Female"].includes(gender)) {
        return res.status(400).json({
          success: false,
          message: "Gender must be Male or Female",
        });
      }

      normalizedGender = gender;
    }

    // Validate age
    let numericAge = null;

    if (age !== undefined && age !== null && age !== "") {
      numericAge = Number(age);

      if (
        !Number.isInteger(numericAge) ||
        numericAge < 1 ||
        numericAge > 120
      ) {
        return res.status(400).json({
          success: false,
          message: "Age must be a valid number between 1 and 120",
        });
      }
    }

    // Validate category
    let normalizedCategory = null;

    if (category !== undefined && category !== null && category !== "") {
      if (!["Newbie", "Regular"].includes(category)) {
        return res.status(400).json({
          success: false,
          message: "Category must be Newbie or Regular",
        });
      }

      normalizedCategory = category;
    }

    // Leaders may add ordinary members only to their own cell. Only Admins
    // may assign a different Leader or create a Leader profile.
    if (req.user?.role === "LEADER" && accountRole !== undefined && accountRole !== "YOUTH") {
      return res.status(403).json({ success: false, message: "Leaders cannot assign account roles" });
    }
    const normalizedAccountRole = req.user?.role === "ADMIN"
      ? (accountRole === undefined ? "YOUTH" : accountRole)
      : "YOUTH";
    if (!["YOUTH", "LEADER"].includes(normalizedAccountRole)) {
      return res.status(400).json({
        success: false,
        message: "Account role must be YOUTH or LEADER",
      });
    }

    const registrationCode = createRegistrationCode();

    const youth = await prisma.youthProfile.create({
      data: {
        name: name.trim(),
        gender: normalizedGender,
        age: numericAge,

        birthday:
          birthday === undefined ||
          birthday === null ||
          birthday === ""
            ? null
            : String(birthday).trim(),

        address:
          address === undefined ||
          address === null ||
          address === ""
            ? null
            : String(address).trim(),

        cellLeader: req.user?.role === "LEADER"
          ? String(req.user.name || "").trim()
          : (cellLeader === undefined || cellLeader === null || cellLeader === ""
              ? null
              : String(cellLeader).trim()),

        category: normalizedCategory,
        accountRole: normalizedAccountRole,
        registrationCodeHash: hashRegistrationCode(registrationCode),

        image:
          image === undefined ||
          image === null ||
          image === ""
            ? null
            : String(image),
      },

      select: youthSelect,
    });

    res.status(201).json({
      success: true,
      message: "Youth profile created successfully. Share the registration code with the intended member; it is shown only once.",
      youth,
      registrationCode,
    });
  } catch (error) {
    console.error("Create youth error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create youth profile",
    });
  }
};

// Update youth profile
const updateYouth = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      gender,
      age,
      birthday,
      address,
      cellLeader,
      category,
      image,
      accountRole,
    } = req.body;

    // Check if profile exists
    const existingYouth = await prisma.youthProfile.findUnique({
      where: {
        id,
      },
    });

    if (!existingYouth) {
      return res.status(404).json({ success: false, message: "Youth profile not found" });
    }
    if (denyUnlessAdminOrAssignedLeader(req, res, existingYouth)) return;

    // Only Admins can change assignment or member account role.
    if (req.user?.role !== "ADMIN" &&
        (Object.prototype.hasOwnProperty.call(req.body, "cellLeader") ||
         Object.prototype.hasOwnProperty.call(req.body, "accountRole"))) {
      return res.status(403).json({
        success: false,
        message: "Only Admins can change a member's Leader assignment or account role",
      });
    }

    const updateData = {};

    // Name
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty",
        });
      }

      updateData.name = name.trim();
    }

    // Gender
    if (gender !== undefined) {
      if (gender === null || gender === "") {
        updateData.gender = null;
      } else if (!["Male", "Female"].includes(gender)) {
        return res.status(400).json({
          success: false,
          message: "Gender must be Male or Female",
        });
      } else {
        updateData.gender = gender;
      }
    }

    // Age
    if (age !== undefined) {
      if (age === null || age === "") {
        updateData.age = null;
      } else {
        const numericAge = Number(age);

        if (
          !Number.isInteger(numericAge) ||
          numericAge < 1 ||
          numericAge > 120
        ) {
          return res.status(400).json({
            success: false,
            message: "Age must be a valid number between 1 and 120",
          });
        }

        updateData.age = numericAge;
      }
    }

    // Birthday
    if (birthday !== undefined) {
      updateData.birthday =
        birthday === null || birthday === ""
          ? null
          : String(birthday).trim();
    }

    // Address
    if (address !== undefined) {
      updateData.address =
        address === null || address === ""
          ? null
          : String(address).trim();
    }

    // Cell leader
    if (cellLeader !== undefined) {
      updateData.cellLeader =
        cellLeader === null || cellLeader === ""
          ? null
          : String(cellLeader).trim();
    }

    // Category
    if (category !== undefined) {
      if (category === null || category === "") {
        updateData.category = null;
      } else if (!["Newbie", "Regular"].includes(category)) {
        return res.status(400).json({
          success: false,
          message: "Category must be Newbie or Regular",
        });
      } else {
        updateData.category = category;
      }
    }

    // Image
    if (image !== undefined) {
      updateData.image =
        image === null || image === ""
          ? null
          : String(image);
    }

    if (accountRole !== undefined) {
      if (!["YOUTH", "LEADER"].includes(accountRole)) {
        return res.status(400).json({
          success: false,
          message: "Account role must be YOUTH or LEADER",
        });
      }
      updateData.accountRole = accountRole;

      // If already linked, update the linked login role in the same request.
      if (existingYouth.userId) {
        await prisma.user.update({
          where: { id: existingYouth.userId },
          data: { role: accountRole },
        });
      }
    }

    const youth = await prisma.youthProfile.update({
      where: {
        id,
      },
      data: updateData,
      select: youthSelect,
    });

    res.json({
      success: true,
      message: "Youth profile updated successfully",
      youth,
    });
  } catch (error) {
    console.error("Update youth error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update youth profile",
    });
  }
};

// Delete youth profile
const deleteYouth = async (req, res) => {
  try {
    const { id } = req.params;

    const existingYouth = await prisma.youthProfile.findUnique({
      where: {
        id,
      },
    });

    if (!existingYouth) {
      return res.status(404).json({ success: false, message: "Youth profile not found" });
    }
    if (denyUnlessAdminOrAssignedLeader(req, res, existingYouth)) return;

    // Deleting a profile cascades to its attendance rows in the current schema.
    // Refuse deletion when history exists so attendance records are never silently lost.
    const attendanceCount = await prisma.attendance.count({ where: { youthId: id } });
    if (attendanceCount > 0) {
      return res.status(409).json({
        success: false,
        message: "This member has attendance history and cannot be deleted. Keep the record to preserve attendance history.",
      });
    }

    // Avoid leaving an existing login account without its linked member profile.
    if (existingYouth.userId) {
      return res.status(409).json({
        success: false,
        message: "This member is linked to a login account. Unlink or resolve the account before deleting the profile.",
      });
    }

    await prisma.youthProfile.delete({ where: { id } });

    res.json({
      success: true,
      message: "Youth profile deleted successfully",
    });
  } catch (error) {
    console.error("Delete youth error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete youth profile",
    });
  }
};

// Issue or replace a linking code for an existing member who has no account.
// The raw code is returned once and only its hash is stored in the database.
const issueRegistrationCode = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await prisma.youthProfile.findUnique({
      where: { id },
      select: { id: true, userId: true, name: true },
    });

    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }
    if (member.userId) {
      return res.status(409).json({
        success: false,
        message: "This member already has a linked account. Do not issue a new code.",
      });
    }

    const registrationCode = createRegistrationCode();
    await prisma.youthProfile.update({
      where: { id },
      data: { registrationCodeHash: hashRegistrationCode(registrationCode) },
    });

    return res.json({
      success: true,
      message: "Share this one-time registration code directly with the intended member. It will not be shown again.",
      member: { id: member.id, name: member.name },
      registrationCode,
    });
  } catch (error) {
    console.error("Issue registration code error:", error);
    return res.status(500).json({ success: false, message: "Failed to issue registration code" });
  }
};

module.exports = {
  getYouth,
  getYouthById,
  createYouth,
  updateYouth,
  deleteYouth,
  issueRegistrationCode,
};