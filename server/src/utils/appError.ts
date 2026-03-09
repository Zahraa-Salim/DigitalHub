// File: server/src/utils/appError.ts
// What this code does:
// 1) Provides reusable helper functions for backend modules.
// 2) Encapsulates common formatting, parsing, and safety checks.
// 3) Keeps route/controller code focused on workflow logic.
// 4) Avoids duplicating low-level utility code across files.
// @ts-nocheck
import { errorCodes } from "../constants/errorCodes.js";
export class AppError extends Error {
    constructor(statusCode, codeOrMessage, messageOrDetails, details) {
        if (typeof messageOrDetails === "string" && errorCodes.includes(codeOrMessage)) {
            super(messageOrDetails);
            this.code = codeOrMessage;
            this.details = details;
        }
        else {
            super(String(codeOrMessage));
            this.code = defaultErrorCodeForStatus(statusCode);
            this.details = messageOrDetails;
        }
        this.statusCode = statusCode;
    }
}
function defaultErrorCodeForStatus(statusCode) {
    switch (statusCode) {
        case 400:
        case 409:
        case 422:
            return "VALIDATION_ERROR";
        case 401:
            return "UNAUTHORIZED";
        case 403:
            return "FORBIDDEN";
        case 404:
            return "NOT_FOUND";
        case 429:
            return "RATE_LIMITED";
        default:
            return "INTERNAL_ERROR";
    }
}


