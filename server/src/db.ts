// File: server/src/db.ts
// Purpose: Re-exports the shared database helpers from the main DB module.
// It gives other files a short import path for pool and transaction access.

export { pool, withTransaction } from "./db/index.js";

