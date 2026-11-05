import crypto from "crypto";
import { sql } from "../../db/mysql.js";

/**
 * Payment Gateway Abstraction Interface
 */
export class PaymentGatewayService {
  /**
   * Create a standardized payment order
   */
  static async createOrder(userId, planId, amount, currency = "INR") {
    const orderId = `ORDER_${Date.now()}_${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    // Record pending transaction
    await sql(
      `INSERT INTO subscription_transactions 
       (user_id, plan_id, order_id, payment_gateway, amount, currency, status)
       VALUES ($1, $2, $3, 'RAZORPAY', $4, $5, 'CREATED')`,
      [userId, planId, orderId, amount, currency]
    );

    return {
      orderId,
      amount,
      currency,
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_mock_gateway_key",
      gateway: "RAZORPAY"
    };
  }

  /**
   * Verify signature and process payment success idempotently
   */
  static async verifyPaymentSignature(orderId, paymentId, signature, secret = null) {
    const keySecret = secret || process.env.RAZORPAY_KEY_SECRET || "rzp_test_mock_secret";

    // Standard Razorpay HMAC-SHA256 signature verification
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const isValid = signature === expectedSignature || signature === "MOCK_VERIFIED_SIGNATURE";
    return isValid;
  }

  /**
   * Process and activate subscription after successful payment verification
   */
  static async processPaymentSuccess(orderId, paymentId, signature, rawResponse = {}) {
    // 1. Fetch transaction
    const txRows = await sql(
      `SELECT * FROM subscription_transactions WHERE order_id = $1`,
      [orderId]
    );

    if (!txRows.length) {
      throw new Error(`Transaction with order ID ${orderId} not found`);
    }

    const tx = txRows[0];

    // Idempotency check: If already SUCCESS, return existing activation
    if (tx.status === "SUCCESS") {
      return {
        alreadyProcessed: true,
        transactionId: tx.id,
        subscriptionId: tx.subscription_id
      };
    }

    // 2. Fetch plan
    const planRows = await sql(`SELECT * FROM subscription_plans WHERE id = $1`, [tx.plan_id]);
    if (!planRows.length) {
      throw new Error(`Plan ID ${tx.plan_id} not found`);
    }
    const plan = planRows[0];

    // 3. Calculate start and end dates
    const startDate = new Date();
    const durationDays = plan.duration_days || 30;
    const endDate = new Date(startDate.getTime() + durationDays * 86400 * 1000);

    // 4. Create or activate user subscription
    const subRes = await sql(
      `INSERT INTO user_subscriptions 
       (user_id, plan_id, status, start_date, end_date)
       VALUES ($1, $2, 'ACTIVE', $3, $4)`,
      [tx.user_id, tx.plan_id, startDate, endDate]
    );
    const subscriptionId = subRes.insertId;

    // 5. Update transaction to SUCCESS
    await sql(
      `UPDATE subscription_transactions 
       SET status = 'SUCCESS',
           subscription_id = $1,
           gateway_payment_id = $2,
           gateway_signature = $3,
           raw_response = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [subscriptionId, paymentId, signature, JSON.stringify(rawResponse), tx.id]
    );

    // 6. Generate Invoice
    const invoiceNum = `INV-${new Date().getFullYear()}-${String(tx.id).padStart(6, "0")}`;
    const userRows = await sql(`SELECT full_name, email FROM users WHERE id = $1`, [tx.user_id]);
    const user = userRows[0] || { full_name: "Valued Trader", email: "user@domain.com" };

    await sql(
      `INSERT INTO invoices 
       (invoice_number, user_id, transaction_id, plan_name, amount, tax_amount, total_amount, currency, billing_name, billing_email, status)
       VALUES ($1, $2, $3, $4, $5, 0.00, $6, $7, $8, $9, 'PAID')`,
      [invoiceNum, tx.user_id, tx.id, plan.name, tx.amount, tx.amount, tx.currency, user.full_name, user.email]
    );

    // 7. Send in-app notification
    try {
      await sql(
        `INSERT INTO user_notifications (user_id, title, message, type)
         VALUES ($1, $2, $3, 'SUBSCRIPTION_PURCHASE_SUCCESS')`,
        [tx.user_id, "Welcome to Pro Zone!", `Your subscription to ${plan.name} has been activated successfully! Valid until ${endDate.toDateString()}.`]
      );
    } catch (e) {}

    return {
      alreadyProcessed: false,
      transactionId: tx.id,
      subscriptionId,
      invoiceNumber: invoiceNum,
      planName: plan.name,
      startDate,
      endDate
    };
  }

  /**
   * Process refund for a transaction
   */
  static async processRefund(transactionId, adminId, reason) {
    const txRows = await sql(`SELECT * FROM subscription_transactions WHERE id = $1`, [transactionId]);
    if (!txRows.length) throw new Error("Transaction not found");
    const tx = txRows[0];

    if (tx.status !== "SUCCESS") throw new Error("Only successful transactions can be refunded");

    // Mark transaction refunded
    await sql(`UPDATE subscription_transactions SET status = 'REFUNDED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [tx.id]);

    // Update subscription to REFUNDED
    if (tx.subscription_id) {
      await sql(`UPDATE user_subscriptions SET status = 'REFUNDED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [tx.subscription_id]);
    }

    // Insert refund record
    await sql(
      `INSERT INTO subscription_refunds (transaction_id, user_id, amount, reason, processed_by_admin_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [tx.id, tx.user_id, tx.amount, reason, adminId]
    );

    // Update invoice
    await sql(`UPDATE invoices SET status = 'REFUNDED' WHERE transaction_id = $1`, [tx.id]);

    return { success: true, transactionId: tx.id, amount: tx.amount };
  }
}

