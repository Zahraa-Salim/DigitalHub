// File: server/src/utils/appError.ts
// Purpose: Provides shared helper logic for app error.
// It supports other backend modules with reusable utility functions.


import { errorCodes } from "../constants/errorCodes.js";

type KnownErrorCode = (typeof errorCodes)[number];

export class AppError extends Error {
    statusCode: number;
    code: KnownErrorCode | string;
    details?: unknown;

    constructor(
        statusCode: number,
        codeOrMessage: string,
        messageOrDetails?: string | unknown,
        details?: unknown,
    ) {
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
// Handles 'defaultErrorCodeForStatus' workflow for this module.
function defaultErrorCodeForStatus(statusCode: number): KnownErrorCode {
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

