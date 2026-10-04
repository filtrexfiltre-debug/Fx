const crypto = require('node:crypto');

function createInMemoryLedgerRepository() {
  const entries = [];

  function visible(entry, scope) {
    return entry.tenantId === scope.tenantId &&
      (scope.isGlobal || entry.branchId === scope.branchId) &&
      (!scope.branchFilter || entry.branchId === scope.branchFilter) &&
      (!scope.from || entry.transactionDate >= scope.from) &&
      (!scope.to || entry.transactionDate <= scope.to) &&
      (!scope.userId || entry.userId === scope.userId) &&
      (!scope.type || entry.type === scope.type);
  }

  return {
    async create(data, user) {
      let amount = Number(data.amount);
      let branchId = user.branchId;
      if (data.reversesTransactionId) {
        const original = entries.find((entry) => entry.id === data.reversesTransactionId &&
          entry.tenantId === user.tenantId &&
          (user.isGlobal || entry.branchId === user.branchId));
        if (!original) throw Object.assign(new Error('Ters çevrilecek kayıt bulunamadı.'), { status: 404 });
        if (entries.some((entry) => entry.reversesTransactionId === original.id)) {
          throw Object.assign(new Error('Bu kayıt zaten ters çevrilmiş.'), { status: 409 });
        }
        amount = -Number(original.amount);
        branchId = original.branchId;
      } else if (user.isGlobal && data.branchId) {
        branchId = data.branchId;
      }
      const entry = {
        id: crypto.randomUUID(),
        tenantId: user.tenantId,
        branchId,
        type: String(data.type),
        amount,
        currency: data.currency || 'TRY',
        description: data.description || '',
        transactionDate: data.transactionDate || new Date().toISOString(),
        userId: user.sub,
        userName: user.name || user.email,
        reversesTransactionId: data.reversesTransactionId || null,
        createdAt: new Date().toISOString(),
      };
      entries.push(entry);
      return entry;
    },
    async list(scope) {
      const matching = entries.filter((entry) => visible(entry, scope)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { rows: matching.slice(scope.offset, scope.offset + scope.limit), total: matching.length };
    },
    clear() {
      entries.length = 0;
    },
  };
}

function createPostgresLedgerRepository(pool) {
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
        let amount = Number(data.amount);
        let branchId = user.branchId === 'all' ? data.branchId : user.branchId;
        if (data.reversesTransactionId) {
          const originalResult = await client.query(
            `SELECT id, branch_id, amount FROM financial_transactions
             WHERE id = $1 AND tenant_id = $2 AND ($3::boolean OR branch_id = $4)
             FOR UPDATE`,
            [data.reversesTransactionId, user.tenantId, user.isGlobal, user.branchId],
          );
          const original = originalResult.rows[0];
          if (!original) throw Object.assign(new Error('Ters çevrilecek kayıt bulunamadı.'), { status: 404 });
          const reversal = await client.query(
            'SELECT 1 FROM financial_transactions WHERE reverses_transaction_id = $1 LIMIT 1',
            [original.id],
          );
          if (reversal.rowCount) throw Object.assign(new Error('Bu kayıt zaten ters çevrilmiş.'), { status: 409 });
          amount = -Number(original.amount);
          branchId = original.branch_id;
        }
        const result = await client.query(
          `INSERT INTO financial_transactions
           (tenant_id, branch_id, transaction_type, amount, currency, description, transaction_date, user_id, user_name, reverses_transaction_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
          [user.tenantId, branchId, data.type, amount, data.currency || 'TRY',
            data.description || '', data.transactionDate || new Date().toISOString(),
            user.sub, user.name || user.email, data.reversesTransactionId || null],
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
        if (scope.from) add('transaction_date >= ?', scope.from);
        if (scope.to) add('transaction_date <= ?', scope.to);
        if (scope.userId) add('user_id = ?', scope.userId);
        if (scope.type) add('transaction_type = ?', scope.type);
        const count = await client.query(`SELECT count(*)::int AS total FROM financial_transactions WHERE ${where.join(' AND ')}`, values);
        const rows = await client.query(
          `SELECT * FROM financial_transactions WHERE ${where.join(' AND ')}
           ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
          [...values, scope.limit, scope.offset],
        );
        return { rows: rows.rows.map(mapRow), total: count.rows[0].total };
      });
    },
  };
}

function mapRow(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id,
    type: row.transaction_type,
    amount: Number(row.amount),
    currency: row.currency,
    description: row.description,
    transactionDate: row.transaction_date,
    userId: row.user_id,
    userName: row.user_name,
    reversesTransactionId: row.reverses_transaction_id,
    createdAt: row.created_at,
  };
}

module.exports = { createInMemoryLedgerRepository, createPostgresLedgerRepository };
