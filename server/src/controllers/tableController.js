import Table from "../models/Table.js";
import Cafe from "../models/Cafe.js";

// @desc    Get all tables (Multi-cafe isolated)
// @route   GET /api/tables
export const getTables = async (req, res, next) => {
  try {
    const { cafeId } = req.query;

    if (req.user?.cafeId && cafeId && req.user.cafeId.toString() !== cafeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access forbidden: Cross-cafe access denied",
      });
    }

    const filter = {};
    const targetCafeId = req.user?.cafeId || cafeId || req.cafeId;
    if (targetCafeId) filter.cafeId = targetCafeId;


    let tables = await Table.find(filter).sort({ tableNumber: 1 });

    // Auto-create default 8 tables if none exist yet for quick setup
    if (tables.length === 0) {
      let cafe = null;
      if (cafeId) cafe = await Cafe.findById(cafeId);
      if (!cafe) cafe = await Cafe.findOne();

      const initialTables = [];
      for (let i = 1; i <= 8; i++) {
        initialTables.push({
          cafeId: cafe?._id,
          tableNumber: i,
          capacity: i <= 4 ? 4 : 6,
          status: "vacant",
        });
      }
      tables = await Table.insertMany(initialTables);
    }

    res.json({ success: true, count: tables.length, tables });
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve secure QR token to Cafe and Table (Dine-in context)
// @route   GET /api/tables/resolve/:token
export const resolveTableByToken = async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, message: "Table token is required" });
    }

    const cleanToken = token.trim();
    // 1. Look up table by unique qrToken
    let table = await Table.findOne({ qrToken: cleanToken }).populate(
      "cafeId",
      "name slug logo address phone email currency taxRate wifiSsid"
    );

    // 2. Fallback for numeric table number lookup if needed
    if (!table && /^\d+$/.test(cleanToken)) {
      const cafeId = req.query.cafeId || req.cafeId;
      const numFilter = { tableNumber: Number(cleanToken) };
      if (cafeId) numFilter.cafeId = cafeId;
      table = await Table.findOne(numFilter).populate(
        "cafeId",
        "name slug logo address phone email currency taxRate wifiSsid"
      );
    }

    if (!table) {
      return res.status(404).json({
        success: false,
        message: "Invalid or nonexistent table token",
      });
    }

    if (table.isActive === false) {
      return res.status(400).json({
        success: false,
        message: "This table is currently inactive or out of service",
      });
    }

    const cafe = table.cafeId;
    if (!cafe) {
      return res.status(404).json({
        success: false,
        message: "Associated cafe not found for this table",
      });
    }

    res.json({
      success: true,
      message: "Table and cafe resolved successfully",
      table: {
        id: table._id,
        tableNumber: table.tableNumber,
        qrToken: table.qrToken,
        capacity: table.capacity,
        status: table.status,
        isActive: table.isActive,
      },
      cafe: {
        id: cafe._id,
        name: cafe.name,
        slug: cafe.slug,
        logo: cafe.logo,
        address: cafe.address,
        phone: cafe.phone,
        email: cafe.email,
        currency: cafe.currency || "₹",
        taxRate: cafe.taxRate || 5,
        wifiSsid: cafe.wifiSsid,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify if table number is valid (Customer QR scan)
// @route   GET /api/tables/verify/:tableNumber
export const verifyTable = async (req, res, next) => {
  try {
    const tableNum = Number(req.params.tableNumber);
    if (isNaN(tableNum)) {
      return res.status(400).json({ success: false, message: "Invalid table number" });
    }

    const cafeId = req.query.cafeId || req.cafeId;
    const filter = { tableNumber: tableNum };
    if (cafeId) filter.cafeId = cafeId;

    const table = await Table.findOne(filter).populate(
      "cafeId",
      "name slug logo address phone email currency taxRate wifiSsid"
    );

    if (!table) {
      return res.status(404).json({
        success: false,
        message: `Table #${tableNum} does not exist in the cafe system.`,
      });
    }

    if (table.isActive === false) {
      return res.status(400).json({
        success: false,
        message: `Table #${tableNum} is currently inactive or out of service.`,
      });
    }

    res.json({ success: true, table, cafe: table.cafeId });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new table (Owner/Staff - Scoped to cafe)
// @route   POST /api/tables
export const createTable = async (req, res, next) => {
  try {
    const { tableNumber, capacity } = req.body;

    if (!tableNumber) {
      return res.status(400).json({ success: false, message: "Table number is required" });
    }

    let cafeId = req.user?.cafeId || req.cafeId;
    if (!cafeId) {
      const defaultCafe = await Cafe.findOne();
      cafeId = defaultCafe?._id;
    }

    const existing = await Table.findOne({ tableNumber: Number(tableNumber), cafeId });
    if (existing) {
      return res.status(400).json({ success: false, message: `Table #${tableNumber} already exists for this cafe` });
    }

    const table = await Table.create({
      cafeId,
      tableNumber: Number(tableNumber),
      capacity: Number(capacity) || 4,
    });

    res.status(201).json({ success: true, message: `Table #${table.tableNumber} added`, table });
  } catch (error) {
    next(error);
  }
};

// @desc    Update table status/capacity (Owner/Staff - Multi-cafe isolated)
// @route   PUT /api/tables/:id
export const updateTable = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user?.cafeId) filter.cafeId = req.user.cafeId;

    const table = await Table.findOneAndUpdate(filter, req.body, {
      new: true,
      runValidators: true,
    });

    if (!table) {
      return res.status(404).json({ success: false, message: "Table not found or access denied for this cafe" });
    }

    res.json({ success: true, message: "Table updated successfully", table });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete table (Owner/Staff - Multi-cafe isolated)
// @route   DELETE /api/tables/:id
export const deleteTable = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user?.cafeId) filter.cafeId = req.user.cafeId;

    const table = await Table.findOneAndDelete(filter);
    if (!table) {
      return res.status(404).json({ success: false, message: "Table not found or access denied for this cafe" });
    }
    res.json({ success: true, message: "Table removed successfully" });
  } catch (error) {
    next(error);
  }
};
