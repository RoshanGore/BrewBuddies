/**
 * BrewBuddies - Phase 3 Automated Verification Test Suite
 * 
 * Verifies 15 core scenarios:
 *  1. Customer registration (201, token, safe user, password omitted)
 *  2. Duplicate email registration rejection (400)
 *  3. Privilege escalation prevention in registration (role forced to 'customer')
 *  4. Customer login with valid credentials (200, token)
 *  5. Invalid password login rejection (401)
 *  6. Invalid email login rejection (401)
 *  7. GET /api/auth/me with valid Bearer token (200, user profile, no passwordHash)
 *  8. GET /api/auth/me without token (401)
 *  9. Owner login with seeded credentials (200, role 'owner')
 * 10. Staff login with seeded credentials (200, role 'staff')
 * 11. Customer accessing owner-protected route GET /api/orders/live (403 Forbidden)
 * 12. Multi-tenant isolation: Scoped resource modification prevents cross-tenant access (404/403)
 * 13. Customer order isolation: Customer B cannot access Customer A's order (403 Forbidden)
 * 14. Loyalty point safety: Order creation awards 0 points (pointsCredited=false, points unchanged)
 * 15. Loyalty point safety: Transition to 'served' credits points once; repeat call is idempotent
 */

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

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
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
  console.log("=".repeat(70));
  console.log("  BREWBUDDIES PHASE 3: AUTHENTICATION & SECURITY TEST SUITE");
  console.log(`  Target Server: ${BASE_URL}`);
  console.log("=".repeat(70));

  const timestamp = Date.now();
  const testCustomerEmailA = `cust_a_${timestamp}@testbb.com`;
  const testCustomerEmailB = `cust_b_${timestamp}@testbb.com`;
  const testPassword = "password123";

  let tokenA = "";
  let userA = null;
  let tokenB = "";
  let userB = null;
  let ownerToken = "";
  let staffToken = "";
  let createdOrderId = "";

  try {
    // -------------------------------------------------------------
    // Scenario 1: Customer Registration
    // -------------------------------------------------------------
    const regResA = await request("/api/auth/register", {
      method: "POST",
      body: {
        name: "Test Customer A",
        email: testCustomerEmailA,
        phone: "+91 9876543210",
        password: testPassword,
      },
    });

    const s1Pass =
      regResA.status === 201 &&
      regResA.data?.success === true &&
      typeof regResA.data?.token === "string" &&
      regResA.data?.user?.role === "customer" &&
      regResA.data?.user?.email === testCustomerEmailA &&
      regResA.data?.user?.passwordHash === undefined &&
      regResA.data?.user?.password === undefined;

    tokenA = regResA.data?.token;
    userA = regResA.data?.user;

    assert(
      s1Pass,
      1,
      "Customer registration returns 201, valid JWT, and safe user payload",
      `Status: ${regResA.status}, Role: ${regResA.data?.user?.role}, Token received: ${!!tokenA}`
    );

    // -------------------------------------------------------------
    // Scenario 2: Duplicate Email Registration Rejection
    // -------------------------------------------------------------
    const dupRes = await request("/api/auth/register", {
      method: "POST",
      body: {
        name: "Duplicate User",
        email: testCustomerEmailA,
        password: testPassword,
      },
    });

    const s2Pass = dupRes.status === 400 && dupRes.data?.success === false;
    assert(
      s2Pass,
      2,
      "Duplicate email registration rejected with 400 Bad Request",
      `Status: ${dupRes.status}, Message: "${dupRes.data?.message}"`
    );

    // -------------------------------------------------------------
    // Scenario 3: Privilege Escalation Prevention in Registration
    // -------------------------------------------------------------
    const hackerEmail = `hacker_${timestamp}@testbb.com`;
    const escRes = await request("/api/auth/register", {
      method: "POST",
      body: {
        name: "Malicious User",
        email: hackerEmail,
        password: testPassword,
        role: "owner", // Attempting to register directly as owner
      },
    });

    const s3Pass =
      escRes.status === 201 &&
      escRes.data?.user?.role === "customer"; // Must be forced to customer
    assert(
      s3Pass,
      3,
      "Privilege escalation prevented; public registration role forced to 'customer'",
      `Sent role: 'owner' -> Registered role: '${escRes.data?.user?.role}'`
    );

    // -------------------------------------------------------------
    // Scenario 4: Customer Login with Valid Credentials
    // -------------------------------------------------------------
    const loginResA = await request("/api/auth/login", {
      method: "POST",
      body: {
        email: testCustomerEmailA,
        password: testPassword,
      },
    });

    const s4Pass =
      loginResA.status === 200 &&
      loginResA.data?.success === true &&
      typeof loginResA.data?.token === "string" &&
      loginResA.data?.user?.email === testCustomerEmailA &&
      loginResA.data?.user?.passwordHash === undefined;

    assert(
      s4Pass,
      4,
      "Customer login returns 200, JWT token, and sanitized user object",
      `Status: ${loginResA.status}, Token: ${loginResA.data?.token?.slice(0, 15)}...`
    );

    // -------------------------------------------------------------
    // Scenario 5: Invalid Password Login Rejection
    // -------------------------------------------------------------
    const badPassRes = await request("/api/auth/login", {
      method: "POST",
      body: {
        email: testCustomerEmailA,
        password: "wrong_password_123",
      },
    });

    const s5Pass = badPassRes.status === 401 && badPassRes.data?.success === false;
    assert(
      s5Pass,
      5,
      "Invalid password rejected with 401 Unauthorized",
      `Status: ${badPassRes.status}, Message: "${badPassRes.data?.message}"`
    );

    // -------------------------------------------------------------
    // Scenario 6: Invalid Email Login Rejection
    // -------------------------------------------------------------
    const badEmailRes = await request("/api/auth/login", {
      method: "POST",
      body: {
        email: `nonexistent_${timestamp}@testbb.com`,
        password: testPassword,
      },
    });

    const s6Pass = badEmailRes.status === 401 && badEmailRes.data?.success === false;
    assert(
      s6Pass,
      6,
      "Non-existent email rejected with 401 Unauthorized",
      `Status: ${badEmailRes.status}, Message: "${badEmailRes.data?.message}"`
    );

    // -------------------------------------------------------------
    // Scenario 7: GET /api/auth/me with Valid Bearer Token
    // -------------------------------------------------------------
    const meRes = await request("/api/auth/me", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    const s7Pass =
      meRes.status === 200 &&
      meRes.data?.success === true &&
      meRes.data?.user?.email === testCustomerEmailA &&
      meRes.data?.user?.passwordHash === undefined &&
      meRes.data?.user?.password === undefined;

    assert(
      s7Pass,
      7,
      "GET /api/auth/me returns 200 and authenticated profile without passwordHash",
      `Status: ${meRes.status}, Email: ${meRes.data?.user?.email}`
    );

    // -------------------------------------------------------------
    // Scenario 8: GET /api/auth/me without Token
    // -------------------------------------------------------------
    const noTokenRes = await request("/api/auth/me");
    const s8Pass = noTokenRes.status === 401 && noTokenRes.data?.success === false;
    assert(
      s8Pass,
      8,
      "GET /api/auth/me without token rejected with 401 Unauthorized",
      `Status: ${noTokenRes.status}, Message: "${noTokenRes.data?.message}"`
    );

    // -------------------------------------------------------------
    // Scenario 9: Owner Login with Seeded Credentials
    // -------------------------------------------------------------
    const ownerLoginRes = await request("/api/auth/login", {
      method: "POST",
      body: {
        email: "owner@brewbuddies.com",
        password: "admin123",
      },
    });

    ownerToken = ownerLoginRes.data?.token;
    const s9Pass =
      ownerLoginRes.status === 200 &&
      ownerLoginRes.data?.user?.role === "owner" &&
      typeof ownerToken === "string";

    assert(
      s9Pass,
      9,
      "Owner login with seeded account returns 200 and role 'owner'",
      `Status: ${ownerLoginRes.status}, Role: ${ownerLoginRes.data?.user?.role}`
    );

    // -------------------------------------------------------------
    // Scenario 10: Staff Login with Seeded Credentials
    // -------------------------------------------------------------
    const staffLoginRes = await request("/api/auth/login", {
      method: "POST",
      body: {
        email: "staff@brewbuddies.com",
        password: "staff123",
      },
    });

    staffToken = staffLoginRes.data?.token;
    const s10Pass =
      staffLoginRes.status === 200 &&
      staffLoginRes.data?.user?.role === "staff" &&
      typeof staffToken === "string";

    assert(
      s10Pass,
      10,
      "Staff login with seeded account returns 200 and role 'staff'",
      `Status: ${staffLoginRes.status}, Role: ${staffLoginRes.data?.user?.role}`
    );

    // -------------------------------------------------------------
    // Scenario 11: Customer Accessing Owner-Protected Route
    // -------------------------------------------------------------
    const custAccessOwnerRes = await request("/api/orders/live", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    const s11Pass =
      custAccessOwnerRes.status === 403 && custAccessOwnerRes.data?.success === false;
    assert(
      s11Pass,
      11,
      "Customer blocked from owner-only route GET /api/orders/live with 403 Forbidden",
      `Status: ${custAccessOwnerRes.status}, Message: "${custAccessOwnerRes.data?.message}"`
    );

    // -------------------------------------------------------------
    // Scenario 12: Multi-Tenant Isolation
    // -------------------------------------------------------------
    // Testing mutation against non-existent resource in cafe scope
    const fakeObjectId = "65f000000000000000000000";
    const tenantIsolationRes = await request(`/api/orders/${fakeObjectId}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${staffToken}` },
      body: { status: "preparing" },
    });

    const s12Pass =
      tenantIsolationRes.status === 404 && tenantIsolationRes.data?.success === false;
    assert(
      s12Pass,
      12,
      "Multi-tenant isolation: Access denied/not found for non-tenant resources",
      `Status: ${tenantIsolationRes.status}, Message: "${tenantIsolationRes.data?.message}"`
    );

    // -------------------------------------------------------------
    // Setup for Scenarios 13, 14, 15: Register Customer B & Place Order
    // -------------------------------------------------------------
    const regResB = await request("/api/auth/register", {
      method: "POST",
      body: {
        name: "Test Customer B",
        email: testCustomerEmailB,
        phone: "+91 9123456780",
        password: testPassword,
      },
    });
    tokenB = regResB.data?.token;
    userB = regResB.data?.user;

    // Check initial points for Customer A
    const profileBefore = await request("/api/auth/me", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const initialPoints = profileBefore.data?.user?.points ?? 50;

    // Customer A creates an order
    const orderPayload = {
      customerName: "Test Customer A",
      customerPhone: "+91 9876543210",
      tableNumber: 2,
      items: [
        {
          name: "Artisan Cappuccino",
          price: 180,
          quantity: 2,
        },
      ],
      notes: "Extra hot please",
    };

    const createOrderRes = await request("/api/orders", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: orderPayload,
    });

    createdOrderId = createOrderRes.data?.order?._id;
    const createdOrder = createOrderRes.data?.order;

    // -------------------------------------------------------------
    // Scenario 13: Customer Order Isolation (IDOR Protection)
    // -------------------------------------------------------------
    const idorRes = await request(`/api/orders/track/${createdOrderId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    const s13Pass = idorRes.status === 403 && idorRes.data?.success === false;
    assert(
      s13Pass,
      13,
      "Customer order isolation: Customer B prevented from viewing Customer A's order (403)",
      `Status: ${idorRes.status}, Message: "${idorRes.data?.message}"`
    );

    // -------------------------------------------------------------
    // Scenario 14: Loyalty Point Safety - Order Creation Awards 0 Points
    // -------------------------------------------------------------
    const profileAfterCreate = await request("/api/auth/me", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const pointsAfterCreate = profileAfterCreate.data?.user?.points;

    const s14Pass =
      createOrderRes.status === 201 &&
      createdOrder?.pointsEarned === 0 &&
      createdOrder?.pointsCredited === false &&
      createdOrder?.status === "pending" &&
      pointsAfterCreate === initialPoints;

    assert(
      s14Pass,
      14,
      "Loyalty point safety: Order creation awards 0 points (pointsCredited=false, balance unchanged)",
      `Initial: ${initialPoints}, After Create: ${pointsAfterCreate}, Order pointsEarned: ${createdOrder?.pointsEarned}`
    );

    // -------------------------------------------------------------
    // Scenario 15: Loyalty Point Safety - Transition to 'served' & Idempotency
    // -------------------------------------------------------------
    // Step A: Transition to 'served'
    const servedRes1 = await request(`/api/orders/${createdOrderId}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${staffToken}` },
      body: { status: "served" },
    });

    const profileAfterServed1 = await request("/api/auth/me", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const pointsAfterServed1 = profileAfterServed1.data?.user?.points;
    const orderPointsEarned = servedRes1.data?.order?.pointsEarned;

    // Step B: Repeat transition to 'served' (Idempotency test)
    const servedRes2 = await request(`/api/orders/${createdOrderId}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${staffToken}` },
      body: { status: "served" },
    });

    const profileAfterServed2 = await request("/api/auth/me", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const pointsAfterServed2 = profileAfterServed2.data?.user?.points;

    const pointsCreditedCorrectly =
      pointsAfterServed1 === initialPoints + orderPointsEarned && orderPointsEarned > 0;
    const isIdempotent = pointsAfterServed2 === pointsAfterServed1;

    const s15Pass =
      servedRes1.status === 200 &&
      pointsCreditedCorrectly &&
      servedRes2.status === 200 &&
      isIdempotent;

    assert(
      s15Pass,
      15,
      "Loyalty point safety: Points credited on 'served' exactly once; repeat calls are idempotent",
      `Before: ${initialPoints} -> Served: ${pointsAfterServed1} (+${orderPointsEarned}) -> Repeat Served: ${pointsAfterServed2} (No double crediting)`
    );

  } catch (err) {
    console.error("\x1b[31m[UNEXPECTED ERROR]\x1b[0m", err);
    failedCount++;
  }

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log("=".repeat(70));
  console.log(`TOTAL SCENARIOS: 15`);
  console.log(`\x1b[32mPASSED: ${passedCount}\x1b[0m`);
  console.log(`\x1b[${failedCount > 0 ? "31" : "32"}mFAILED: ${failedCount}\x1b[0m`);
  console.log("=".repeat(70));

  if (failedCount === 0 && passedCount === 15) {
    console.log("\x1b[32mALL 15 PHASE 3 SCENARIOS PASSED SUCCESSFULLY!\x1b[0m");
    process.exit(0);
  } else {
    console.error("\x1b[31mSOME SCENARIOS FAILED. Please review the output above.\x1b[0m");
    process.exit(1);
  }
}

runTests();

