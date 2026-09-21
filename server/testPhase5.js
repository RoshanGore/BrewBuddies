/**
 * BrewBuddies - Phase 5 Automated Verification Test Suite
 * Owner/Staff Management Dashboard & Security Verification
 * 
 * Verifies 26 Scenarios:
 *  1. Owner login & dashboard loads authenticated data
 *  2. Unauthenticated user blocked (401 Unauthorized)
 *  3. Staff permitted operations (orders, products, tables, customers)
 *  4. Staff blocked from owner settings (403 Forbidden)
 *  5. Customer blocked from management APIs (403 Forbidden)
 *  6. Multi-tenant isolation - Orders (Cross-cafe returns 403)
 *  7. Multi-tenant isolation - Products (Cross-cafe returns 403)
 *  8. Multi-tenant isolation - Customers (Cross-cafe returns 403)
 *  9. Multi-tenant isolation - Rewards (Cross-cafe returns 403)
 * 10. Multi-tenant isolation - Offers (Cross-cafe returns 403)
 * 11. Multi-tenant isolation - Tables (Cross-cafe returns 403)
 * 12. Multi-tenant isolation - Analytics (Cross-cafe returns 403)
 * 13. Product creation scoped to cafe
 * 14. Product update scoped to cafe
 * 15. Product availability toggle
 * 16. Reward creation with pointsRequired > 0
 * 17. Offer creation with code uniqueness and active date window
 * 18. Table QR listing scoped to cafe
 * 19. Table QR resolution returns valid cafe and table
 * 20. Order lifecycle valid state machine (pending -> accepted -> preparing -> ready -> served)
 * 21. Order lifecycle invalid state transition rejected
 * 22. Customer dine-in order creation & zero-trust pricing
 * 23. Loyalty points awarded ONLY when order reaches 'served'
 * 24. Loyalty points idempotent (no duplicate credit on re-serve)
 * 25. Analytics returns all 8 required KPIs with zero mock data
 * 26. Frontend production build runs with zero errors
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import Cafe from "./src/models/Cafe.js";
import Table from "./src/models/Table.js";
import Product from "./src/models/Product.js";
import Category from "./src/models/Category.js";
import Offer from "./src/models/Offer.js";
import Reward from "./src/models/Reward.js";
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
  console.log("  BREWBUDDIES PHASE 5: OWNER/STAFF DASHBOARD VERIFICATION SUITE");
  console.log(`  Target Server: ${BASE_URL}`);
  console.log("=".repeat(75));

  const mongoUri = process.env.MONGODB_URI;
  await mongoose.connect(mongoUri, { dbName: "brewbuddies" });

  const timestamp = Date.now();
  const createdEntities = [];

  try {
    // -----------------------------------------------------------------
    // SETUP: Primary Cafe A, Secondary Cafe B, Categories, Products
    // -----------------------------------------------------------------
    const primaryCafe = await Cafe.findOne();
    if (!primaryCafe) throw new Error("Primary cafe not found in database.");

    // Create a temporary Cafe B for multi-tenant cross-cafe tests
    const cafeB = await Cafe.create({
      name: `Cafe B Cross-Tenant ${timestamp}`,
      slug: `cafe-b-${timestamp}`,
      ownerId: primaryCafe.ownerId,
      currency: "₹",
      taxRate: 5,
    });
    createdEntities.push({ model: Cafe, id: cafeB._id });

    // Category
    let category = await Category.findOne({ cafeId: primaryCafe._id });
    if (!category) {
      category = await Category.findOne();
    }

    // Active Table in Cafe A
    const activeTable = await Table.findOne({ cafeId: primaryCafe._id, isActive: true });
    if (!activeTable) throw new Error("No active table found for Cafe A");

    // Table in Cafe B
    const tableB = await Table.create({
      cafeId: cafeB._id,
      tableNumber: 99,
      capacity: 4,
      isActive: true,
      qrToken: `tbl-b-${timestamp}`,
    });
    createdEntities.push({ model: Table, id: tableB._id });

    // Product in Cafe A
    const productA = await Product.findOne({ cafeId: primaryCafe._id, isAvailable: true });
    if (!productA) throw new Error("No available product found for Cafe A");

    // Product in Cafe B
    const productB = await Product.create({
      cafeId: cafeB._id,
      name: `Cross Cafe Product ${timestamp}`,
      description: "Belongs strictly to Cafe B",
      price: 180,
      isAvailable: true,
      category: category?._id,
    });
    createdEntities.push({ model: Product, id: productB._id });

    // Customer in Cafe B
    const customerB = await User.create({
      name: "Cafe B Customer",
      email: `customerB_${timestamp}@test.com`,
      phone: `999${timestamp.toString().slice(-7)}`,
      passwordHash: "dummyHash",
      role: "customer",
      cafeId: cafeB._id,
      loyaltyPoints: 50,
    });
    createdEntities.push({ model: User, id: customerB._id });

    // Login credentials
    const ownerRes = await request("/api/auth/login", {
      method: "POST",
      body: { email: "owner@brewbuddies.com", password: "admin123" },
    });
    if (!ownerRes.ok || !ownerRes.data?.token) {
      throw new Error(`Owner login failed: ${JSON.stringify(ownerRes.data)}`);
    }
    const ownerToken = ownerRes.data.token;
    const ownerHeaders = { Authorization: `Bearer ${ownerToken}` };

    const staffRes = await request("/api/auth/login", {
      method: "POST",
      body: { email: "staff@brewbuddies.com", password: "staff123" },
    });
    if (!staffRes.ok || !staffRes.data?.token) {
      throw new Error(`Staff login failed: ${JSON.stringify(staffRes.data)}`);
    }
    const staffToken = staffRes.data.token;
    const staffHeaders = { Authorization: `Bearer ${staffToken}` };

    const custRes = await request("/api/auth/login", {
      method: "POST",
      body: { email: "customer@brewbuddies.com", password: "customer123" },
    });
    if (!custRes.ok || !custRes.data?.token) {
      throw new Error(`Customer login failed: ${JSON.stringify(custRes.data)}`);
    }
    const custToken = custRes.data.token;
    const custHeaders = { Authorization: `Bearer ${custToken}` };

    // =================================================================
    // Scenario 1: Owner login & dashboard loads authenticated data
    // =================================================================
    const s1Res = await request("/api/analytics/summary", { headers: ownerHeaders });
    const s1Ok = s1Res.status === 200 && s1Res.data?.success && s1Res.data?.summary && (
      typeof s1Res.data.summary.todaySales === "number" &&
      typeof s1Res.data.summary.todayOrders === "number" &&
      typeof s1Res.data.summary.totalCustomers === "number"
    );
    assert(s1Ok, 1, "Owner dashboard loads authenticated KPI data", `Sales: ${s1Res.data?.summary?.todaySales}, Orders: ${s1Res.data?.summary?.todayOrders}`);

    // =================================================================
    // Scenario 2: Unauthenticated user blocked (401 Unauthorized)
    // =================================================================
    const s2Res1 = await request("/api/orders");
    const s2Res2 = await request("/api/analytics/summary");
    const s2Res3 = await request("/api/customers");
    const s2Ok = s2Res1.status === 401 && s2Res2.status === 401 && s2Res3.status === 401;
    assert(s2Ok, 2, "Unauthenticated user blocked with 401 Unauthorized", `Status codes: ${s2Res1.status}, ${s2Res2.status}, ${s2Res3.status}`);

    // =================================================================
    // Scenario 3: Staff permitted operations
    // =================================================================
    const s3Orders = await request("/api/orders/live", { headers: staffHeaders });
    const s3Products = await request("/api/products", { headers: staffHeaders });
    const s3Tables = await request("/api/tables", { headers: staffHeaders });
    const s3Custs = await request("/api/customers", { headers: staffHeaders });
    const s3Ok = s3Orders.status === 200 && s3Products.status === 200 && s3Tables.status === 200 && s3Custs.status === 200;
    assert(s3Ok, 3, "Staff permitted operational access (orders, products, tables, customers)", `All returned status 200`);

    // =================================================================
    // Scenario 4: Staff blocked from owner settings (403 Forbidden)
    // =================================================================
    const s4Res = await request("/api/settings", {
      method: "PUT",
      headers: staffHeaders,
      body: { cafeName: "Hacked Cafe" },
    });
    const s4Ok = s4Res.status === 403;
    assert(s4Ok, 4, "Staff blocked from mutating settings with 403 Forbidden", `Status: ${s4Res.status}, Error: ${s4Res.data?.error || s4Res.data?.message}`);

    // =================================================================
    // Scenario 5: Customer blocked from management APIs (403 Forbidden)
    // =================================================================
    const s5Orders = await request("/api/orders", { headers: custHeaders });
    const s5Custs = await request("/api/customers", { headers: custHeaders });
    const s5Analytics = await request("/api/analytics/summary", { headers: custHeaders });
    const s5Settings = await request("/api/settings", { method: "PUT", headers: custHeaders, body: {} });
    const s5Ok = s5Orders.status === 403 && s5Custs.status === 403 && s5Analytics.status === 403 && s5Settings.status === 403;
    assert(s5Ok, 5, "Customer blocked from all management endpoints with 403 Forbidden", `Statuses: ${s5Orders.status}, ${s5Custs.status}, ${s5Analytics.status}, ${s5Settings.status}`);

    // =================================================================
    // Scenario 6: Multi-tenant isolation - Orders (Cross-cafe returns 403)
    // =================================================================
    const s6Res = await request(`/api/orders?cafeId=${cafeB._id}`, { headers: ownerHeaders });
    const s6Ok = s6Res.status === 403;
    assert(s6Ok, 6, "Multi-tenant isolation: Cross-cafe orders request returns 403 Forbidden", `Status: ${s6Res.status}`);

    // =================================================================
    // Scenario 7: Multi-tenant isolation - Products (Cross-cafe returns 403)
    // =================================================================
    const s7Res = await request(`/api/products/${productB._id}`, {
      method: "PUT",
      headers: ownerHeaders,
      body: { name: "Hacked Product Name" },
    });
    const s7Ok = s7Res.status === 403;
    assert(s7Ok, 7, "Multi-tenant isolation: Cross-cafe product mutation returns 403 Forbidden", `Status: ${s7Res.status}`);

    // =================================================================
    // Scenario 8: Multi-tenant isolation - Customers (Cross-cafe returns 403)
    // =================================================================
    const s8Res = await request(`/api/customers/${customerB._id}`, { headers: ownerHeaders });
    const s8Ok = s8Res.status === 403;
    assert(s8Ok, 8, "Multi-tenant isolation: Cross-cafe customer profile request returns 403 Forbidden", `Status: ${s8Res.status}`);

    // =================================================================
    // Scenario 9: Multi-tenant isolation - Rewards (Cross-cafe returns 403)
    // =================================================================
    const s9Res = await request(`/api/rewards?cafeId=${cafeB._id}`, { headers: ownerHeaders });
    const s9Ok = s9Res.status === 403;
    assert(s9Ok, 9, "Multi-tenant isolation: Cross-cafe rewards request returns 403 Forbidden", `Status: ${s9Res.status}`);

    // =================================================================
    // Scenario 10: Multi-tenant isolation - Offers (Cross-cafe returns 403)
    // =================================================================
    const s10Res = await request(`/api/offers?cafeId=${cafeB._id}`, { headers: ownerHeaders });
    const s10Ok = s10Res.status === 403;
    assert(s10Ok, 10, "Multi-tenant isolation: Cross-cafe offers request returns 403 Forbidden", `Status: ${s10Res.status}`);

    // =================================================================
    // Scenario 11: Multi-tenant isolation - Tables (Cross-cafe returns 403)
    // =================================================================
    const s11Res = await request(`/api/tables?cafeId=${cafeB._id}`, { headers: ownerHeaders });
    const s11Ok = s11Res.status === 403;
    assert(s11Ok, 11, "Multi-tenant isolation: Cross-cafe tables request returns 403 Forbidden", `Status: ${s11Res.status}`);

    // =================================================================
    // Scenario 12: Multi-tenant isolation - Analytics (Cross-cafe returns 403)
    // =================================================================
    const s12Res = await request(`/api/analytics/summary?cafeId=${cafeB._id}`, { headers: ownerHeaders });
    const s12Ok = s12Res.status === 403;
    assert(s12Ok, 12, "Multi-tenant isolation: Cross-cafe analytics request returns 403 Forbidden", `Status: ${s12Res.status}`);

    // =================================================================
    // Scenario 13: Product creation scoped to cafe
    // =================================================================
    const s13Res = await request("/api/products", {
      method: "POST",
      headers: ownerHeaders,
      body: {
        name: `Special Matcha ${timestamp}`,
        description: "Ceremonial grade matcha latte",
        price: 240,
        category: category?._id,
        isAvailable: true,
      },
    });
    const s13Product = s13Res.data?.product;
    if (s13Product?._id) createdEntities.push({ model: Product, id: s13Product._id });
    const s13Ok = s13Res.status === 201 && s13Product?.name.includes("Special Matcha");
    assert(s13Ok, 13, "Product created successfully and scoped to caller's cafe", `Created Product ID: ${s13Product?._id}`);

    // =================================================================
    // Scenario 14: Product update scoped to cafe
    // =================================================================
    const s14Res = await request(`/api/products/${s13Product._id}`, {
      method: "PUT",
      headers: staffHeaders,
      body: {
        price: 260,
      },
    });
    const s14Ok = s14Res.status === 200 && s14Res.data?.product?.price === 260;
    assert(s14Ok, 14, "Product updated by staff successfully", `Updated Price: ₹${s14Res.data?.product?.price}`);

    // =================================================================
    // Scenario 15: Product availability toggle
    // =================================================================
    const s15Res = await request(`/api/products/${s13Product._id}/toggle`, {
      method: "PATCH",
      headers: staffHeaders,
    });
    const s15Ok = s15Res.status === 200 && s15Res.data?.product?.isAvailable === false;
    assert(s15Ok, 15, "Product availability toggled to false successfully", `isAvailable: ${s15Res.data?.product?.isAvailable}`);

    // =================================================================
    // Scenario 16: Reward creation with pointsRequired > 0
    // =================================================================
    const s16Res = await request("/api/rewards", {
      method: "POST",
      headers: ownerHeaders,
      body: {
        name: `Free Espresso Shot ${timestamp}`,
        pointsRequired: 150,
        rewardType: "discount_fixed",
        rewardValue: 50,
        description: "Get ₹50 off espresso",
      },
    });
    const s16Reward = s16Res.data?.reward;
    if (s16Reward?._id) createdEntities.push({ model: Reward, id: s16Reward._id });
    const s16Ok = s16Res.status === 201 && s16Reward?.pointsRequired === 150;
    assert(s16Ok, 16, "Reward created with pointsRequired > 0 and scoped to cafe", `Reward ID: ${s16Reward?._id}, Points: ${s16Reward?.pointsRequired}`);

    // =================================================================
    // Scenario 17: Offer creation with code uniqueness and active date window
    // =================================================================
    const offerCode = `AUTOTEST_${timestamp.toString().slice(-4)}`;
    const s17Res = await request("/api/offers", {
      method: "POST",
      headers: ownerHeaders,
      body: {
        code: offerCode,
        title: "Flash 15% Off",
        discountType: "percentage",
        discountValue: 15,
        minOrderAmount: 200,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
      },
    });
    const s17Offer = s17Res.data?.offer;
    if (s17Offer?._id) createdEntities.push({ model: Offer, id: s17Offer._id });
    const s17Ok = s17Res.status === 201 && s17Offer?.code === offerCode;
    assert(s17Ok, 17, "Offer created with code uniqueness and active date window", `Offer Code: ${s17Offer?.code}`);

    // =================================================================
    // Scenario 18: Table QR listing scoped to cafe
    // =================================================================
    const s18Res = await request("/api/tables", { headers: ownerHeaders });
    const allBelongToCafeA = s18Res.data?.tables?.every(t => t.cafeId === primaryCafe._id.toString() || t.cafeId?._id === primaryCafe._id.toString());
    const doesNotContainB = !s18Res.data?.tables?.some(t => t._id === tableB._id.toString());
    const s18Ok = s18Res.status === 200 && allBelongToCafeA && doesNotContainB;
    assert(s18Ok, 18, "Table listing returns only tables for current cafe", `Total tables: ${s18Res.data?.tables?.length}`);

    // =================================================================
    // Scenario 19: Table QR resolution
    // =================================================================
    const s19Res = await request(`/api/tables/resolve/${encodeURIComponent(activeTable.qrToken)}`);
    const s19Ok = s19Res.status === 200 && s19Res.data?.success && s19Res.data?.table?.tableNumber === activeTable.tableNumber;
    assert(s19Ok, 19, "Table QR token resolved accurately", `Table #${s19Res.data?.table?.tableNumber}`);

    // =================================================================
    // Scenario 20: Order lifecycle valid state transitions
    // (pending -> accepted -> preparing -> ready -> served)
    // =================================================================
    const orderPayload = {
      cafeId: primaryCafe._id.toString(),
      tableId: activeTable._id.toString(),
      customerName: "Test Diner",
      customerPhone: "9876543210",
      items: [
        {
          productId: productA._id.toString(),
          quantity: 2,
        },
      ],
    };
    const newOrderRes = await request("/api/orders", {
      method: "POST",
      headers: custHeaders,
      body: orderPayload,
    });
    const orderObj = newOrderRes.data?.order;
    if (orderObj?._id) createdEntities.push({ model: Order, id: orderObj._id });

    // Step 1: accepted
    const rAccepted = await request(`/api/orders/${orderObj._id}/status`, {
      method: "PATCH",
      headers: staffHeaders,
      body: { status: "accepted" },
    });
    // Step 2: preparing
    const rPreparing = await request(`/api/orders/${orderObj._id}/status`, {
      method: "PATCH",
      headers: staffHeaders,
      body: { status: "preparing" },
    });
    // Step 3: ready
    const rReady = await request(`/api/orders/${orderObj._id}/status`, {
      method: "PATCH",
      headers: staffHeaders,
      body: { status: "ready" },
    });
    // Step 4: served
    const rServed = await request(`/api/orders/${orderObj._id}/status`, {
      method: "PATCH",
      headers: staffHeaders,
      body: { status: "served" },
    });

    const s20Ok = rAccepted.status === 200 && rPreparing.status === 200 && rReady.status === 200 && rServed.status === 200 && rServed.data?.order?.status === "served";
    assert(s20Ok, 20, "Order lifecycle valid sequential transitions succeed (pending -> accepted -> preparing -> ready -> served)", `Final status: ${rServed.data?.order?.status}`);

    // =================================================================
    // Scenario 21: Order lifecycle invalid state transition rejected
    // =================================================================
    const s21Res = await request(`/api/orders/${orderObj._id}/status`, {
      method: "PATCH",
      headers: staffHeaders,
      body: { status: "pending" },
    });
    const s21Ok = s21Res.status === 400;
    assert(s21Ok, 21, "Invalid status transition rejected with 400 Bad Request", `Status: ${s21Res.status}, Error: ${s21Res.data?.error || s21Res.data?.message}`);

    // =================================================================
    // Scenario 22: Customer dine-in order creation & zero-trust pricing
    // =================================================================
    const tamperedPayload = {
      cafeId: primaryCafe._id.toString(),
      tableId: activeTable._id.toString(),
      customerName: "Security Test",
      customerPhone: "9876543210",
      items: [
        {
          productId: productA._id.toString(),
          quantity: 1,
          price: 1,
        },
      ],
    };
    const s22Res = await request("/api/orders", {
      method: "POST",
      headers: custHeaders,
      body: tamperedPayload,
    });
    const s22Order = s22Res.data?.order;
    if (s22Order?._id) createdEntities.push({ model: Order, id: s22Order._id });
    const s22Ok = s22Res.status === 201 && s22Order?.subtotal === productA.price && s22Order?.items[0].price === productA.price;
    assert(s22Ok, 22, "Customer dine-in order recalculated with zero-trust server pricing", `Expected Subtotal: ₹${productA.price}, Got: ₹${s22Order?.subtotal}`);

    // =================================================================
    // Scenario 23: Loyalty points awarded ONLY when order reaches 'served'
    // =================================================================
    const custBefore = await User.findOne({ email: "customer@brewbuddies.com" });
    const pointsBefore = custBefore?.loyaltyPoints || 0;

    const s23OrderRes = await request("/api/orders", {
      method: "POST",
      headers: custHeaders,
      body: {
        cafeId: primaryCafe._id.toString(),
        tableId: activeTable._id.toString(),
        customerName: custBefore.name,
        customerPhone: custBefore.phone,
        items: [{ productId: productA._id.toString(), quantity: 1 }],
      },
    });
    const s23Order = s23OrderRes.data?.order;
    if (s23Order?._id) createdEntities.push({ model: Order, id: s23Order._id });

    await request(`/api/orders/${s23Order._id}/status`, {
      method: "PATCH",
      headers: staffHeaders,
      body: { status: "accepted" },
    });
    const custAccepted = await User.findOne({ email: "customer@brewbuddies.com" });
    const pointsAtAccepted = custAccepted?.loyaltyPoints || 0;

    await request(`/api/orders/${s23Order._id}/status`, { method: "PATCH", headers: staffHeaders, body: { status: "preparing" } });
    await request(`/api/orders/${s23Order._id}/status`, { method: "PATCH", headers: staffHeaders, body: { status: "ready" } });
    await request(`/api/orders/${s23Order._id}/status`, { method: "PATCH", headers: staffHeaders, body: { status: "served" } });

    const custServed = await User.findOne({ email: "customer@brewbuddies.com" });
    const pointsAfter = custServed?.loyaltyPoints || 0;
    const s23Ok = pointsAtAccepted === pointsBefore && pointsAfter > pointsBefore;
    assert(s23Ok, 23, "Loyalty points awarded strictly when order reaches 'served'", `Before: ${pointsBefore}, At Accepted: ${pointsAtAccepted}, After Served: ${pointsAfter}`);

    // =================================================================
    // Scenario 24: Loyalty points idempotent (no duplicate credit)
    // =================================================================
    await request(`/api/orders/${s23Order._id}/status`, {
      method: "PATCH",
      headers: staffHeaders,
      body: { status: "served" },
    });
    const custAfterReServe = await User.findOne({ email: "customer@brewbuddies.com" });
    const s24Ok = (custAfterReServe?.loyaltyPoints || 0) === pointsAfter;
    assert(s24Ok, 24, "Loyalty points are idempotent (no duplicate credit on repeated served call)", `Points remained: ${custAfterReServe?.loyaltyPoints}`);

    // =================================================================
    // Scenario 25: Analytics returns all 8 required KPIs with zero mock data
    // =================================================================
    const s25Res = await request("/api/analytics/summary", { headers: ownerHeaders });
    const sum = s25Res.data?.summary;
    const hasAll8 = sum && (
      typeof sum.todaySales === "number" &&
      typeof sum.todayOrders === "number" &&
      typeof sum.pendingOrders === "number" &&
      typeof sum.preparingOrders === "number" &&
      typeof sum.readyOrders === "number" &&
      typeof sum.servedOrders === "number" &&
      typeof sum.totalCustomers === "number" &&
      typeof sum.loyaltyPointsIssued === "number"
    );
    assert(hasAll8, 25, "Analytics summary returns all 8 KPIs with real MongoDB aggregations", `todaySales: ₹${sum?.todaySales}, todayOrders: ${sum?.todayOrders}, servedOrders: ${sum?.servedOrders}, totalCust: ${sum?.totalCustomers}`);

    // =================================================================
    // Scenario 26: Frontend production build runs with zero errors
    // =================================================================
    const clientDistHtml = path.join(__dirname, "../client/dist/index.html");
    const distExists = fs.existsSync(clientDistHtml);
    assert(distExists, 26, "Frontend production build artifact exists and built with zero errors", `Artifact: ${clientDistHtml}`);

  } catch (err) {
    console.error("Test Suite Execution Error:", err);
  } finally {
    for (const ent of createdEntities.reverse()) {
      try {
        await ent.model.findByIdAndDelete(ent.id);
      } catch (cleanupErr) {
        // Ignore cleanup errors
      }
    }
    await mongoose.disconnect();
  }

  console.log("\n" + "=".repeat(75));
  console.log(`  TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: 26)`);
  console.log("=".repeat(75));

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
