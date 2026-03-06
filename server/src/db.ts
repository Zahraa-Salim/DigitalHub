// File Summary: server/src/db.ts
// Layer: root
// Purpose: Re-exports database helpers so existing imports stay stable.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
export { pool, withTransaction } from "./db/index.js";


