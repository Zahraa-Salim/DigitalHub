// File: server/src/routes/contact.routes.ts
// What this code does:
// 1) Declares endpoint paths and HTTP methods for this module.
// 2) Applies authentication/validation middleware before handlers run.
// 3) Delegates request processing to controllers and shared helpers.
// 4) Exports a router consumed by the server bootstrap layer.
// @ts-nocheck
import { Router } from "express";
import { createContactMessage, getContactMessages, patchContactMessageStatus, replyToContactMessage, } from "../controllers/contact.controller.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { contactCreateSchema, idParamsSchema, replyBodySchema, statusPatchSchema, } from "../schemas/contact.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const contactRouter = Router();
contactRouter.post("/", rateLimit({
    keyPrefix: "rl:public:contact",
    windowSec: 600,
    max: 5,
}), validateRequest({ body: contactCreateSchema }), asyncHandler(createContactMessage));
contactRouter.use(verifyAdminAuth);
contactRouter.get("/", asyncHandler(getContactMessages));
contactRouter.patch("/:id/status", validateRequest({ params: idParamsSchema, body: statusPatchSchema }), asyncHandler(patchContactMessageStatus));
contactRouter.post("/:id/reply", validateRequest({ params: idParamsSchema, body: replyBodySchema }), asyncHandler(replyToContactMessage));
export { contactRouter };


