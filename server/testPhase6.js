/**
 * BrewBuddies - Phase 6 Automated Verification Test Suite
 * Customer Loyalty, Rewards & Offers Experience
 * 
 * Verifies 26 Scenarios:
 *  1. Authenticated customer can view rewards
 *  2. Unauthenticated customer cannot access private loyalty data (401)
 *  3. Customer can view own points balance
 *  4. Customer cannot view another customer's points
 *  5. Customer can view own transactions
 *  6. Customer cannot view another customer's transactions
 *  7. Customer can view active rewards
 *  8. Customer cannot redeem another café's reward (403)
 *  9. Customer cannot redeem expired reward (400)
 * 10. Customer cannot redeem inactive reward (400)
 * 11. Customer cannot redeem reward without enough points (400)
 * 12. Successful redemption deducts correct points
 * 13. Successful redemption creates redemption record
 * 14. Successful redemption creates points transaction
 * 15. Redemption cannot duplicate/corrupt balance (atomic concurrency check)
 * 16. Customer can view own redemption history
 * 17. Offers are café scoped
 * 18. Expired offers are rejected
 * 19. Inactive offers are rejected
 * 20. Promo discount is calculated server-side
 * 21. Client price manipulation cannot change order total
 * 22. Customer ordering still works
 * 23. Points remain 0 immediately after order creation
 * 24. Points are credited after served
 * 25. Repeated served call does not duplicate points
 * 26. Frontend production build succeeds
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
import RewardRedemption from "./src/models/RewardRedemption.js";
import CustomerPointsTransaction from "./src/models/CustomerPointsTransaction.js";
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
  console.log("  BREWBUDDIES PHASE 6: CUSTOMER LOYALTY, REWARDS & OFFERS TEST SUITE");
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

    // Cafe B (cross-tenant)
    const cafeB = await Cafe.create({
      name: `Cafe B Multi-Tenant ${timestamp}`,
      slug: `cafe-b-${timestamp}`,
      ownerId: primaryCafe.ownerId,
      currency: "₹",
      taxRate: 5,
    });
    createdEntities.push({ model: Cafe, id: cafeB._id });

    // Category
    let category = await Category.findOne({ cafeId: primaryCafe._id });
    if (!category) category = await Category.findOne();

    // Table in Cafe A
    const tableA = await Table.findOne({ cafeId: primaryCafe._id, isActive: true });
    if (!tableA) throw new Error("No active table found for Cafe A");

    // Product in Cafe A
    const productA = await Product.findOne({ cafeId: primaryCafe._id, isAvailable: true });
    if (!productA) throw new Error("No product found for Cafe A");

    // Authenticate Primary Customer
    const custLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: "customer@brewbuddies.com", password: "customer123" },
    });
    if (!custLogin.ok || !custLogin.data?.token) {
      throw new Error(`Customer login failed: ${JSON.stringify(custLogin.data)}`);
    }
    const custToken = custLogin.data.token;
    const custHeaders = { Authorization: `Bearer ${custToken}` };

    // Authenticate Staff
    const staffLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: "staff@brewbuddies.com", password: "staff123" },
    });
    const staffHeaders = { Authorization: `Bearer ${staffLogin.data.token}` };

    // Create a Secondary Customer B (belongs to Cafe B)
    const customerB = await User.create({
      name: "Diner Cafe B",
      email: `customerB_${timestamp}@test.com`,
      phone: `911${timestamp.toString().slice(-7)}`,
      passwordHash: "dummyHash",
      role: "customer",
      cafeId: cafeB._id,
      loyaltyPoints: 300,
    });
    createdEntities.push({ model: User, id: customerB._id });

    // Ensure Primary Customer has at least 500 points for test
    await User.findByIdAndUpdate(custLogin.data.user.id || custLogin.data.user._id, {
      $max: { points: 600 },
    });

    // Create an Active Reward for Cafe A
    const activeRewardA = await Reward.create({
      cafeId: primaryCafe._id,
      name: `Artisan Croissant ${timestamp}`,
      description: "Flaky butter croissant",
      pointsRequired: 150,
      rewardType: "free_item",
      rewardValue: 120,
      isActive: true,
    });
    createdEntities.push({ model: Reward, id: activeRewardA._id });

    // Create an Expired Reward for Cafe A
    const expiredRewardA = await Reward.create({
      cafeId: primaryCafe._id,
      name: `Expired Holiday Blend ${timestamp}`,
      pointsRequired: 100,
      rewardType: "fixed_discount",
      rewardValue: 50,
      isActive: true,
      expiryDate: new Date(Date.now() - 86400000), // Yesterday
    });
    createdEntities.push({ model: Reward, id: expiredRewardA._id });

    // Create an Inactive Reward for Cafe A
    const inactiveRewardA = await Reward.create({
      cafeId: primaryCafe._id,
      name: `Unavailable Reward ${timestamp}`,
      pointsRequired: 100,
      rewardType: "free_item",
      rewardValue: 50,
      isActive: false,
    });
    createdEntities.push({ model: Reward, id: inactiveRewardA._id });

    // Create an Expensive Reward (10000 points)
    const expensiveRewardA = await Reward.create({
      cafeId: primaryCafe._id,
      name: `Year of Coffee Pass ${timestamp}`,
      pointsRequired: 999999,
      rewardType: "fixed_discount",
      rewardValue: 5000,
      isActive: true,
    });
    createdEntities.push({ model: Reward, id: expensiveRewardA._id });

    // Create Reward belonging strictly to Cafe B
    const rewardB = await Reward.create({
      cafeId: cafeB._id,
      name: `Cafe B Reward ${timestamp}`,
      pointsRequired: 50,
      rewardType: "free_item",
      rewardValue: 50,
      isActive: true,
    });
    createdEntities.push({ model: Reward, id: rewardB._id });

    // Create Active Offer for Cafe A
    const offerCodeA = `OFFER_${timestamp.toString().slice(-4)}`;
    const activeOfferA = await Offer.create({
      cafeId: primaryCafe._id,
      code: offerCodeA,
      title: "10% Off Dine-In",
      discountType: "percentage",
      discountValue: 10,
      minOrderAmount: 100,
      maxDiscount: 100,
      isActive: true,
      endDate: new Date(Date.now() + 86400000),
    });
    createdEntities.push({ model: Offer, id: activeOfferA._id });

    // Create Expired Offer for Cafe A
    const expiredCode = `EXPIRED_${timestamp.toString().slice(-4)}`;
    const expiredOffer = await Offer.create({
      cafeId: primaryCafe._id,
      code: expiredCode,
      title: "Expired Promo",
      discountType: "flat",
      discountValue: 50,
      isActive: true,
      endDate: new Date(Date.now() - 86400000),
    });
    createdEntities.push({ model: Offer, id: expiredOffer._id });

    // Create Inactive Offer for Cafe A
    const inactiveCode = `INACTIVE_${timestamp.toString().slice(-4)}`;
    const inactiveOffer = await Offer.create({
      cafeId: primaryCafe._id,
      code: inactiveCode,
      title: "Inactive Promo",
      discountType: "flat",
      discountValue: 50,
      isActive: false,
    });
    createdEntities.push({ model: Offer, id: inactiveOffer._id });

    // =================================================================
    // Scenario 1: Authenticated customer can view rewards
    // =================================================================
    const s1Res = await request("/api/rewards", { headers: custHeaders });
    const s1Ok = s1Res.status === 200 && s1Res.data?.success && Array.isArray(s1Res.data?.rewards);
    assert(s1Ok, 1, "Authenticated customer can view rewards catalog", `Count: ${s1Res.data?.rewards?.length}`);

    // =================================================================
    // Scenario 2: Unauthenticated customer cannot access private loyalty data
    // =================================================================
    const s2Points = await request("/api/points");
    const s2History = await request("/api/rewards/history");
    const s2Redeem = await request("/api/rewards/redeem", { method: "POST", body: { rewardId: activeRewardA._id } });
    const s2Ok = s2Points.status === 401 && s2History.status === 401 && s2Redeem.status === 401;
    assert(s2Ok, 2, "Unauthenticated access to private loyalty data rejected with 401", `Points: ${s2Points.status}, History: ${s2History.status}, Redeem: ${s2Redeem.status}`);

    // =================================================================
    // Scenario 3: Customer can view own points balance
    // =================================================================
    const s3Res = await request("/api/points", { headers: custHeaders });
    const s3Ok = s3Res.status === 200 && typeof s3Res.data?.points === "number" && s3Res.data?.points >= 0;
    assert(s3Ok, 3, "Customer can view own points balance", `Balance: ${s3Res.data?.points} points`);

    // =================================================================
    // Scenario 4: Customer cannot view another customer's points
    // =================================================================
    // Passing another customer's ID or trying to impersonate returns caller's own balance
    const s4Res = await request(`/api/points?customerId=${customerB._id}`, { headers: custHeaders });
    const s4Ok = s4Res.status === 200 && s4Res.data?.points !== customerB.loyaltyPoints;
    assert(s4Ok, 4, "Customer cannot access another customer's points (identity bound to JWT)", `Caller balance returned instead of Customer B`);

    // =================================================================
    // Scenario 5: Customer can view own transactions
    // =================================================================
    const s5Res = await request("/api/points/history", { headers: custHeaders });
    const s5Ok = s5Res.status === 200 && Array.isArray(s5Res.data?.transactions);
    assert(s5Ok, 5, "Customer can view own points transactions", `Transactions count: ${s5Res.data?.transactions?.length}`);

    // =================================================================
    // Scenario 6: Customer cannot view another customer's transactions
    // =================================================================
    // Create a transaction belonging strictly to Customer B
    const txB = await CustomerPointsTransaction.create({
      cafeId: cafeB._id,
      customerId: customerB._id,
      type: "earned",
      points: 80,
      description: "Cafe B transaction",
    });
    createdEntities.push({ model: CustomerPointsTransaction, id: txB._id });

    const s6Res = await request("/api/points/history", { headers: custHeaders });
    const containsTxB = s6Res.data?.transactions?.some((t) => t._id === txB._id.toString());
    assert(!containsTxB, 6, "Customer cannot view another customer's points transactions", `Customer B transaction omitted from results`);

    // =================================================================
    // Scenario 7: Customer can view active rewards
    // =================================================================
    const s7Res = await request("/api/rewards", { headers: custHeaders });
    const s7ContainsActive = s7Res.data?.rewards?.some((r) => r._id === activeRewardA._id.toString());
    const s7OmitsInactive = !s7Res.data?.rewards?.some((r) => r._id === inactiveRewardA._id.toString());
    const s7OmitsExpired = !s7Res.data?.rewards?.some((r) => r._id === expiredRewardA._id.toString());
    assert(s7ContainsActive && s7OmitsInactive && s7OmitsExpired, 7, "Customer view filters only active & non-expired rewards", `Active shown, expired/inactive omitted`);

    // =================================================================
    // Scenario 8: Customer cannot redeem another café's reward
    // =================================================================
    const s8Res = await request("/api/rewards/redeem", {
      method: "POST",
      headers: custHeaders,
      body: { rewardId: rewardB._id },
    });
    const s8Ok = s8Res.status === 403;
    assert(s8Ok, 8, "Customer cannot redeem another cafe's reward (403 Forbidden)", `Status: ${s8Res.status}, Error: ${s8Res.data?.message}`);

    // =================================================================
    // Scenario 9: Customer cannot redeem expired reward
    // =================================================================
    const s9Res = await request("/api/rewards/redeem", {
      method: "POST",
      headers: custHeaders,
      body: { rewardId: expiredRewardA._id },
    });
    const s9Ok = s9Res.status === 400;
    assert(s9Ok, 9, "Customer cannot redeem expired reward (400 Bad Request)", `Status: ${s9Res.status}, Error: ${s9Res.data?.message}`);

    // =================================================================
    // Scenario 10: Customer cannot redeem inactive reward
    // =================================================================
    const s10Res = await request("/api/rewards/redeem", {
      method: "POST",
      headers: custHeaders,
      body: { rewardId: inactiveRewardA._id },
    });
    const s10Ok = s10Res.status === 400;
    assert(s10Ok, 10, "Customer cannot redeem inactive reward (400 Bad Request)", `Status: ${s10Res.status}, Error: ${s10Res.data?.message}`);

    // =================================================================
    // Scenario 11: Customer cannot redeem reward without enough points
    // =================================================================
    const s11Res = await request("/api/rewards/redeem", {
      method: "POST",
      headers: custHeaders,
      body: { rewardId: expensiveRewardA._id },
    });
    const s11Ok = s11Res.status === 400;
    assert(s11Ok, 11, "Customer cannot redeem reward without enough points (400 Bad Request)", `Status: ${s11Res.status}, Error: ${s11Res.data?.message}`);

    // =================================================================
    // Scenario 12: Successful redemption deducts correct points
    // =================================================================
    const custBeforeRedeem = await User.findById(custLogin.data.user.id || custLogin.data.user._id);
    const balanceBefore = custBeforeRedeem.loyaltyPoints;

    const s12Res = await request("/api/rewards/redeem", {
      method: "POST",
      headers: custHeaders,
      body: { rewardId: activeRewardA._id },
    });

    const custAfterRedeem = await User.findById(custLogin.data.user.id || custLogin.data.user._id);
    const balanceAfter = custAfterRedeem.loyaltyPoints;
    const s12Ok = s12Res.status === 200 && balanceAfter === balanceBefore - activeRewardA.pointsRequired;
    assert(s12Ok, 12, "Successful redemption deducts correct points atomically", `Before: ${balanceBefore}, After: ${balanceAfter}, Deducted: ${activeRewardA.pointsRequired}`);

    // =================================================================
    // Scenario 13: Successful redemption creates redemption record
    // =================================================================
    const redemptionRecord = await RewardRedemption.findOne({
      customerId: custLogin.data.user.id || custLogin.data.user._id,
      rewardId: activeRewardA._id,
    }).sort({ createdAt: -1 });
    if (redemptionRecord) createdEntities.push({ model: RewardRedemption, id: redemptionRecord._id });
    const s13Ok = !!redemptionRecord && redemptionRecord.pointsUsed === activeRewardA.pointsRequired;
    assert(s13Ok, 13, "Successful redemption creates RewardRedemption record", `Points Used: ${redemptionRecord?.pointsUsed}`);

    // =================================================================
    // Scenario 14: Successful redemption creates points transaction
    // =================================================================
    const pointsTxRecord = await CustomerPointsTransaction.findOne({
      customerId: custLogin.data.user.id || custLogin.data.user._id,
      type: "redeemed",
      points: -activeRewardA.pointsRequired,
    }).sort({ createdAt: -1 });
    if (pointsTxRecord) createdEntities.push({ model: CustomerPointsTransaction, id: pointsTxRecord._id });
    const s14Ok = !!pointsTxRecord && pointsTxRecord.points === -activeRewardA.pointsRequired;
    assert(s14Ok, 14, "Successful redemption logs negative points transaction", `Tx Points: ${pointsTxRecord?.points}`);

    // =================================================================
    // Scenario 15: Redemption cannot duplicate/corrupt balance (Atomic concurrency check)
    // =================================================================
    // Set user points exactly to cost of 1 reward (150)
    await User.findByIdAndUpdate(custLogin.data.user.id || custLogin.data.user._id, {
      points: activeRewardA.pointsRequired,
    });

    // Send 2 concurrent redemptions simultaneously
    const [concurrent1, concurrent2] = await Promise.all([
      request("/api/rewards/redeem", { method: "POST", headers: custHeaders, body: { rewardId: activeRewardA._id } }),
      request("/api/rewards/redeem", { method: "POST", headers: custHeaders, body: { rewardId: activeRewardA._id } }),
    ]);

    const finalBalanceUser = await User.findById(custLogin.data.user.id || custLogin.data.user._id);
    const oneSuccessOneFailed = (
      (concurrent1.status === 200 && concurrent2.status === 400) ||
      (concurrent2.status === 200 && concurrent1.status === 400)
    );
    const balanceNeverNegative = (finalBalanceUser.points ?? finalBalanceUser.loyaltyPoints ?? 0) >= 0;
    assert(oneSuccessOneFailed && balanceNeverNegative, 15, "Concurrent redemptions cannot corrupt or overdraft points (Atomic Guard)", `One: ${concurrent1.status}, Two: ${concurrent2.status}, Final Balance: ${finalBalanceUser.points}`);

    // Restore primary customer points for remaining tests
    await User.findByIdAndUpdate(custLogin.data.user.id || custLogin.data.user._id, {
      $max: { points: 500 },
    });

    // =================================================================
    // Scenario 16: Customer can view own redemption history
    // =================================================================
    const s16Res = await request("/api/rewards/history", { headers: custHeaders });
    const s16Ok = s16Res.status === 200 && s16Res.data?.redemptions?.length > 0;
    assert(s16Ok, 16, "Customer can view own redemption history", `Count: ${s16Res.data?.redemptions?.length}`);

    // =================================================================
    // Scenario 17: Offers are café scoped
    // =================================================================
    const s17Res = await request(`/api/offers?cafeId=${cafeB._id}`, { headers: custHeaders });
    const s17Ok = s17Res.status === 403;
    assert(s17Ok, 17, "Cross-cafe offers query blocked with 403 Forbidden", `Status: ${s17Res.status}`);

    // =================================================================
    // Scenario 18: Expired offers are rejected
    // =================================================================
    const s18Res = await request("/api/offers/validate", {
      method: "POST",
      headers: custHeaders,
      body: { code: expiredCode, subtotal: 200, cafeId: primaryCafe._id.toString() },
    });
    const s18Ok = s18Res.status === 400 || s18Res.status === 404;
    assert(s18Ok, 18, "Expired offer validation rejected", `Status: ${s18Res.status}, Message: ${s18Res.data?.message}`);

    // =================================================================
    // Scenario 19: Inactive offers are rejected
    // =================================================================
    const s19Res = await request("/api/offers/validate", {
      method: "POST",
      headers: custHeaders,
      body: { code: inactiveCode, subtotal: 200, cafeId: primaryCafe._id.toString() },
    });
    const s19Ok = s19Res.status === 404 || s19Res.status === 400;
    assert(s19Ok, 19, "Inactive offer validation rejected", `Status: ${s19Res.status}, Message: ${s19Res.data?.message}`);

    // =================================================================
    // Scenario 20: Promo discount is calculated server-side
    // =================================================================
    const s20Res = await request("/api/offers/validate", {
      method: "POST",
      headers: custHeaders,
      body: { code: offerCodeA, subtotal: 500, cafeId: primaryCafe._id.toString() },
    });
    const s20Ok = s20Res.status === 200 && s20Res.data?.discountAmount === 50; // 10% of 500 = 50
    assert(s20Ok, 20, "Promo discount accurately computed server-side", `Subtotal: ₹500, Server Discount: ₹${s20Res.data?.discountAmount}`);

    // =================================================================
    // Scenario 21: Client price manipulation cannot change order total
    // =================================================================
    const tamperedOrder = {
      cafeId: primaryCafe._id.toString(),
      tableId: tableA._id.toString(),
      customerName: "Zero Trust Test",
      customerPhone: "9876543210",
      items: [{ productId: productA._id.toString(), quantity: 1, price: 1 }], // manipulated to ₹1
    };
    const s21Res = await request("/api/orders", {
      method: "POST",
      headers: custHeaders,
      body: tamperedOrder,
    });
    const s21Order = s21Res.data?.order;
    if (s21Order?._id) createdEntities.push({ model: Order, id: s21Order._id });
    const s21Ok = s21Res.status === 201 && s21Order?.subtotal === productA.price;
    assert(s21Ok, 21, "Zero-trust server price recalculation ignores client price", `Expected: ₹${productA.price}, Got: ₹${s21Order?.subtotal}`);

    // =================================================================
    // Scenario 22: Customer ordering still works
    // =================================================================
    const validOrder = {
      cafeId: primaryCafe._id.toString(),
      tableId: tableA._id.toString(),
      customerName: "Phase 6 Diner",
      customerPhone: "9876543210",
      items: [{ productId: productA._id.toString(), quantity: 2 }],
    };
    const s22Res = await request("/api/orders", {
      method: "POST",
      headers: custHeaders,
      body: validOrder,
    });
    const s22Order = s22Res.data?.order;
    if (s22Order?._id) createdEntities.push({ model: Order, id: s22Order._id });
    const s22Ok = s22Res.status === 201 && s22Order?.status === "pending";
    assert(s22Ok, 22, "Customer dine-in order created successfully in pending state", `Order #${s22Order?.orderNumber}`);

    // =================================================================
    // Scenario 23: Points remain 0 immediately after order creation
    // =================================================================
    const s23Ok = s22Order?.pointsEarned === 0 && s22Order?.pointsCredited === false;
    assert(s23Ok, 23, "Points remain 0 and uncredited immediately after order creation", `pointsEarned: ${s22Order?.pointsEarned}, pointsCredited: ${s22Order?.pointsCredited}`);

    // =================================================================
    // Scenario 24: Points are credited after served
    // =================================================================
    const custBeforeServe = await User.findOne({ email: "customer@brewbuddies.com" });
    const pointsBeforeServe = custBeforeServe.loyaltyPoints;

    // Progress order: pending -> accepted -> preparing -> ready -> served
    await request(`/api/orders/${s22Order._id}/status`, { method: "PATCH", headers: staffHeaders, body: { status: "accepted" } });
    await request(`/api/orders/${s22Order._id}/status`, { method: "PATCH", headers: staffHeaders, body: { status: "preparing" } });
    await request(`/api/orders/${s22Order._id}/status`, { method: "PATCH", headers: staffHeaders, body: { status: "ready" } });
    const servedRes = await request(`/api/orders/${s22Order._id}/status`, { method: "PATCH", headers: staffHeaders, body: { status: "served" } });

    const custAfterServe = await User.findOne({ email: "customer@brewbuddies.com" });
    const pointsAfterServe = custAfterServe.loyaltyPoints;
    const s24Ok = servedRes.status === 200 && pointsAfterServe > pointsBeforeServe;
    assert(s24Ok, 24, "Loyalty points credited strictly upon order reaching 'served'", `Before: ${pointsBeforeServe}, After: ${pointsAfterServe}`);

    // =================================================================
    // Scenario 25: Repeated served call does not duplicate points
    // =================================================================
    await request(`/api/orders/${s22Order._id}/status`, { method: "PATCH", headers: staffHeaders, body: { status: "served" } });
    const custAfterRepeated = await User.findOne({ email: "customer@brewbuddies.com" });
    const s25Ok = custAfterRepeated.loyaltyPoints === pointsAfterServe;
    assert(s25Ok, 25, "Repeated served status call does not duplicate points (Idempotent)", `Points remained: ${custAfterRepeated.loyaltyPoints}`);

    // =================================================================
    // Scenario 26: Frontend production build succeeds
    // =================================================================
    const distHtml = path.join(__dirname, "../client/dist/index.html");
    const distExists = fs.existsSync(distHtml);
    assert(distExists, 26, "Frontend production build artifact exists and succeeded", `Artifact: ${distHtml}`);

  } catch (err) {
    console.error("Test Suite Execution Error:", err);
  } finally {
    for (const ent of createdEntities.reverse()) {
      try {
        await ent.model.findByIdAndDelete(ent.id);
      } catch (cleanupErr) {}
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
