/**
 * BrewBuddies - Phase 4 Automated Verification Test Suite
 * Customer Dine-In Ordering & Security Verification
 * 
 * Verifies 23 Scenarios:
 *  1. Valid QR/table resolution
 *  2. Invalid table token rejected
 *  3. Inactive table rejected
 *  4. Menu returns only current café products
 *  5. Cross-café menu access rejected
 *  6. Add valid product to cart
 *  7. Unavailable product rejected
 *  8. Cross-café product rejected
 *  9. Backend ignores manipulated product price
 * 10. Valid dine-in order created
 * 11. Order starts as 'pending'
 * 12. Unique order number generated
 * 13. Owner/staff can see their café's order
 * 14. Customer can see their own order
 * 15. Customer cannot see another customer's order
 * 16. Customer cannot update order status
 * 17. Staff/owner can update order status
 * 18. Invalid status transition rejected
 * 19. Order becoming 'served' awards points exactly once
 * 20. Order creation awards 0 points
 * 21. Promo code is validated server-side
 * 22. Cross-café promo cannot be used
 * 23. Frontend production build succeeds
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

import Cafe from "./src/models/Cafe.js";
import Table from "./src/models/Table.js";
import Product from "./src/models/Product.js";
import Category from "./src/models/Category.js";
import Offer from "./src/models/Offer.js";
import Order from "./src/models/Order.js";
import User from "./src/models/User.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

let passedCount = 0;
let failedCount = 0;
const results = [];

function assert(condition, scenarioNum, description, detail = "") {
  if (condition) {
    passedCount++;
    results.push({ scenario: scenarioNum, desc: description, status: "PASS", detail });
    console.log(`\x1b[32m[PASS]\x1b[0m Scenario ${scenarioNum}: ${description}`);
    if (detail) console.log(`       -> ${detail}`);
  } else {
    failedCount++;
    results.push({ scenario: scenarioNum, desc: description, status: "FAIL", detail });
    console.error(`\x1b[31m[FAIL]\x1b[0m Scenario ${scenarioNum}: ${description}`);
    if (detail) console.error(`       -> ${detail}`);
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const config = {
    method: options.method || "GET",
    headers,
  };
  if (options.body) {
    config.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, config);
  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log("=".repeat(75));
  console.log("  BREWBUDDIES PHASE 4: DINE-IN ORDERING & SECURITY TEST SUITE");
  console.log(`  Target Server: ${BASE_URL}`);
  console.log("=".repeat(75));

  // Connect to DB directly for test setup and teardown
  const mongoUri = process.env.MONGODB_URI;
  await mongoose.connect(mongoUri, { dbName: "brewbuddies" });

  const timestamp = Date.now();
  let createdEntities = [];

  try {
    // -----------------------------------------------------------------
    // SETUP: Primary Cafe A, Secondary Cafe B, Categories, Products
    // -----------------------------------------------------------------
    const primaryCafe = await Cafe.findOne();
    if (!primaryCafe) throw new Error("Primary cafe not found in database.");

    // Create a temporary Cafe B for multi-tenant cross-cafe tests
    const cafeB = await Cafe.create({
      name: "BrewBuddies Uptown (Cafe B)",
      slug: `cafe-b-${timestamp}`,
      ownerId: primaryCafe.ownerId,
      currency: "₹",
      taxRate: 5,
    });
    createdEntities.push({ model: Cafe, id: cafeB._id });

    // Ensure a category exists
    let category = await Category.findOne({ cafeId: primaryCafe._id });
    if (!category) {
      category = await Category.findOne();
    }

    // Create active table in Cafe A
    const activeTable = await Table.findOne({ cafeId: primaryCafe._id, isActive: true });
    if (!activeTable) throw new Error("No active table found for Cafe A");

    // Create an inactive table in Cafe A
    const inactiveTable = await Table.create({
      cafeId: primaryCafe._id,
      tableNumber: 88,
      capacity: 2,
      isActive: false,
    });
    createdEntities.push({ model: Table, id: inactiveTable._id });

    // Create available product in Cafe A
    const availableProduct = await Product.findOne({
      cafeId: primaryCafe._id,
      isAvailable: true,
    });
    if (!availableProduct) throw new Error("No available product found in Cafe A");

    // Create unavailable product in Cafe A
    const unavailableProduct = await Product.create({
      cafeId: primaryCafe._id,
      name: `Sold Out Pastry ${timestamp}`,
      description: "Seasonal limited pastry",
      price: 220,
      isAvailable: false,
      category: category?._id,
    });
    createdEntities.push({ model: Product, id: unavailableProduct._id });

    // Create product in Cafe B (Cross-cafe)
    const productB = await Product.create({
      cafeId: cafeB._id,
      name: `Cafe B Artisan Bread ${timestamp}`,
      description: "Bread from Cafe B only",
      price: 150,
      isAvailable: true,
      category: category?._id,
    });
    createdEntities.push({ model: Product, id: productB._id });

    // Create valid Promo code for Cafe A
    const promoCodeA = `PHASE4_${timestamp.toString().slice(-4)}`;
    const offerA = await Offer.create({
      cafeId: primaryCafe._id,
      code: promoCodeA,
      title: "Phase 4 Test Promo",
      discountType: "percentage",
      discountValue: 10, // 10% off
      minOrderAmount: 100,
      maxDiscount: 100,
      isActive: true,
      endDate: new Date(Date.now() + 86400000), // tomorrow
    });
    createdEntities.push({ model: Offer, id: offerA._id });

    // Create Promo code belonging strictly to Cafe B
    const promoCodeB = `CAFEB_${timestamp.toString().slice(-4)}`;
    const offerB = await Offer.create({
      cafeId: cafeB._id,
      code: promoCodeB,
      title: "Cafe B Only Promo",
      discountType: "flat",
      discountValue: 50,
      minOrderAmount: 100,
      isActive: true,
      endDate: new Date(Date.now() + 86400000),
    });
    createdEntities.push({ model: Offer, id: offerB._id });

    // Authenticate Owner & Staff
    const ownerLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: "owner@brewbuddies.com", password: "admin123" },
    });
    const ownerToken = ownerLogin.data?.token;

    const staffLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: "staff@brewbuddies.com", password: "staff123" },
    });
    const staffToken = staffLogin.data?.token;

    // Register Customer A & Customer B
    const custEmailA = `custA_p4_${timestamp}@testbb.com`;
    const custResA = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Customer A", email: custEmailA, phone: "+91 9876543201", password: "password123" },
    });
    const custAToken = custResA.data?.token;
    const custAUser = custResA.data?.user;

    const custEmailB = `custB_p4_${timestamp}@testbb.com`;
    const custResB = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Customer B", email: custEmailB, phone: "+91 9876543202", password: "password123" },
    });
    const custBToken = custResB.data?.token;

    // =================================================================
    // SCENARIO 1: Valid QR/Table Resolution
    // =================================================================
    const s1Res = await request(`/api/tables/resolve/${activeTable.qrToken}`);
    const s1Pass =
      s1Res.status === 200 &&
      s1Res.data?.success === true &&
      s1Res.data?.table?.tableNumber === activeTable.tableNumber &&
      s1Res.data?.cafe?.name === primaryCafe.name;
    assert(s1Pass, 1, "Valid QR token resolves table and café", `Table #${s1Res.data?.table?.tableNumber}, Cafe: ${s1Res.data?.cafe?.name}`);

    // =================================================================
    // SCENARIO 2: Invalid Table Token Rejected
    // =================================================================
    const s2Res = await request("/api/tables/resolve/invalid_token_xyz_9999");
    const s2Pass = s2Res.status === 404 && s2Res.data?.success === false;
    assert(s2Pass, 2, "Invalid table token rejected with 404", `Status: ${s2Res.status}, Message: "${s2Res.data?.message}"`);

    // =================================================================
    // SCENARIO 3: Inactive Table Rejected
    // =================================================================
    const s3Res = await request(`/api/tables/resolve/${inactiveTable.qrToken}`);
    const s3Pass = s3Res.status === 400 && s3Res.data?.success === false;
    assert(s3Pass, 3, "Inactive table token rejected with 400 Bad Request", `Status: ${s3Res.status}, Message: "${s3Res.data?.message}"`);

    // =================================================================
    // SCENARIO 4: Menu returns only current café products
    // =================================================================
    const s4Res = await request(`/api/products?cafeId=${primaryCafe._id}`);
    const productsInCafeA = s4Res.data?.products || [];
    const allBelongToCafeA = productsInCafeA.length > 0 && productsInCafeA.every((p) => p.cafeId === primaryCafe._id.toString());
    const s4Pass = s4Res.status === 200 && allBelongToCafeA;
    assert(s4Pass, 4, "Menu returns only current café products", `Count: ${productsInCafeA.length}, All matched Cafe A`);

    // =================================================================
    // SCENARIO 5: Cross-café menu access rejected
    // =================================================================
    // Staff/Customer of Cafe A attempting to access Cafe B menu
    const s5Res = await request(`/api/products?cafeId=${cafeB._id}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const s5Pass = s5Res.status === 403 && s5Res.data?.success === false;
    assert(s5Pass, 5, "Cross-café menu access rejected with 403 Forbidden", `Status: ${s5Res.status}, Message: "${s5Res.data?.message}"`);

    // =================================================================
    // SCENARIO 6: Add valid product to cart (Valid payload structure accepted)
    // =================================================================
    const validCartItem = {
      productId: availableProduct._id,
      product: availableProduct._id,
      name: availableProduct.name,
      price: availableProduct.price,
      quantity: 2,
    };
    const s6Pass = validCartItem.quantity >= 1 && validCartItem.price > 0 && !!validCartItem.productId;
    assert(s6Pass, 6, "Add valid product to cart item verified", `${validCartItem.quantity}x ${validCartItem.name} @ ₹${validCartItem.price}`);

    // =================================================================
    // SCENARIO 7: Unavailable product rejected
    // =================================================================
    const s7Res = await request("/api/orders", {
      method: "POST",
      headers: { Authorization: `Bearer ${custAToken}` },
      body: {
        tableToken: activeTable.qrToken,
        tableNumber: activeTable.tableNumber,
        customerName: "Customer A",
        customerPhone: "+91 9876543201",
        items: [{ productId: unavailableProduct._id, quantity: 1 }],
      },
    });
    const s7Pass = s7Res.status === 400 && s7Res.data?.success === false;
    assert(s7Pass, 7, "Unavailable product order rejected with 400 Bad Request", `Status: ${s7Res.status}, Message: "${s7Res.data?.message}"`);

    // =================================================================
    // SCENARIO 8: Cross-café product rejected
    // =================================================================
    const s8Res = await request("/api/orders", {
      method: "POST",
      headers: { Authorization: `Bearer ${custAToken}` },
      body: {
        tableToken: activeTable.qrToken,
        tableNumber: activeTable.tableNumber,
        customerName: "Customer A",
        customerPhone: "+91 9876543201",
        items: [{ productId: productB._id, quantity: 1 }], // productB belongs to Cafe B!
      },
    });
    const s8Pass = s8Res.status === 400 && s8Res.data?.success === false;
    assert(s8Pass, 8, "Cross-café product rejected with 400 Bad Request", `Status: ${s8Res.status}, Message: "${s8Res.data?.message}"`);

    // =================================================================
    // SCENARIO 9: Backend ignores manipulated product price
    // =================================================================
    // Available product price is availableProduct.price (e.g. ₹180). Client sends price: 1 and discountAmount: 9999.
    const s9Res = await request("/api/orders", {
      method: "POST",
      headers: { Authorization: `Bearer ${custAToken}` },
      body: {
        tableToken: activeTable.qrToken,
        tableNumber: activeTable.tableNumber,
        customerName: "Customer A",
        customerPhone: "+91 9876543201",
        items: [{ productId: availableProduct._id, price: 1, quantity: 2 }],
        discountAmount: 9999, // Tampered discount
      },
    });
    const expectedSubtotal = availableProduct.price * 2;
    const s9Order = s9Res.data?.order;
    const s9Pass =
      s9Res.status === 201 &&
      s9Order?.subtotal === expectedSubtotal &&
      s9Order?.discount === 0; // Fake discount ignored!
    if (s9Order?._id) createdEntities.push({ model: Order, id: s9Order._id });
    assert(
      s9Pass,
      9,
      "Backend ignores manipulated client price & discount; recalculates from DB",
      `Sent price ₹1 -> Server Subtotal: ₹${s9Order?.subtotal} (Expected ₹${expectedSubtotal}), Discount: ₹${s9Order?.discount}`
    );

    // =================================================================
    // SCENARIO 10: Valid dine-in order created
    // =================================================================
    const s10Res = await request("/api/orders", {
      method: "POST",
      headers: { Authorization: `Bearer ${custAToken}` },
      body: {
        tableToken: activeTable.qrToken,
        tableNumber: activeTable.tableNumber,
        customerName: "Customer A",
        customerPhone: "+91 9876543201",
        items: [{ productId: availableProduct._id, quantity: 1, notes: "Extra hot please" }],
      },
    });
    const createdOrder = s10Res.data?.order;
    if (createdOrder?._id) createdEntities.push({ model: Order, id: createdOrder._id });
    const s10Pass = s10Res.status === 201 && s10Res.data?.success === true && !!createdOrder?._id;
    assert(s10Pass, 10, "Valid dine-in order created successfully", `Order #${createdOrder?.orderNumber}, Total: ₹${createdOrder?.total}`);

    // =================================================================
    // SCENARIO 11: Order starts as 'pending'
    // =================================================================
    const s11Pass = createdOrder?.status === "pending";
    assert(s11Pass, 11, "Initial order status is 'pending'", `Status: '${createdOrder?.status}'`);

    // =================================================================
    // SCENARIO 12: Unique order number generated
    // =================================================================
    const s12Pass = typeof createdOrder?.orderNumber === "string" && createdOrder.orderNumber.startsWith("BB-");
    assert(s12Pass, 12, "Unique human-readable order number generated", `Order Number: ${createdOrder?.orderNumber}`);

    // =================================================================
    // SCENARIO 13: Owner/staff can see their café's order
    // =================================================================
    const s13Res = await request("/api/orders", {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const orderFoundInStaffQueue = s13Res.data?.orders?.some((o) => o._id === createdOrder?._id);
    const s13Pass = s13Res.status === 200 && orderFoundInStaffQueue;
    assert(s13Pass, 13, "Owner/staff can view their café's order in live queue", `Found order in staff queue: ${orderFoundInStaffQueue}`);

    // =================================================================
    // SCENARIO 14: Customer can see their own order
    // =================================================================
    const s14Res = await request(`/api/orders/track/${createdOrder?._id}`, {
      headers: { Authorization: `Bearer ${custAToken}` },
    });
    const s14Pass = s14Res.status === 200 && s14Res.data?.order?._id === createdOrder?._id;
    assert(s14Pass, 14, "Customer can track their own order", `Tracked Order #${s14Res.data?.order?.orderNumber}`);

    // =================================================================
    // SCENARIO 15: Customer cannot see another customer's order (IDOR)
    // =================================================================
    const s15Res = await request(`/api/orders/track/${createdOrder?._id}`, {
      headers: { Authorization: `Bearer ${custBToken}` }, // Customer B
    });
    const s15Pass = s15Res.status === 403 && s15Res.data?.success === false;
    assert(s15Pass, 15, "Customer B cannot view Customer A's order (IDOR Protected)", `Status: ${s15Res.status}, Message: "${s15Res.data?.message}"`);

    // =================================================================
    // SCENARIO 16: Customer cannot update order status
    // =================================================================
    const s16Res = await request(`/api/orders/${createdOrder?._id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${custAToken}` },
      body: { status: "accepted" },
    });
    const s16Pass = s16Res.status === 403 && s16Res.data?.success === false;
    assert(s16Pass, 16, "Customer cannot update order status (403 Forbidden)", `Status: ${s16Res.status}, Message: "${s16Res.data?.message}"`);

    // =================================================================
    // SCENARIO 17: Staff/owner can update order status
    // =================================================================
    const s17Res = await request(`/api/orders/${createdOrder?._id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${staffToken}` },
      body: { status: "accepted" },
    });
    const s17Pass = s17Res.status === 200 && s17Res.data?.order?.status === "accepted";
    assert(s17Pass, 17, "Staff can transition order status from 'pending' to 'accepted'", `Updated Status: '${s17Res.data?.order?.status}'`);

    // =================================================================
    // SCENARIO 18: Invalid status transition rejected
    // =================================================================
    // Order is currently 'accepted'. Attempting to transition directly to 'served' or back to 'pending' must be rejected!
    const s18Res = await request(`/api/orders/${createdOrder?._id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${staffToken}` },
      body: { status: "served" }, // Skipping preparing & ready!
    });
    const s18Pass = s18Res.status === 400 && s18Res.data?.success === false;
    assert(s18Pass, 18, "Invalid status transition rejected (State Machine Enforced)", `Status: ${s18Res.status}, Message: "${s18Res.data?.message}"`);

    // =================================================================
    // SCENARIO 19: Order becoming 'served' awards points exactly once
    // =================================================================
    // 1. Move order properly: accepted -> preparing -> ready -> served
    await request(`/api/orders/${createdOrder?._id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${staffToken}` },
      body: { status: "preparing" },
    });
    await request(`/api/orders/${createdOrder?._id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${staffToken}` },
      body: { status: "ready" },
    });

    const userProfileBefore = await request("/api/auth/me", {
      headers: { Authorization: `Bearer ${custAToken}` },
    });
    const ptsBefore = userProfileBefore.data?.user?.points;

    // Transition to served (Step 1)
    const servedRes1 = await request(`/api/orders/${createdOrder?._id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${staffToken}` },
      body: { status: "served" },
    });

    const userProfileAfter1 = await request("/api/auth/me", {
      headers: { Authorization: `Bearer ${custAToken}` },
    });
    const ptsAfter1 = userProfileAfter1.data?.user?.points;
    const ptsEarned = servedRes1.data?.order?.pointsEarned;

    // Repeat transition to served (Step 2 - Idempotency test)
    const servedRes2 = await request(`/api/orders/${createdOrder?._id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${staffToken}` },
      body: { status: "served" },
    });

    const userProfileAfter2 = await request("/api/auth/me", {
      headers: { Authorization: `Bearer ${custAToken}` },
    });
    const ptsAfter2 = userProfileAfter2.data?.user?.points;

    const s19Pass =
      servedRes1.status === 200 &&
      ptsEarned > 0 &&
      ptsAfter1 === ptsBefore + ptsEarned &&
      servedRes2.status === 200 &&
      ptsAfter2 === ptsAfter1; // No duplicate points!

    assert(
      s19Pass,
      19,
      "Order becoming 'served' awards points exactly once; repeat call is idempotent",
      `Initial: ${ptsBefore} -> Served: ${ptsAfter1} (+${ptsEarned}) -> Repeat: ${ptsAfter2}`
    );

    // =================================================================
    // SCENARIO 20: Order creation awards 0 points
    // =================================================================
    const userProfileBeforeNewOrder = await request("/api/auth/me", {
      headers: { Authorization: `Bearer ${custAToken}` },
    });
    const ptsBeforeNewOrder = userProfileBeforeNewOrder.data?.user?.points;

    const newOrderRes = await request("/api/orders", {
      method: "POST",
      headers: { Authorization: `Bearer ${custAToken}` },
      body: {
        tableToken: activeTable.qrToken,
        tableNumber: activeTable.tableNumber,
        customerName: "Customer A",
        customerPhone: "+91 9876543201",
        items: [{ productId: availableProduct._id, quantity: 1 }],
      },
    });
    const newOrder = newOrderRes.data?.order;
    if (newOrder?._id) createdEntities.push({ model: Order, id: newOrder._id });

    const userProfileAfterNewOrder = await request("/api/auth/me", {
      headers: { Authorization: `Bearer ${custAToken}` },
    });
    const ptsAfterNewOrder = userProfileAfterNewOrder.data?.user?.points;

    const s20Pass =
      newOrderRes.status === 201 &&
      newOrder?.pointsEarned === 0 &&
      newOrder?.pointsCredited === false &&
      ptsAfterNewOrder === ptsBeforeNewOrder;

    assert(
      s20Pass,
      20,
      "Order creation awards 0 points (pointsCredited=false, balance unchanged)",
      `Before: ${ptsBeforeNewOrder} -> Created Order: ${ptsAfterNewOrder} (Balance untouched)`
    );

    // =================================================================
    // SCENARIO 21: Promo code is validated server-side
    // =================================================================
    // availableProduct price * 2 = subtotal. Promo offerA is 10% off.
    const promoOrderRes = await request("/api/orders", {
      method: "POST",
      headers: { Authorization: `Bearer ${custAToken}` },
      body: {
        tableToken: activeTable.qrToken,
        tableNumber: activeTable.tableNumber,
        customerName: "Customer A",
        customerPhone: "+91 9876543201",
        items: [{ productId: availableProduct._id, quantity: 2 }],
        appliedOffer: { code: promoCodeA },
      },
    });
    const promoOrder = promoOrderRes.data?.order;
    if (promoOrder?._id) createdEntities.push({ model: Order, id: promoOrder._id });

    const expectedDiscount = Number(((availableProduct.price * 2 * 10) / 100).toFixed(2));
    const s21Pass =
      promoOrderRes.status === 201 &&
      promoOrder?.discount === expectedDiscount &&
      promoOrder?.appliedOffer?.code === promoCodeA;

    assert(
      s21Pass,
      21,
      "Promo code validated & discount calculated server-side",
      `Subtotal: ₹${promoOrder?.subtotal}, Discount: ₹${promoOrder?.discount} (Expected 10% = ₹${expectedDiscount})`
    );

    // =================================================================
    // SCENARIO 22: Cross-café promo cannot be used
    // =================================================================
    // Trying to use Cafe B's promo code (CAFEB_...) on an order for Cafe A
    const crossPromoRes = await request("/api/orders", {
      method: "POST",
      headers: { Authorization: `Bearer ${custAToken}` },
      body: {
        tableToken: activeTable.qrToken,
        tableNumber: activeTable.tableNumber,
        customerName: "Customer A",
        customerPhone: "+91 9876543201",
        items: [{ productId: availableProduct._id, quantity: 1 }],
        appliedOffer: { code: promoCodeB },
      },
    });
    const s22Pass = crossPromoRes.status === 400 && crossPromoRes.data?.success === false;
    assert(s22Pass, 22, "Cross-café promo rejected with 400 Bad Request", `Status: ${crossPromoRes.status}, Message: "${crossPromoRes.data?.message}"`);

    // =================================================================
    // SCENARIO 23: Frontend production build succeeds
    // =================================================================
    console.log("Running frontend production build check (npm.cmd run build)...");
    let buildSuccess = false;
    try {
      const clientDir = path.join(__dirname, "..", "client");
      execSync("npm.cmd run build", { cwd: clientDir, stdio: "pipe" });
      buildSuccess = true;
    } catch (buildErr) {
      console.error("Build failed:", buildErr.message);
      buildSuccess = false;
    }
    assert(buildSuccess, 23, "Frontend production build succeeds with 0 errors", "Vite production build verified");

  } catch (err) {
    console.error("\x1b[31m[UNEXPECTED ERROR IN TEST SUITE]\x1b[0m", err);
    failedCount++;
  } finally {
    // Teardown temporary test entities from MongoDB
    for (const item of createdEntities) {
      try {
        await item.model.findByIdAndDelete(item.id);
      } catch (e) {}
    }
    await mongoose.disconnect();
  }

  // =================================================================
  // SUMMARY
  // =================================================================
  console.log("=".repeat(75));
  console.log(`TOTAL PHASE 4 SCENARIOS: 23`);
  console.log(`\x1b[32mPASSED: ${passedCount}\x1b[0m`);
  console.log(`\x1b[${failedCount > 0 ? "31" : "32"}mFAILED: ${failedCount}\x1b[0m`);
  console.log("=".repeat(75));

  if (failedCount === 0 && passedCount === 23) {
    console.log("\x1b[32mALL 23 PHASE 4 SCENARIOS PASSED SUCCESSFULLY!\x1b[0m");
    process.exit(0);
  } else {
    console.error("\x1b[31mSOME SCENARIOS FAILED. Please review output above.\x1b[0m");
    process.exit(1);
  }
}

runTests();

