const { databaseUrl } = require('../config.cjs');
const { createInMemoryLedgerRepository, createPostgresLedgerRepository } = require('./ledgerRepository.cjs');
const { createInMemoryAuditRepository, createPostgresAuditRepository } = require('./auditRepository.cjs');

let pool;
let ledgerRepository = createInMemoryLedgerRepository();
let auditRepository = createInMemoryAuditRepository();

if (databaseUrl) {
  let Pool;
  try {
    ({ Pool } = require('pg'));
  } catch (error) {
    throw new Error('DATABASE_URL requires the optional "pg" package. Install project optional dependencies.', { cause: error });
  }
  pool = new Pool({ connectionString: databaseUrl });
  ledgerRepository = createPostgresLedgerRepository(pool);
  auditRepository = createPostgresAuditRepository(pool);
}

module.exports = { ledgerRepository, auditRepository, pool };
