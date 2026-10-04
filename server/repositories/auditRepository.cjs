const crypto = require('node:crypto');

function createInMemoryAuditRepository() {
  const logs = [];
  return {
    async create(data, user) {
      const entry = {
        id: crypto.randomUUID(),
        tenantId: user.tenantId,
        branchId: user.branchId,
        userId: user.sub,
        userName: user.name || user.email,
        action: String(data.action),
        resourceType: data.resourceType || '',
        resourceId: data.resourceId || '',
        details: data.details ?? null,
        createdAt: new Date().toISOString(),
      };
      logs.push(entry);
      return entry;
    },
    async list(scope) {
      const matching = logs.filter((entry) => entry.tenantId === scope.tenantId &&
        (scope.isGlobal || entry.branchId === scope.branchId) &&
        (!scope.branchFilter || entry.branchId === scope.branchFilter) &&
        (!scope.from || entry.createdAt >= scope.from) && (!scope.to || entry.createdAt <= scope.to) &&
        (!scope.userId || entry.userId === scope.userId) &&
        (!scope.type || entry.action === scope.type))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { rows: matching.slice(scope.offset, scope.offset + scope.limit), total: matching.length };
    },
    clear() {
      logs.length = 0;
    },
  };
}

function createPostgresAuditRepository(pool) {
  async function transaction(user, operation) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        "SELECT set_config('app.tenant_id', $1, true), set_config('app.branch_id', $2, true), set_config('app.is_global', $3, true)",
        [user.tenantId, user.branchId === 'all' ? '' : user.branchId, String(user.isGlobal)],
      );
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    create(data, user) {
      return transaction(user, async (client) => {
        const result = await client.query(
          `INSERT INTO audit_logs (tenant_id, branch_id, user_id, user_name, action, resource_type, resource_id, details)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [user.tenantId, user.branchId === 'all' ? data.branchId || null : user.branchId,
            user.sub, user.name || user.email, data.action, data.resourceType || '',
            data.resourceId || '', data.details === undefined ? null : JSON.stringify(data.details)],
        );
        return mapRow(result.rows[0]);
      });
    },
    list(scope, user) {
      return transaction(user, async (client) => {
        const values = [scope.tenantId];
        const where = ['tenant_id = $1'];
        const add = (sql, value) => {
          values.push(value);
          where.push(sql.replace('?', `$${values.length}`));
        };
        if (!scope.isGlobal) add('branch_id = ?', scope.branchId);
        else if (scope.branchFilter) add('branch_id = ?', scope.branchFilter);
        if (scope.from) add('created_at >= ?', scope.from);
        if (scope.to) add('created_at <= ?', scope.to);
        if (scope.userId) add('user_id = ?', scope.userId);
        if (scope.type) add('action = ?', scope.type);
        const count = await client.query(`SELECT count(*)::int AS total FROM audit_logs WHERE ${where.join(' AND ')}`, values);
        const result = await client.query(
          `SELECT * FROM audit_logs WHERE ${where.join(' AND ')}
           ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
          [...values, scope.limit, scope.offset],
        );
        return { rows: result.rows.map(mapRow), total: count.rows[0].total };
      });
    },
  };
}

function mapRow(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id,
    userId: row.user_id,
    userName: row.user_name,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    details: row.details,
    createdAt: row.created_at,
  };
}

module.exports = { createInMemoryAuditRepository, createPostgresAuditRepository };
