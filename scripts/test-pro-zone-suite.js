import http from "http";
import { app } from "../src/app.js";
import { sql, pool } from "../src/db/mysql.js";
import { signAdminToken } from "../src/utils/jwt.js";

const PORT = 9989;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const server = http.createServer(app);

async function runTestSuite() {
  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`[Pro Zone Test Runner] Running on ${BASE_URL}\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Create a Test Free User and an Admin User
    const ts = Date.now();
    const freeEmail = `freeuser_${ts}@test.com`;
    const adminEmail = `adminuser_${ts}@test.com`;

    const freeRes = await sql(
      `INSERT INTO users (full_name, email, role, password_hash, referral_code) 
       VALUES ('Free Test User', $1, 'trader', 'hash', $2)`,
      [freeEmail, `FREE${ts.toString().slice(-4)}`]
    );
    const freeUserId = freeRes.insertId;
    const freeToken = signAdminToken({ id: freeUserId, email: freeEmail, role: "trader" });

    const adminRes = await sql(
      `INSERT INTO users (full_name, email, role, password_hash) 
       VALUES ('Admin Test User', $1, 'admin', 'hash')`,
      [adminEmail]
    );
    const adminUserId = adminRes.insertId;
    const adminToken = signAdminToken({ id: adminUserId, email: adminEmail, role: "admin" });

    console.log(`Created test users: Free (ID: ${freeUserId}), Admin (ID: ${adminUserId})\n`);

    // TEST 1: New user receives Free status
    const statusRes = await fetch(`${BASE_URL}/api/v1/premium/status`, {
      headers: { Authorization: `Bearer ${freeToken}` }
    });
    const statusJson = await statusRes.json();
    assert(statusJson.data.status === "FREE_USER" && !statusJson.data.isPremium, "Test 1: New user receives FREE_USER status");

    // TEST 2: Free user CANNOT access Pro Zone APIs
    const optRes = await fetch(`${BASE_URL}/api/v1/discover/option-chain/NIFTY`, {
      headers: { Authorization: `Bearer ${freeToken}` }
    });
    assert(optRes.status === 403, "Test 2a: Free user rejected from Option Chain (403)");
    const optJson = await optRes.json();
    assert(optJson.code === "PREMIUM_REQUIRED", "Test 2b: Rejection has PREMIUM_REQUIRED error code");

    // TEST 3: Admin user has full access to Pro Zone APIs
    const adminOptRes = await fetch(`${BASE_URL}/api/v1/discover/option-chain/symbols`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminOptRes.status === 200, "Test 3: Admin has access to Pro Zone endpoints");

    // TEST 4: Get subscription plans
    const plansRes = await fetch(`${BASE_URL}/api/v1/subscriptions/plans`);
    const plansJson = await plansRes.json();
    assert(plansJson.success && plansJson.data.length >= 4, "Test 4: Retrieved subscription plans");

    // TEST 5: User initiates checkout for Monthly Pro
    const monthlyPlan = plansJson.data.find(p => p.planCode === "MONTHLY_PRO");
    const checkoutRes = await fetch(`${BASE_URL}/api/v1/subscriptions/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${freeToken}`
      },
      body: JSON.stringify({ planId: monthlyPlan.id })
    });
    const checkoutJson = await checkoutRes.json();
    assert(checkoutJson.success && checkoutJson.data.orderId, "Test 5: Checkout order created successfully");

    const orderId = checkoutJson.data.orderId;

    // TEST 6: Payment verification with valid signature activates subscription
    const verifyRes = await fetch(`${BASE_URL}/api/v1/subscriptions/verify-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${freeToken}`
      },
      body: JSON.stringify({
        orderId,
        paymentId: `pay_${Date.now()}`,
        signature: "MOCK_VERIFIED_SIGNATURE"
      })
    });
    const verifyJson = await verifyRes.json();
    assert(verifyJson.success && verifyJson.data.subscriptionId, "Test 6: Payment verified & Pro subscription activated");

    // TEST 7: Idempotent payment processing (duplicate verification does not double activate)
    const duplicateRes = await fetch(`${BASE_URL}/api/v1/subscriptions/verify-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${freeToken}`
      },
      body: JSON.stringify({
        orderId,
        paymentId: `pay_${Date.now()}`,
        signature: "MOCK_VERIFIED_SIGNATURE"
      })
    });
    const duplicateJson = await duplicateRes.json();
    assert(duplicateJson.data.alreadyProcessed === true, "Test 7: Duplicate payment verification is idempotent");

    // TEST 8: Newly activated premium user now HAS ACCESS to all Pro Zone APIs
    const newlyActiveRes = await fetch(`${BASE_URL}/api/v1/discover/heatmap/nifty-50`, {
      headers: { Authorization: `Bearer ${freeToken}` }
    });
    assert(newlyActiveRes.status === 200, "Test 8: Newly activated premium user can access Market Heatmap");

    // TEST 9: Referral Dashboard overview
    const refOverviewRes = await fetch(`${BASE_URL}/api/v1/referral/overview`, {
      headers: { Authorization: `Bearer ${freeToken}` }
    });
    const refOverviewJson = await refOverviewRes.json();
    assert(refOverviewJson.success && refOverviewJson.data.referralCode, "Test 9: Referral overview returns user code and link");

    // TEST 10: Register referee with referral code -> awards bonus days
    const refereeEmail = `referee_${ts}@test.com`;
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Referred Friend",
        email: refereeEmail,
        password: "Password123!",
        referralCode: refOverviewJson.data.referralCode
      })
    });
    const regJson = await regRes.json();
    assert(regRes.status === 201 && regJson.token, "Test 10a: Referee registered successfully via referral code");

    // Referee should have received Free Pro days from campaign
    const refereeToken = regJson.token;
    const refereeStatus = await fetch(`${BASE_URL}/api/v1/premium/status`, {
      headers: { Authorization: `Bearer ${refereeToken}` }
    });
    const refStatusJson = await refereeStatus.json();
    assert(refStatusJson.data.isPremium === true, "Test 10b: Referee automatically received Pro Zone access via referral campaign");

    // TEST 11: Admin grants complimentary Pro days
    const grantRes = await fetch(`${BASE_URL}/api/admin/pro-zone/grant-access`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ userId: freeUserId, days: 15, reason: "VIP Reward" })
    });
    const grantJson = await grantRes.json();
    assert(grantJson.success && grantJson.data.days === 15, "Test 11: Admin successfully granted complimentary Pro days");

    // TEST 12: Admin dashboard metrics
    const adminDashRes = await fetch(`${BASE_URL}/api/admin/pro-zone/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminDashJson = await adminDashRes.json();
    assert(adminDashJson.success && adminDashJson.data.totalRevenue > 0, "Test 12: Admin Pro Zone dashboard tracks revenue and subscribers");

    // TEST 13: Admin suspends user -> User immediately loses access
    const suspendRes = await fetch(`${BASE_URL}/api/admin/pro-zone/suspend-user/${freeUserId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ reason: "Terms Violation" })
    });
    assert(suspendRes.status === 200, "Test 13a: Admin suspended user Pro access");

    const accessAfterSuspension = await fetch(`${BASE_URL}/api/v1/discover/gainers`, {
      headers: { Authorization: `Bearer ${freeToken}` }
    });
    assert(accessAfterSuspension.status === 403, "Test 13b: Suspended user immediately blocked from Pro Zone (403)");

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  }

  console.log(`\n======================================================`);
  console.log(`PRO ZONE TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================`);

  server.close();
  process.exit(failed > 0 ? 1 : 0);
}

runTestSuite().catch(e => {
  console.error("Runner crash:", e);
  server.close();
  process.exit(1);
});

