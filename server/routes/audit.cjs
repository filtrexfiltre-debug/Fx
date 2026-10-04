const express = require('express');
const { auditRepository } = require('../repositories/index.cjs');
const { authenticate } = require('../middleware/auth.cjs');
const { requirePermission, requireConsolidatedAccess } = require('../middleware/permissions.cjs');
const { createRateLimiter } = require('../middleware/rateLimit.cjs');
const { rateLimitMax, rateLimitWindowMs } = require('../config.cjs');

const router = express.Router();
router.use(createRateLimiter({ windowMs: rateLimitWindowMs, max: rateLimitMax }));
router.use(authenticate);

function parsePagination(query) {
  const requestedLimit = Number.parseInt(query.limit, 10);
  const requestedOffset = Number.parseInt(query.offset, 10);
  return {
    limit: Number.isFinite(requestedLimit) ? Math.min(200, Math.max(1, requestedLimit)) : 50,
    offset: Number.isFinite(requestedOffset) ? Math.max(0, requestedOffset) : 0,
  };
}

router.post('/', requirePermission('audit.write'), async (request, response, next) => {
  if (typeof request.body?.action !== 'string' || !request.body.action.trim()) {
    return response.status(400).json({ message: 'Denetim işlemi gereklidir.' });
  }
  try {
    const entry = await auditRepository.create(request.body, request.user);
    response.status(201).json({ data: entry });
  } catch (error) {
    next(error);
  }
});

router.get('/', requirePermission('audit.read'), requireConsolidatedAccess, async (request, response, next) => {
  if (request.query.format === 'csv' && !request.user.permissions.includes('audit.export')) {
    return response.status(403).json({ message: 'CSV dışa aktarma yetkiniz yok.' });
  }
  const pagination = parsePagination(request.query);
  const scope = {
    ...pagination,
    tenantId: request.user.tenantId,
    branchId: request.user.branchId,
    isGlobal: request.user.isGlobal,
    branchFilter: request.user.isGlobal ? request.query.branchId || null : null,
    from: request.query.from || null,
    to: request.query.to ? `${request.query.to.slice(0, 10)}T23:59:59.999Z` : null,
    userId: request.query.userId || null,
    type: request.query.type || null,
  };
  try {
    const result = await auditRepository.list(scope, request.user);
    if (request.query.format === 'csv') {
      response.type('text/csv; charset=utf-8');
      response.set('Content-Disposition', 'attachment; filename="audit-logs.csv"');
      return response.send(toCsv(result.rows));
    }
    response.json({ ...result, ...pagination });
  } catch (error) {
    next(error);
  }
});

function toCsv(rows) {
  const headers = ['id', 'createdAt', 'branchId', 'userId', 'userName', 'action', 'resourceType', 'resourceId', 'details'];
  const cell = (value) => {
    let text = value && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
    if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return `\uFEFF${[headers, ...rows.map((row) => headers.map((key) => row[key]))]
    .map((row) => row.map(cell).join(';')).join('\r\n')}`;
}

module.exports = router;
