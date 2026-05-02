import bcrypt from "bcryptjs";
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

export async function register(req, res) {
  const { fullName, email, password, role } = req.validatedBody;

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
