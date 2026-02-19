// File Summary: server/src/utils/appError.ts
// Layer: utils
// Purpose: Provides shared utility helpers reused by multiple backend layers.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
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


