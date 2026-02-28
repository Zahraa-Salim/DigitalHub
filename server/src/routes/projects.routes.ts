// File Summary: server/src/routes/projects.routes.ts
// Layer: routes
// Purpose: Wires project admin/public endpoints to validation and controllers.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { Router } from "express";
import {
  createProject,
  deleteProject,
  getProjects,
  getPublicParticipantProjects,
  getPublicProjectById,
  getPublicProjects,
  patchProject,
} from "../controllers/projects.controller.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  projectCreateSchema,
  projectIdParamsSchema,
  projectPatchSchema,
  publicSlugParamsSchema,
} from "../schemas/projects.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const projectsRouter = Router();

projectsRouter.post(
  "/projects",
  verifyAdminAuth,
  validateRequest({ body: projectCreateSchema }),
  asyncHandler(createProject),
);

projectsRouter.get("/projects", verifyAdminAuth, asyncHandler(getProjects));

projectsRouter.patch(
  "/projects/:id",
  verifyAdminAuth,
  validateRequest({ params: projectIdParamsSchema, body: projectPatchSchema }),
  asyncHandler(patchProject),
);

projectsRouter.delete(
  "/projects/:id",
  verifyAdminAuth,
  validateRequest({ params: projectIdParamsSchema }),
  asyncHandler(deleteProject),
);

projectsRouter.get("/public/projects", asyncHandler(getPublicProjects));
projectsRouter.get(
  "/public/projects/:id",
  validateRequest({ params: projectIdParamsSchema }),
  asyncHandler(getPublicProjectById),
);
projectsRouter.get(
  "/public/participants/:public_slug/projects",
  validateRequest({ params: publicSlugParamsSchema }),
  asyncHandler(getPublicParticipantProjects),
);

export { projectsRouter };
