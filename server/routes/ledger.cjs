const express = require('express');
const { ledgerRepository } = require('../repositories/index.cjs');
const { authenticate } = require('../middleware/auth.cjs');
const { requirePermission, requireConsolidatedAccess } = require('../middleware/permissions.cjs');
const { createRateLimiter } = require('../middleware/rateLimit.cjs');
const { rateLimitMax, rateLimitWindowMs } = require('../config.cjs');
const { queryString, buildScope } = require('../services/query.cjs');

const router = express.Router();
router.use(createRateLimiter({ windowMs: rateLimitWindowMs, max: rateLimitMax }));
router.use(authenticate);

router.post('/', requirePermission('finance.write'), async (request, response, next) => {
  const { type, amount, transactionDate, reversesTransactionId } = request.body || {};
  if (typeof type !== 'string' || !type.trim() ||
      (!reversesTransactionId && (!Number.isFinite(Number(amount)) || Number(amount) === 0)) ||
      (transactionDate && Number.isNaN(Date.parse(transactionDate)))) {
    return response.status(400).json({ message: 'Geçerli işlem türü, tutar ve tarih giriniz.' });
  }
  if (request.user.isGlobal && !reversesTransactionId &&
      (typeof request.body.branchId !== 'string' || !request.body.branchId)) {
    return response.status(400).json({ message: 'Şube seçimi gereklidir.' });
  }
  try {
    const entry = await ledgerRepository.create(request.body, request.user);
    response.status(201).json({ data: entry });
  } catch (error) {
    next(error);
  }
});

router.get('/', requirePermission('finance.read'), requireConsolidatedAccess, async (request, response, next) => {
  if (queryString(request.query.format) === 'csv' && !request.user.permissions.includes('finance.export')) {
    return response.status(403).json({ message: 'CSV dışa aktarma yetkiniz yok.' });
  }
  const scope = buildScope(request.query, request.user);
  const { limit, offset } = scope;
  try {
    const result = await ledgerRepository.list(scope, request.user);
    if (queryString(request.query.format) === 'csv') {
      response.type('text/csv; charset=utf-8');
      response.set('Content-Disposition', 'attachment; filename="ledger.csv"');
      const headers = ['id', 'transactionDate', 'branchId', 'userId', 'userName', 'type', 'amount', 'currency', 'description', 'reversesTransactionId'];
      const cell = (value) => {
        let text = value && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
        if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
        return `"${text.replace(/"/g, '""')}"`;
      };
      return response.send(`\uFEFF${[headers, ...result.rows.map((row) => headers.map((key) => row[key]))]
        .map((row) => row.map(cell).join(';')).join('\r\n')}`);
    }
    response.json({ ...result, limit, offset });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
