/**
 * Append-only audit log (local/dev store). Mirrors the audit_logs table:
 * rows are only ever appended, never updated or removed.
 */
const crypto = require('node:crypto');

const entries = [];

const appendAudit = ({ tenantId, branchId = null, userId = null, action, entityType, entityId = null, before = null, after = null, ip = null }) => {
  const row = Object.freeze({
    id: crypto.randomUUID(),
    tenantId,
    branchId,
    userId,
    action,
    entityType,
    entityId,
    beforeData: before,
    afterData: after,
    ipAddress: ip,
    createdAt: new Date().toISOString(),
  });
  entries.push(row);
  return row;
};

const listAudit = (tenantId) => entries.filter((e) => e.tenantId === tenantId);

module.exports = { appendAudit, listAudit };
