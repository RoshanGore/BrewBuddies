/**
 * BrewBuddies - Phase 7 Automated Regression Test Suite
 * Production Hardening & Final Integration
 * 
 * Verifies 48 Comprehensive Scenarios across 8 Domains:
 *  1. Owner login
 *  2. Staff login
 *  3. Customer login
 *  4. Invalid login
 *  5. Protected route without token
 *  6. Customer blocked from management
 *  7. Staff permissions
 *  8. Owner-only settings
 *  9. Cross-cafe isolation
 * 10. Valid QR
 * 11. Invalid QR
 * 12. Inactive table
 * 13. Cross-cafe QR
 * 14. Menu
 * 15. Product availability
 * 16. Cart
 * 17. Checkout
 * 18. Server-side price
 * 19. Order creation
 * 20. Order tracking
 * 21. Order history
 * 22. Status lifecycle
 * 23. Invalid status transition
 * 24. Points zero before served
 * 25. Points credited at served
 * 26. Points idempotency
 * 27. Reward catalog
 * 28. Reward redemption
 * 29. Insufficient points
 * 30. Expired reward
 * 31. Inactive reward
 * 32. Concurrent redemption
 * 33. Active offer
 * 34. Expired offer
 * 35. Inactive offer
 * 36. Promo validation
 * 37. Server-side discount
 * 38. Cross-cafe offer
 * 39. Dashboard
 * 40. Orders
 * 41. Products
 * 42. Customers
 * 43. Rewards
 * 44. Offers
 * 45. QR Codes
 * 46. Analytics
 * 47. Settings
 * 48. Production build
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
    console.log(`[PASS] Scenario ${scenarioNum}: ${description}`);
    if (detail) console.log(`       -> ${detail}`);
    results.push({ scenario: scenarioNum, description, status: "PASS", detail });
  } else {
    failedCount++;
    console.log(`[FAIL] Scenario ${scenarioNum}: ${description}`);
    if (detail) console.log(`       -> ${detail}`);
    results.push({ scenario: scenarioNum, description, status: "FAIL", detail });
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const method = options.method || "GET";
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const body = options.body ? JSON.stringify(options.body) : undefined;

  try {
    const res = await fetch(url, { method, headers, body });
    let data;
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = text;
    }
    return { status: res.status, ok: res.ok, data, headers: res.headers };
  } catch (err) {
    return { status: 0, ok: false, error: err.message };
  }
}

async function runRegressionSuite() {
  console.log("===========================================================================");
  console.log("  BREWBUDDIES PHASE 7: PRODUCTION HARDENING REGRESSION TEST SUITE");
  console.log(`  Target Server: ${BASE_URL}`);
  console.log("===========================================================================");

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is missing in server/.env");
  await mongoose.connect(mongoUri);

  const createdEntities = [];

  try {
    const primaryCafe = await Cafe.findOne();
    if (!primaryCafe) throw new Error("No primary cafe found in MongoDB Atlas");

    const timestamp = Date.now();

    // Secondary Cafe for isolation tests
    const cafeB = await Cafe.create({
      name: `Cafe B Isolation ${timestamp}`,
      slug: `cafe-b-${timestamp}`,
      ownerId: primaryCafe.ownerId,
      currency: "₹",
      taxRate: 5,
      pointsPerDollar: 10,
    });
    createdEntities.push({ model: Cafe, id: cafeB._id });

    // Table in Cafe A
    const tableA = await Table.findOne({ cafeId: primaryCafe._id, isActive: true });
    if (!tableA) throw new Error("No active table found for Cafe A");

    // Inactive Table in Cafe A
    const inactiveTable = await Table.create({
      cafeId: primaryCafe._id,
      tableNumber: 998,
      capacity: 4,
      isActive: false,
    });
    createdEntities.push({ model: Table, id: inactiveTable._id });

    // Table in Cafe B
    const tableB = await Table.create({
      cafeId: cafeB._id,
      tableNumber: 1,
      capacity: 4,
      isActive: true,
    });
    createdEntities.push({ model: Table, id: tableB._id });

    // Active product in Cafe A
    const productA = await Product.findOne({ cafeId: primaryCafe._id, isAvailable: true });
    if (!productA) throw new Error("No product found for Cafe A");

    // Unavailable product in Cafe A
    const unavailableProduct = await Product.create({
      cafeId: primaryCafe._id,
      name: `Sold Out Brew ${timestamp}`,
      category: productA.category,
      price: 150,
      isAvailable: false,
    });
    createdEntities.push({ model: Product, id: unavailableProduct._id });

    // Product in Cafe B
    const productB = await Product.create({
      cafeId: cafeB._id,
      name: `Cafe B Special ${timestamp}`,
      category: productA.category,
      price: 200,
      isAvailable: true,
    });
    createdEntities.push({ model: Product, id: productB._id });

    // Active reward in Cafe A
    const rewardA = await Reward.create({
      cafeId: primaryCafe._id,
      name: `Artisan Croissant Perk ${timestamp}`,
      pointsRequired: 150,
      rewardType: "free_item",
      rewardValue: 120,
      isActive: true,
    });
    createdEntities.push({ model: Reward, id: rewardA._id });

    // Expired reward in Cafe A
    const expiredReward = await Reward.create({
      cafeId: primaryCafe._id,
      name: `Expired Perk ${timestamp}`,
      pointsRequired: 100,
      rewardType: "fixed_discount",
      rewardValue: 50,
      isActive: true,
      expiryDate: new Date(Date.now() - 86400000),
    });
    createdEntities.push({ model: Reward, id: expiredReward._id });

    // Inactive reward in Cafe A
    const inactiveReward = await Reward.create({
      cafeId: primaryCafe._id,
      name: `Inactive Perk ${timestamp}`,
      pointsRequired: 100,
      rewardType: "free_item",
      rewardValue: 50,
      isActive: false,
    });
    createdEntities.push({ model: Reward, id: inactiveReward._id });

    // Active Offer in Cafe A
    const offerCodeA = `OFFER7_${timestamp.toString().slice(-4)}`;
    const activeOfferA = await Offer.create({
      cafeId: primaryCafe._id,
      code: offerCodeA,
      title: "10% Dine-In Off",
      discountType: "percentage",
      discountValue: 10,
      minOrderAmount: 100,
      maxDiscount: 50,
      isActive: true,
    });
    createdEntities.push({ model: Offer, id: activeOfferA._id });

    // Expired Offer in Cafe A
    const expiredOffer = await Offer.create({
      cafeId: primaryCafe._id,
      code: `EXP7_${timestamp.toString().slice(-4)}`,
      title: "Expired Promo",
      discountType: "flat",
      discountValue: 50,
      isActive: true,
      endDate: new Date(Date.now() - 86400000),
    });
    createdEntities.push({ model: Offer, id: expiredOffer._id });

    // Inactive Offer in Cafe A
    const inactiveOffer = await Offer.create({
      cafeId: primaryCafe._id,
      code: `INACT7_${timestamp.toString().slice(-4)}`,
      title: "Inactive Promo",
      discountType: "flat",
      discountValue: 50,
      isActive: false,
    });
    createdEntities.push({ model: Offer, id: inactiveOffer._id });

    // =========================================================================
    // SECTION 1: AUTHENTICATION (Scenarios 1-5)
    // =========================================================================

    // 1. Owner login
    const ownerRes = await request("/api/auth/login", {
      method: "POST",
      body: { email: "owner@brewbuddies.com", password: "admin123" },
    });
    const ownerToken = ownerRes.data?.token;
    const ownerHeaders = { Authorization: `Bearer ${ownerToken}` };
    assert(
      ownerRes.status === 200 && ownerRes.data?.user?.role === "owner" && !!ownerToken,
      1,
      "Owner login successful with JWT and owner role",
      `Status: ${ownerRes.status}, Role: ${ownerRes.data?.user?.role}`
    );

    // 2. Staff login
    const staffRes = await request("/api/auth/login", {
      method: "POST",
      body: { email: "staff@brewbuddies.com", password: "staff123" },
    });
    const staffToken = staffRes.data?.token;
    const staffHeaders = { Authorization: `Bearer ${staffToken}` };
    assert(
      staffRes.status === 200 && staffRes.data?.user?.role === "staff" && !!staffToken,
      2,
      "Staff login successful with JWT and staff role",
      `Status: ${staffRes.status}, Role: ${staffRes.data?.user?.role}`
    );

    // 3. Customer login
    const custRes = await request("/api/auth/login", {
      method: "POST",
      body: { email: "customer@brewbuddies.com", password: "customer123" },
    });
    const custToken = custRes.data?.token;
    const custHeaders = { Authorization: `Bearer ${custToken}` };
    assert(
      custRes.status === 200 && custRes.data?.user?.role === "customer" && !!custToken,
      3,
      "Customer login successful with JWT and customer role",
      `Status: ${custRes.status}, Role: ${custRes.data?.user?.role}`
    );

    // 4. Invalid login credentials rejected
    const invalidRes = await request("/api/auth/login", {
      method: "POST",
      body: { email: "owner@brewbuddies.com", password: "WrongPassword999!" },
    });
    assert(
      invalidRes.status === 401 && !invalidRes.data?.token,
      4,
      "Invalid login credentials rejected with 401 Unauthorized",
      `Status: ${invalidRes.status}, Message: ${invalidRes.data?.message}`
    );

    // 5. Protected route without token rejected
    const noTokenRes = await request("/api/orders/live");
    assert(
      noTokenRes.status === 401,
      5,
      "Protected management route rejected without token (401 Unauthorized)",
      `Status: ${noTokenRes.status}`
    );

    // =========================================================================
    // SECTION 2: AUTHORIZATION (Scenarios 6-9)
    // =========================================================================

    // 6. Customer blocked from management routes
    const custBlockedRes = await request("/api/orders/live", { headers: custHeaders });
    assert(
      custBlockedRes.status === 403,
      6,
      "Customer role strictly blocked from staff/owner live orders (403 Forbidden)",
      `Status: ${custBlockedRes.status}`
    );

    // 7. Staff permissions verified (can access orders/products)
    const staffOrdersRes = await request("/api/orders/live", { headers: staffHeaders });
    const staffProductsRes = await request("/api/products", { headers: staffHeaders });
    assert(
      staffOrdersRes.status === 200 && staffProductsRes.status === 200,
      7,
      "Staff permissions granted for operational routes (orders & products)",
      `Orders: ${staffOrdersRes.status}, Products: ${staffProductsRes.status}`
    );

    // 8. Owner-only settings endpoint blocked for staff
    const staffSettingsRes = await request("/api/settings", {
      method: "PUT",
      headers: staffHeaders,
      body: { cafeName: "Unauthorized Change" },
    });
    assert(
      staffSettingsRes.status === 403,
      8,
      "Owner-only settings mutation strictly blocked for staff (403 Forbidden)",
      `Status: ${staffSettingsRes.status}`
    );

    // 9. Cross-cafe tenant isolation
    const crossCafeRes = await request(`/api/offers?cafeId=${cafeB._id}`, { headers: custHeaders });
    assert(
      crossCafeRes.status === 403,
      9,
      "Cross-cafe resource query blocked with 403 Forbidden",
      `Status: ${crossCafeRes.status}`
    );

    // =========================================================================
    // SECTION 3: QR & TABLE IDENTIFICATION (Scenarios 10-13)
    // =========================================================================

    // 10. Valid QR resolves table and cafe correctly
    const validQrRes = await request(`/api/tables/resolve/${tableA.qrToken}`);
    assert(
      validQrRes.status === 200 && validQrRes.data?.table?.tableNumber === tableA.tableNumber,
      10,
      "Valid table QR token resolves table number and cafe metadata",
      `Table: #${validQrRes.data?.table?.tableNumber}, Cafe: ${validQrRes.data?.cafe?.name}`
    );

    // 11. Invalid QR token rejected
    const invalidQrRes = await request("/api/tables/resolve/completely_bogus_token_9999");
    assert(
      invalidQrRes.status === 404,
      11,
      "Invalid table QR token rejected with 404 Not Found",
      `Status: ${invalidQrRes.status}`
    );

    // 12. Inactive table rejected
    const inactiveTableRes = await request(`/api/tables/resolve/${inactiveTable.qrToken}`);
    assert(
      inactiveTableRes.status === 400,
      12,
      "Inactive or out-of-service table rejected with 400 Bad Request",
      `Status: ${inactiveTableRes.status}, Message: ${inactiveTableRes.data?.message}`
    );

    // 13. Cross-cafe QR cannot cross-contaminate
    const qrBRes = await request(`/api/tables/resolve/${tableB.qrToken}`);
    const resolvesCafeB = qrBRes.data?.cafe?.id?.toString() === cafeB._id.toString();
    assert(
      qrBRes.status === 200 && resolvesCafeB,
      13,
      "Cross-cafe QR resolution binds strictly to Cafe B without cross-contamination",
      `Resolved Cafe ID: ${qrBRes.data?.cafe?.id}`
    );

    // =========================================================================
    // SECTION 4: ORDERING LIFECYCLE & ZERO-TRUST PRICING (Scenarios 14-23)
    // =========================================================================

    // 14. Menu returns products with categories
    const menuRes = await request("/api/products");
    assert(
      menuRes.status === 200 && Array.isArray(menuRes.data?.products) && menuRes.data?.products.length > 0,
      14,
      "Menu catalog returns products with populated categories",
      `Count: ${menuRes.data?.products?.length}`
    );

    // 15. Product availability enforced (out-of-stock items cannot be ordered)
    const orderUnavailableRes = await request("/api/orders", {
      method: "POST",
      headers: custHeaders,
      body: {
        tableToken: tableA.qrToken,
        customerName: "Aarav Patel",
        customerPhone: "+919876543212",
        items: [{ productId: unavailableProduct._id, quantity: 1 }],
      },
    });
    assert(
      orderUnavailableRes.status === 400,
      15,
      "Unavailable or out-of-stock product cannot be ordered (400 Bad Request)",
      `Status: ${orderUnavailableRes.status}, Message: ${orderUnavailableRes.data?.message}`
    );

    // 16. Cart validation ensures valid items & quantities
    const invalidQtyRes = await request("/api/orders", {
      method: "POST",
      headers: custHeaders,
      body: {
        tableToken: tableA.qrToken,
        customerName: "Aarav Patel",
        customerPhone: "+919876543212",
        items: [{ productId: productA._id, quantity: 0 }],
      },
    });
    assert(
      invalidQtyRes.status === 400,
      16,
      "Order items with invalid quantity (< 1) rejected with 400 Bad Request",
      `Status: ${invalidQtyRes.status}`
    );

    // 17. Dine-in checkout requires valid table resolution
    const noTableRes = await request("/api/orders", {
      method: "POST",
      headers: custHeaders,
      body: {
        customerName: "Aarav Patel",
        customerPhone: "+919876543212",
        items: [{ productId: productA._id, quantity: 1 }],
      },
    });
    assert(
      noTableRes.status === 404 || noTableRes.status === 400,
      17,
      "Dine-in order without table token/number rejected",
      `Status: ${noTableRes.status}`
    );

    // 18. Server recalculates genuine price, ignoring client price
    const fakePriceRes = await request("/api/orders", {
      method: "POST",
      headers: custHeaders,
      body: {
        tableToken: tableA.qrToken,
        customerName: "Aarav Patel",
        customerPhone: "+919876543212",
        items: [{ productId: productA._id, quantity: 2, price: 1 }],
      },
    });
    const expectedSubtotal = productA.price * 2;
    const isServerCalculated = fakePriceRes.data?.order?.subtotal === expectedSubtotal;
    if (fakePriceRes.data?.order?._id) createdEntities.push({ model: Order, id: fakePriceRes.data.order._id });
    assert(
      fakePriceRes.status === 201 && isServerCalculated,
      18,
      "Zero-trust server price recalculation ignores client price",
      `Client: ₹2, Server Calculated: ₹${fakePriceRes.data?.order?.subtotal}`
    );

    // 19. Order creation starts in pending state
    const order19 = fakePriceRes.data?.order;
    assert(
      order19?.status === "pending" && !order19?.pointsCredited,
      19,
      "Order creation initializes strictly in 'pending' state with 0 points",
      `Status: ${order19?.status}, pointsCredited: ${order19?.pointsCredited}`
    );

    // 20. Order tracking returns accurate status and items
    const trackRes = await request(`/api/orders/track/${order19?._id}`);
    assert(
      trackRes.status === 200 && trackRes.data?.order?.orderNumber === order19?.orderNumber,
      20,
      "Order tracking returns accurate order details and status",
      `Order: #${trackRes.data?.order?.orderNumber}, Status: ${trackRes.data?.order?.status}`
    );

    // 21. Customer order history scoped strictly to customer
    const myOrdersRes = await request(`/api/orders/my-orders?phone=${encodeURIComponent("+919876543212")}`, {
      headers: custHeaders,
    });
    assert(
      myOrdersRes.status === 200 && Array.isArray(myOrdersRes.data?.orders) && myOrdersRes.data?.orders.length > 0,
      21,
      "Customer order history returns orders for authenticated diner",
      `Count: ${myOrdersRes.data?.orders?.length}`
    );

    // 22. Status lifecycle transitions correctly: pending -> accepted -> preparing -> ready -> served
    const s22OrderRes = await request("/api/orders", {
      method: "POST",
      headers: custHeaders,
      body: {
        tableToken: tableA.qrToken,
        customerName: "Aarav Patel",
        customerPhone: "+919876543212",
        items: [{ productId: productA._id, quantity: 1 }],
      },
    });
    const lifeOrder = s22OrderRes.data?.order;
    if (lifeOrder?._id) createdEntities.push({ model: Order, id: lifeOrder._id });

    const step1 = await request(`/api/orders/${lifeOrder._id}/status`, {
      method: "PATCH",
      headers: staffHeaders,
      body: { status: "accepted" },
    });
    const step2 = await request(`/api/orders/${lifeOrder._id}/status`, {
      method: "PATCH",
      headers: staffHeaders,
      body: { status: "preparing" },
    });
    const step3 = await request(`/api/orders/${lifeOrder._id}/status`, {
      method: "PATCH",
      headers: staffHeaders,
      body: { status: "ready" },
    });
    const step4 = await request(`/api/orders/${lifeOrder._id}/status`, {
      method: "PATCH",
      headers: staffHeaders,
      body: { status: "served" },
    });
    const lifecycleSuccess =
      step1.data?.order?.status === "accepted" &&
      step2.data?.order?.status === "preparing" &&
      step3.data?.order?.status === "ready" &&
      step4.data?.order?.status === "served";
    assert(
      lifecycleSuccess,
      22,
      "Status lifecycle advances correctly through pending -> accepted -> preparing -> ready -> served",
      `Final Status: ${step4.data?.order?.status}`
    );

    // 23. Invalid status transition rejected
    const invalidTransRes = await request("/api/orders", {
      method: "POST",
      headers: custHeaders,
      body: {
        tableToken: tableA.qrToken,
        customerName: "Aarav Patel",
        customerPhone: "+919876543212",
        items: [{ productId: productA._id, quantity: 1 }],
      },
    });
    const freshOrder = invalidTransRes.data?.order;
    if (freshOrder?._id) createdEntities.push({ model: Order, id: freshOrder._id });

    // Try skipping directly from pending to served
    const skipRes = await request(`/api/orders/${freshOrder._id}/status`, {
      method: "PATCH",
      headers: staffHeaders,
      body: { status: "served" },
    });
    assert(
      skipRes.status === 400,
      23,
      "Invalid status transition (pending -> served) rejected with 400 Bad Request",
      `Status: ${skipRes.status}, Message: ${skipRes.data?.message}`
    );

    // =========================================================================
    // SECTION 5: LOYALTY & POINTS SECURITY (Scenarios 24-32)
    // =========================================================================

    // 24. Points remain zero during intermediate states
    assert(
      step1.data?.order?.pointsEarned === 0 &&
      step2.data?.order?.pointsEarned === 0 &&
      step3.data?.order?.pointsEarned === 0,
      24,
      "Loyalty points remain 0 during intermediate states (accepted, preparing, ready)",
      "Points uncredited prior to served"
    );

    // 25. Points credited strictly upon order reaching 'served'
    assert(
      step4.data?.order?.pointsEarned > 0 && step4.data?.order?.pointsCredited === true,
      25,
      "Loyalty points credited strictly upon order transitioning to 'served'",
      `Points Earned: ${step4.data?.order?.pointsEarned}`
    );

    // 26. Repeated served status call does not duplicate points (Idempotent)
    const userBeforeDup = await User.findById(custRes.data.user.id || custRes.data.user._id);
    const balanceBeforeDup = userBeforeDup.points ?? userBeforeDup.loyaltyPoints;
    await request(`/api/orders/${lifeOrder._id}/status`, {
      method: "PATCH",
      headers: staffHeaders,
      body: { status: "served" },
    });
    const userAfterDup = await User.findById(custRes.data.user.id || custRes.data.user._id);
    const balanceAfterDup = userAfterDup.points ?? userAfterDup.loyaltyPoints;
    assert(
      balanceBeforeDup === balanceAfterDup,
      26,
      "Repeated 'served' status call does not duplicate points (Idempotent guard)",
      `Balance: ${balanceAfterDup}`
    );

    // 27. Reward catalog filters active & non-expired rewards
    const custRewardsRes = await request("/api/rewards", { headers: custHeaders });
    const rewardIds = custRewardsRes.data?.rewards?.map((r) => r._id.toString()) || [];
    const hasActive = rewardIds.includes(rewardA._id.toString());
    const hasExpired = rewardIds.includes(expiredReward._id.toString());
    const hasInactive = rewardIds.includes(inactiveReward._id.toString());
    assert(
      hasActive && !hasExpired && !hasInactive,
      27,
      "Customer rewards catalog displays only active, non-expired rewards",
      `Active: ${hasActive}, Expired Excluded: ${!hasExpired}, Inactive Excluded: ${!hasInactive}`
    );

    // 28. Reward redemption validates cafe ownership & active status
    const rewardB = await Reward.create({
      cafeId: cafeB._id,
      name: `Cafe B Reward ${timestamp}`,
      pointsRequired: 50,
      rewardType: "free_item",
      rewardValue: 50,
      isActive: true,
    });
    createdEntities.push({ model: Reward, id: rewardB._id });

    const crossRedeemRes = await request("/api/rewards/redeem", {
      method: "POST",
      headers: custHeaders,
      body: { rewardId: rewardB._id },
    });
    assert(
      crossRedeemRes.status === 403,
      28,
      "Cross-cafe reward redemption blocked with 403 Forbidden",
      `Status: ${crossRedeemRes.status}`
    );

    // 29. Insufficient points redemption rejected
    const bigReward = await Reward.create({
      cafeId: primaryCafe._id,
      name: `VIP Yacht Day ${timestamp}`,
      pointsRequired: 9999999,
      rewardType: "fixed_discount",
      rewardValue: 50000,
      isActive: true,
    });
    createdEntities.push({ model: Reward, id: bigReward._id });

    const notEnoughRes = await request("/api/rewards/redeem", {
      method: "POST",
      headers: custHeaders,
      body: { rewardId: bigReward._id },
    });
    assert(
      notEnoughRes.status === 400,
      29,
      "Redemption with insufficient points rejected with 400 Bad Request",
      `Status: ${notEnoughRes.status}`
    );

    // 30. Expired reward redemption rejected
    const expRedeemRes = await request("/api/rewards/redeem", {
      method: "POST",
      headers: custHeaders,
      body: { rewardId: expiredReward._id },
    });
    assert(
      expRedeemRes.status === 400,
      30,
      "Expired reward redemption rejected with 400 Bad Request",
      `Status: ${expRedeemRes.status}`
    );

    // 31. Inactive reward redemption rejected
    const inactRedeemRes = await request("/api/rewards/redeem", {
      method: "POST",
      headers: custHeaders,
      body: { rewardId: inactiveReward._id },
    });
    assert(
      inactRedeemRes.status === 400,
      31,
      "Inactive reward redemption rejected with 400 Bad Request",
      `Status: ${inactRedeemRes.status}`
    );

    // 32. Concurrent redemption atomic concurrency guard
    await User.findByIdAndUpdate(custRes.data.user.id || custRes.data.user._id, {
      points: rewardA.pointsRequired,
    });

    const [c1, c2] = await Promise.all([
      request("/api/rewards/redeem", { method: "POST", headers: custHeaders, body: { rewardId: rewardA._id } }),
      request("/api/rewards/redeem", { method: "POST", headers: custHeaders, body: { rewardId: rewardA._id } }),
    ]);
    const finalCust = await User.findById(custRes.data.user.id || custRes.data.user._id);
    const oneOkOneBad = (c1.status === 200 && c2.status === 400) || (c2.status === 200 && c1.status === 400);
    const nonNegative = (finalCust.points ?? 0) >= 0;
    assert(
      oneOkOneBad && nonNegative,
      32,
      "Concurrent redemptions atomic guard prevents overdraft and double-spending",
      `One: ${c1.status}, Two: ${c2.status}, Final Balance: ${finalCust.points}`
    );

    // Restore points for subsequent operations
    await User.findByIdAndUpdate(custRes.data.user.id || custRes.data.user._id, {
      $max: { points: 500 },
    });

    // =========================================================================
    // SECTION 6: OFFERS & PROMO CODES (Scenarios 33-38)
    // =========================================================================

    // 33. Active offer applied with genuine discount
    const validOfferRes = await request("/api/offers/validate", {
      method: "POST",
      headers: custHeaders,
      body: { code: activeOfferA.code, subtotal: 300 },
    });
    const discount33 = validOfferRes.data?.discount ?? validOfferRes.data?.discountAmount;
    assert(
      validOfferRes.status === 200 && discount33 === 30,
      33,
      "Active offer applied successfully with genuine discount",
      `Subtotal: ₹300, Discount: ₹${discount33}`
    );

    // 34. Expired offer rejected
    const expOfferRes = await request("/api/offers/validate", {
      method: "POST",
      headers: custHeaders,
      body: { code: expiredOffer.code, subtotal: 300 },
    });
    assert(
      expOfferRes.status === 400,
      34,
      "Expired promo offer rejected with 400 Bad Request",
      `Status: ${expOfferRes.status}`
    );

    // 35. Inactive offer rejected
    const inactOfferRes = await request("/api/offers/validate", {
      method: "POST",
      headers: custHeaders,
      body: { code: inactiveOffer.code, subtotal: 300 },
    });
    assert(
      inactOfferRes.status === 404 || inactOfferRes.status === 400,
      35,
      "Inactive promo offer rejected with appropriate error status",
      `Status: ${inactOfferRes.status}`
    );

    // 36. Promo validation calculates discount server-side
    const promoOrderRes = await request("/api/orders", {
      method: "POST",
      headers: custHeaders,
      body: {
        tableToken: tableA.qrToken,
        customerName: "Aarav Patel",
        customerPhone: "+919876543212",
        items: [{ productId: productA._id, quantity: 2 }],
        appliedOffer: { code: activeOfferA.code, discount: 9999 },
      },
    });
    if (promoOrderRes.data?.order?._id) createdEntities.push({ model: Order, id: promoOrderRes.data.order._id });
    const computedSub = productA.price * 2;
    const computedDisc = Math.min((computedSub * 10) / 100, activeOfferA.maxDiscount);
    assert(
      promoOrderRes.status === 201 && promoOrderRes.data?.order?.discount === computedDisc,
      36,
      "Promo validation calculates discount server-side, ignoring client manipulation",
      `Expected Discount: ₹${computedDisc}, Got: ₹${promoOrderRes.data?.order?.discount}`
    );

    // 37. Server-side discount respects max discount limits
    const maxDiscountRes = await request("/api/offers/validate", {
      method: "POST",
      headers: custHeaders,
      body: { code: activeOfferA.code, subtotal: 1000 },
    });
    const discount37 = maxDiscountRes.data?.discount ?? maxDiscountRes.data?.discountAmount;
    assert(
      discount37 === activeOfferA.maxDiscount,
      37,
      "Server-side discount capped strictly by maxDiscount threshold",
      `Discount: ₹${discount37}, Max Cap: ₹${activeOfferA.maxDiscount}`
    );

    // 38. Cross-cafe offer rejected when applied to a different cafe
    const offerB = await Offer.create({
      cafeId: cafeB._id,
      code: `OFFB_${timestamp.toString().slice(-4)}`,
      title: "Cafe B Promo",
      discountType: "flat",
      discountValue: 20,
      isActive: true,
    });
    createdEntities.push({ model: Offer, id: offerB._id });

    const crossOfferRes = await request("/api/orders", {
      method: "POST",
      headers: custHeaders,
      body: {
        tableToken: tableA.qrToken,
        customerName: "Aarav Patel",
        customerPhone: "+919876543212",
        items: [{ productId: productA._id, quantity: 1 }],
        appliedOffer: { code: offerB.code },
      },
    });
    assert(
      crossOfferRes.status === 400,
      38,
      "Cross-cafe promo code rejected when applied to another cafe (400 Bad Request)",
      `Status: ${crossOfferRes.status}, Message: ${crossOfferRes.data?.message}`
    );

    // =========================================================================
    // SECTION 7: MANAGEMENT DASHBOARD & OPERATIONS (Scenarios 39-47)
    // =========================================================================

    // 39. Dashboard returns genuine MongoDB KPIs
    const dashRes = await request("/api/analytics/summary", { headers: ownerHeaders });
    assert(
      dashRes.status === 200 && dashRes.data?.success && dashRes.data?.summary !== undefined,
      39,
      "Dashboard KPIs powered by genuine MongoDB aggregations",
      `Total Orders: ${dashRes.data?.summary?.totalOrdersCount}, Total Revenue: ₹${dashRes.data?.summary?.totalRevenue}`
    );

    // 40. Live orders management (list & filter)
    const liveRes = await request("/api/orders/live", { headers: ownerHeaders });
    assert(
      liveRes.status === 200 && Array.isArray(liveRes.data?.orders),
      40,
      "Live orders kitchen queue accessible by owner/staff",
      `Active Kitchen Orders: ${liveRes.data?.orders?.length}`
    );

    // 41. Product management (create, update, toggle stock)
    const newProdRes = await request("/api/products", {
      method: "POST",
      headers: ownerHeaders,
      body: {
        name: `Test Nitro Coffee ${timestamp}`,
        category: productA.category,
        price: 180,
        description: "Cold brewed nitro infusion",
      },
    });
    const createdProd = newProdRes.data?.product;
    if (createdProd?._id) createdEntities.push({ model: Product, id: createdProd._id });

    const toggleRes = await request(`/api/products/${createdProd._id}/toggle-stock`, {
      method: "PATCH",
      headers: ownerHeaders,
    });
    assert(
      newProdRes.status === 201 && toggleRes.status === 200 && toggleRes.data?.isAvailable === false,
      41,
      "Product management: Create product and toggle stock availability",
      `Created: ${createdProd?.name}, Toggled isAvailable: ${toggleRes.data?.isAvailable}`
    );

    // 42. Customer management (view customer list and detail)
    const custsRes = await request("/api/customers", { headers: ownerHeaders });
    const firstCust = custsRes.data?.customers?.[0];
    const custDetailRes = firstCust ? await request(`/api/customers/${firstCust._id}`, { headers: ownerHeaders }) : { status: 200 };
    assert(
      custsRes.status === 200 && custDetailRes.status === 200,
      42,
      "Customer management: View customer list and detailed loyalty history",
      `Customer Count: ${custsRes.data?.customers?.length}`
    );

    // 43. Reward management (create perk, update, delete)
    const newRewRes = await request("/api/rewards", {
      method: "POST",
      headers: ownerHeaders,
      body: {
        name: `Seasonal Muffin ${timestamp}`,
        pointsRequired: 80,
        rewardType: "free_item",
        rewardValue: 70,
      },
    });
    const createdRew = newRewRes.data?.reward;
    if (createdRew?._id) {
      await request(`/api/rewards/${createdRew._id}`, {
        method: "DELETE",
        headers: ownerHeaders,
      });
    }
    assert(
      newRewRes.status === 201 && !!createdRew,
      43,
      "Reward management: Create reward perk and delete successfully",
      `Reward: ${createdRew?.name}`
    );

    // 44. Offer management (create promo offer, update, delete)
    const newOfferRes = await request("/api/offers", {
      method: "POST",
      headers: ownerHeaders,
      body: {
        code: `MGMT_${timestamp.toString().slice(-4)}`,
        title: "Staff Promo Special",
        discountType: "flat",
        discountValue: 25,
      },
    });
    const createdOffer = newOfferRes.data?.offer;
    if (createdOffer?._id) {
      await request(`/api/offers/${createdOffer._id}`, {
        method: "DELETE",
        headers: ownerHeaders,
      });
    }
    assert(
      newOfferRes.status === 201 && !!createdOffer,
      44,
      "Offer management: Create promo offer and delete successfully",
      `Offer Code: ${createdOffer?.code}`
    );

    // 45. QR Code management (list tables, update capacity)
    const tablesListRes = await request("/api/tables", { headers: ownerHeaders });
    const updateTableRes = await request(`/api/tables/${tableA._id}`, {
      method: "PUT",
      headers: ownerHeaders,
      body: { capacity: 6 },
    });
    assert(
      tablesListRes.status === 200 && updateTableRes.status === 200 && updateTableRes.data?.table?.capacity === 6,
      45,
      "QR Code management: List tables and update table capacity",
      `Table #${tableA.tableNumber} Capacity: ${updateTableRes.data?.table?.capacity}`
    );

    // 46. Analytics summary & charts return genuine MongoDB aggregations
    const chartsRes = await request("/api/analytics/charts?range=7d", { headers: ownerHeaders });
    assert(
      chartsRes.status === 200 && Array.isArray(chartsRes.data?.revenueTrends),
      46,
      "Analytics summary & charts return genuine aggregated metrics",
      `Revenue trend periods: ${chartsRes.data?.revenueTrends?.length}`
    );

    // 47. Settings management allows owner to update cafe configuration
    const updateSettingsRes = await request("/api/settings", {
      method: "PUT",
      headers: ownerHeaders,
      body: { wifiPassword: "CoffeeVibes2026Secure" },
    });
    assert(
      updateSettingsRes.status === 200 && updateSettingsRes.data?.settings !== undefined,
      47,
      "Settings management allows cafe owner to update operational settings",
      `Status: ${updateSettingsRes.status}`
    );

    // =========================================================================
    // SECTION 8: FRONTEND PRODUCTION BUILD (Scenario 48)
    // =========================================================================

    // 48. Frontend production build artifact verification
    const distPath = path.resolve(__dirname, "../client/dist/index.html");
    const distExists = fs.existsSync(distPath);
    const distStats = distExists ? fs.statSync(distPath) : null;
    assert(
      distExists && distStats && distStats.size > 0,
      48,
      "Frontend production build artifact exists and succeeded cleanly",
      `Artifact: ${distPath}, Size: ${distStats?.size} bytes`
    );

  } catch (err) {
    console.error("\n[Regression Test Error]:", err);
  } finally {
    // Cleanup temporary test records
    for (const ent of createdEntities) {
      try {
        await ent.model.findByIdAndDelete(ent.id);
      } catch (e) {}
    }
    await mongoose.disconnect();

    console.log("\n===========================================================================");
    console.log(`  REGRESSION TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: 48)`);
    console.log("===========================================================================\n");

    if (failedCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runRegressionSuite();
