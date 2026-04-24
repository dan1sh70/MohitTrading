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
