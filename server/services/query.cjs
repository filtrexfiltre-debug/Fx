function queryString(value) {
  return typeof value === 'string' ? value : undefined;
}

function parsePagination(query) {
  const limitValue = queryString(query.limit);
  const offsetValue = queryString(query.offset);
  const requestedLimit = limitValue && /^\d+$/.test(limitValue) ? Number(limitValue) : 50;
  const requestedOffset = offsetValue && /^\d+$/.test(offsetValue) ? Number(offsetValue) : 0;
  return {
    limit: Math.min(200, Math.max(1, requestedLimit)),
    offset: Math.min(1000000, Math.max(0, requestedOffset)),
  };
}

function parseDate(query, key, endOfDay = false) {
  const value = queryString(query[key]);
  if (!value || Number.isNaN(Date.parse(value))) return null;
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T23:59:59.999Z`;
  return value;
}

function buildScope(query, user) {
  return {
    ...parsePagination(query),
    tenantId: user.tenantId,
    branchId: user.branchId,
    isGlobal: user.isGlobal,
    branchFilter: user.isGlobal ? queryString(query.branchId) || null : null,
    from: parseDate(query, 'from'),
    to: parseDate(query, 'to', true),
    userId: queryString(query.userId) || null,
    type: queryString(query.type) || null,
  };
}

module.exports = { queryString, parsePagination, buildScope };
