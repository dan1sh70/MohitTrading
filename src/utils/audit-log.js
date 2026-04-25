import { sql } from "../db/mysql.js";

export async function writeAuditLog({
  actorUserId = null,
  action,
  targetType = null,
  targetId = null,
  details = null
}) {
  const serializedDetails = details === null ? null : JSON.stringify(details);

  await sql(
    `
      INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, details)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [actorUserId, action, targetType, targetId, serializedDetails]
  );
}
