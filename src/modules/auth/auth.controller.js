import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sql } from "../../db/mysql.js";
import { writeAuditLog } from "../../utils/audit-log.js";
import { signAdminToken } from "../../utils/jwt.js";

export async function login(req, res) {
  const { email, password } = req.validatedBody;

  const userResult = await sql(
    `SELECT id, full_name, email, role, password_hash FROM users WHERE email = $1`,
    [email]
  );

  const user = userResult.rows[0];

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = signAdminToken({ id: user.id, email: user.email, role: user.role });

  await writeAuditLog({
    actorUserId: user.id,
    action: "ADMIN_LOGIN",
    targetType: "user",
    targetId: String(user.id),
    details: { email: user.email, role: user.role }
  });

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.full_name,
      email: user.email,
      role: user.role
    }
  });
}

export async function logout(req, res) {
  // Since we use stateless JWTs without a Redis blacklist, we just return success.
  // The client is responsible for deleting the token from local storage/cookies.
  
  if (req.user) {
    await writeAuditLog({
      actorUserId: req.user.id,
      action: "USER_LOGOUT",
      targetType: "user",
      targetId: String(req.user.id),
      details: { email: req.user.email }
    });
  }

  return res.json({
    success: true,
    message: "Logged out successfully"
  });
}

export async function register(req, res) {
  const { fullName, email, password } = req.validatedBody;
  const role = "trader"; // Always register as a trader

  const existingUser = await sql(
    `SELECT id FROM users WHERE email = $1`,
    [email]
  );

  if (existingUser.rows.length > 0) {
    return res.status(409).json({ message: "User already exists with this email" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const balance = role === "trader" ? 100000 : 0;

  const result = await sql(
    `INSERT INTO users (full_name, email, role, password_hash, balance)
     VALUES ($1, $2, $3, $4, $5)`,
    [fullName, email, role, passwordHash, balance]
  );

  const newUserResult = await sql(
    `SELECT id, full_name, email, role FROM users WHERE email = $1`,
    [email]
  );

  const newUser = newUserResult.rows[0];
  const token = signAdminToken({ id: newUser.id, email: newUser.email, role: newUser.role });

  await writeAuditLog({
    actorUserId: newUser.id,
    action: "USER_REGISTER",
    targetType: "user",
    targetId: String(newUser.id),
    details: { email: newUser.email, role: newUser.role }
  });

  return res.status(201).json({
    message: "User registered successfully",
    token,
    user: {
      id: newUser.id,
      name: newUser.full_name,
      email: newUser.email,
      role: newUser.role
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD - Generate reset token
// ═══════════════════════════════════════════════════════════════════════════

export async function forgotPassword(req, res) {
  const { email } = req.validatedBody;

  // Check if user exists
  const userResult = await sql(
    `SELECT id, email, full_name FROM users WHERE email = $1`,
    [email]
  );

  const user = userResult.rows[0];

  // Always return success to prevent email enumeration attacks
  if (!user) {
    return res.json({
      success: true,
      message: "If an account exists with this email, a password reset link has been sent."
    });
  }

  // Generate secure random token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

  // Set expiration (1 hour from now)
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  // Invalidate any existing unused tokens for this user
  await sql(
    `UPDATE password_reset_tokens 
     SET used_at = CURRENT_TIMESTAMP 
     WHERE user_id = $1 AND used_at IS NULL`,
    [user.id]
  );

  // Store the hashed token
  await sql(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at) 
     VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt]
  );

  // Log the action (without sensitive data)
  await writeAuditLog({
    actorUserId: user.id,
    action: "PASSWORD_RESET_REQUEST",
    targetType: "user",
    targetId: String(user.id),
    details: { email: user.email }
  });

  // TODO: Send email with reset link
  // For now, return the token in response (development only)
  // In production, send email and don't expose the token
  const isDevelopment = process.env.NODE_ENV === "development";

  const response = {
    success: true,
    message: "Password reset link has been sent to your email address."
  };

  // Only expose token in development mode
  if (isDevelopment) {
    response.resetToken = resetToken;
    response.note = "This token is only exposed in development mode. In production, it would be sent via email.";
  }

  return res.json(response);
}

// ═══════════════════════════════════════════════════════════════════════════
// RESET PASSWORD - Validate token and update password
// ═══════════════════════════════════════════════════════════════════════════

export async function resetPassword(req, res) {
  const { token, newPassword } = req.validatedBody;

  // Hash the provided token for comparison
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  // Find valid token
  const tokenResult = await sql(
    `SELECT rt.id, rt.user_id, rt.expires_at, rt.used_at, u.email, u.full_name
     FROM password_reset_tokens rt
     JOIN users u ON rt.user_id = u.id
     WHERE rt.token = $1`,
    [tokenHash]
  );

  const resetRecord = tokenResult.rows[0];

  // Validate token
  if (!resetRecord) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired reset token."
    });
  }

  if (resetRecord.used_at) {
    return res.status(400).json({
      success: false,
      message: "This reset token has already been used. Please request a new one."
    });
  }

  if (new Date(resetRecord.expires_at) < new Date()) {
    return res.status(400).json({
      success: false,
      message: "Reset token has expired. Please request a new one."
    });
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, 12);

  // Update user's password
  await sql(
    `UPDATE users SET password_hash = $1 WHERE id = $2`,
    [passwordHash, resetRecord.user_id]
  );

  // Mark token as used
  await sql(
    `UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [resetRecord.id]
  );

  // Log the action
  await writeAuditLog({
    actorUserId: resetRecord.user_id,
    action: "PASSWORD_RESET_COMPLETE",
    targetType: "user",
    targetId: String(resetRecord.user_id),
    details: { email: resetRecord.email }
  });

  return res.json({
    success: true,
    message: "Password has been reset successfully. You can now log in with your new password."
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// VERIFY RESET TOKEN - Check if token is valid
// ═══════════════════════════════════════════════════════════════════════════

export async function verifyResetToken(req, res) {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: "Token is required."
    });
  }

  // Hash the provided token for comparison
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  // Find valid token
  const tokenResult = await sql(
    `SELECT rt.expires_at, rt.used_at, u.email
     FROM password_reset_tokens rt
     JOIN users u ON rt.user_id = u.id
     WHERE rt.token = $1`,
    [tokenHash]
  );

  const resetRecord = tokenResult.rows[0];

  if (!resetRecord) {
    return res.status(400).json({
      success: false,
      valid: false,
      message: "Invalid reset token."
    });
  }

  if (resetRecord.used_at) {
    return res.status(400).json({
      success: false,
      valid: false,
      message: "This reset token has already been used."
    });
  }

  if (new Date(resetRecord.expires_at) < new Date()) {
    return res.status(400).json({
      success: false,
      valid: false,
      message: "Reset token has expired."
    });
  }

  return res.json({
    success: true,
    valid: true,
    email: resetRecord.email,
    message: "Token is valid."
  });
}
