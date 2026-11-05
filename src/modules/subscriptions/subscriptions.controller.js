import { sql } from "../../db/mysql.js";
import { PaymentGatewayService } from "./payment-gateway.service.js";
import { PremiumAccessService } from "../premium/premium.service.js";

/**
 * GET /api/v1/subscriptions/plans
 */
export async function getSubscriptionPlansHandler(req, res) {
  try {
    const plans = await sql(
      `SELECT sp.*, 
              (SELECT JSON_ARRAYAGG(spf.feature_key) 
               FROM subscription_plan_features spf 
               WHERE spf.plan_id = sp.id AND spf.is_included = TRUE) AS features
       FROM subscription_plans sp
       WHERE sp.is_active = TRUE
       ORDER BY sp.display_order ASC`
    );

    return res.json({
      success: true,
      data: plans.map(p => ({
        id: p.id,
        planCode: p.plan_code,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        currency: p.currency,
        durationDays: p.duration_days,
        isPopular: Boolean(p.is_popular),
        features: typeof p.features === "string" ? JSON.parse(p.features) : (p.features || [])
      }))
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/v1/subscriptions/plans/:id
 */
export async function getSubscriptionPlanByIdHandler(req, res) {
  try {
    const { id } = req.params;
    const rows = await sql(
      `SELECT sp.*, 
              (SELECT JSON_ARRAYAGG(spf.feature_key) 
               FROM subscription_plan_features spf 
               WHERE spf.plan_id = sp.id AND spf.is_included = TRUE) AS features
       FROM subscription_plans sp
       WHERE sp.id = $1 OR sp.plan_code = $1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Subscription plan not found" });
    }

    const p = rows[0];
    return res.json({
      success: true,
      data: {
        id: p.id,
        planCode: p.plan_code,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        currency: p.currency,
        durationDays: p.duration_days,
        isPopular: Boolean(p.is_popular),
        features: typeof p.features === "string" ? JSON.parse(p.features) : (p.features || [])
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/v1/subscriptions/checkout
 */
export async function checkoutSubscriptionHandler(req, res) {
  try {
    const userId = req.user.id;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ success: false, message: "planId is required" });
    }

    const planRows = await sql(`SELECT * FROM subscription_plans WHERE id = $1 AND is_active = TRUE`, [planId]);
    if (!planRows.length) {
      return res.status(404).json({ success: false, message: "Invalid or inactive plan" });
    }

    const plan = planRows[0];
    if (plan.price <= 0) {
      return res.status(400).json({ success: false, message: "Free plan does not require checkout" });
    }

    const order = await PaymentGatewayService.createOrder(userId, plan.id, Number(plan.price), plan.currency);

    return res.json({
      success: true,
      message: "Payment order created successfully",
      data: {
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        keyId: order.keyId,
        gateway: order.gateway,
        plan: {
          id: plan.id,
          name: plan.name,
          durationDays: plan.duration_days
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/v1/subscriptions/verify-payment
 */
export async function verifyPaymentHandler(req, res) {
  try {
    const userId = req.user.id;
    const { orderId, paymentId, signature } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        success: false,
        message: "orderId, paymentId, and signature are required"
      });
    }

    const isValid = await PaymentGatewayService.verifyPaymentSignature(orderId, paymentId, signature);
    if (!isValid) {
      // Mark transaction failed
      await sql(
        `UPDATE subscription_transactions SET status = 'FAILED', error_message = 'Signature verification failed' WHERE order_id = $1`,
        [orderId]
      );
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature. Payment verification failed."
      });
    }

    // Activate subscription idempotently
    const activation = await PaymentGatewayService.processPaymentSuccess(orderId, paymentId, signature, req.body);

    return res.json({
      success: true,
      message: activation.alreadyProcessed
        ? "Payment was already verified and subscription is active"
        : "Payment verified successfully. Pro Zone unlocked!",
      data: activation
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/v1/subscriptions/current
 */
export async function getCurrentSubscriptionHandler(req, res) {
  try {
    const userId = req.user.id;
    const state = await PremiumAccessService.getUserSubscriptionState(userId);
    return res.json({
      success: true,
      data: state
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/v1/subscriptions/history
 */
export async function getSubscriptionHistoryHandler(req, res) {
  try {
    const userId = req.user.id;
    const history = await sql(
      `SELECT us.*, sp.name AS plan_name, sp.plan_code, sp.price
       FROM user_subscriptions us
       JOIN subscription_plans sp ON us.plan_id = sp.id
       WHERE us.user_id = $1
       ORDER BY us.id DESC`,
      [userId]
    );

    return res.json({
      success: true,
      data: history
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/v1/subscriptions/cancel
 */
export async function cancelSubscriptionHandler(req, res) {
  try {
    const userId = req.user.id;
    const { reason = "User requested cancellation" } = req.body;

    const subRows = await sql(
      `SELECT * FROM user_subscriptions WHERE user_id = $1 AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1`,
      [userId]
    );

    if (!subRows.length) {
      return res.status(404).json({ success: false, message: "No active subscription found to cancel" });
    }

    const sub = subRows[0];
    await sql(
      `UPDATE user_subscriptions 
       SET status = 'CANCELLED', cancellation_reason = $1, cancelled_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [reason, sub.id]
    );

    return res.json({
      success: true,
      message: "Subscription cancelled successfully. Pro Zone access will remain until expiry or has been revoked.",
      data: { subscriptionId: sub.id, status: "CANCELLED" }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/v1/subscriptions/renew
 */
export async function renewSubscriptionHandler(req, res) {
  try {
    const userId = req.user.id;
    const subRows = await sql(
      `SELECT * FROM user_subscriptions WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
      [userId]
    );

    if (!subRows.length) {
      return res.status(404).json({ success: false, message: "No prior subscription found" });
    }

    const sub = subRows[0];
    const planRows = await sql(`SELECT * FROM subscription_plans WHERE id = $1`, [sub.plan_id]);
    const plan = planRows[0];

    const order = await PaymentGatewayService.createOrder(userId, plan.id, Number(plan.price), plan.currency);

    return res.json({
      success: true,
      message: "Renewal order created",
      data: {
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        plan: { id: plan.id, name: plan.name }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/v1/subscriptions/payment-history
 */
export async function getPaymentHistoryHandler(req, res) {
  try {
    const userId = req.user.id;
    const payments = await sql(
      `SELECT st.*, sp.name AS plan_name, inv.invoice_number
       FROM subscription_transactions st
       JOIN subscription_plans sp ON st.plan_id = sp.id
       LEFT JOIN invoices inv ON st.id = inv.transaction_id
       WHERE st.user_id = $1
       ORDER BY st.id DESC`,
      [userId]
    );

    return res.json({
      success: true,
      data: payments
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

