// File: server/src/controllers/projects.controller.ts
// Purpose: Handles HTTP request and response flow for projects.
// It reads request data, calls the matching service methods, and sends API responses.


import type { Request, Response } from "express";
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import {
  createProjectService,
  deleteProjectService,
  getPublicProjectByIdService,
  listProjectsService,
  patchProjectService,
} from "../services/projects.service.js";

// Handles 'createProject' workflow for this module.
export async function createProject(req: Request, res: Response) {
  const data = await createProjectService(req.user!.id, req.body);
  sendSuccess(res, data, "Project created successfully.", 201);
}

// Handles 'getProjects' workflow for this module.
export async function getProjects(req: Request, res: Response) {
  const result = await listProjectsService(req.query);
  sendList(res, result.data, result.pagination);
}

// Handles 'patchProject' workflow for this module.
export async function patchProject(req: Request, res: Response) {
  const data = await patchProjectService(Number(req.params.id), req.user!.id, req.body);
  sendSuccess(res, data, "Project updated successfully.");
}

// Handles 'deleteProject' workflow for this module.
export async function deleteProject(req: Request, res: Response) {
  const data = await deleteProjectService(Number(req.params.id), req.user!.id);
  sendSuccess(res, data, "Project deleted successfully.");
}

// Handles 'getPublicProjects' workflow for this module.
export async function getPublicProjects(req: Request, res: Response) {
  const result = await listProjectsService(req.query, { publicOnly: true });
  sendList(res, result.data, result.pagination);
}

// Handles 'getPublicProjectById' workflow for this module.
export async function getPublicProjectById(req: Request, res: Response) {
  const data = await getPublicProjectByIdService(Number(req.params.id));
  sendSuccess(res, data);
}

// Handles 'getPublicParticipantProjects' workflow for this module.
export async function getPublicParticipantProjects(req: Request, res: Response) {
  const result = await listProjectsService(req.query, {
    publicOnly: true,
    publicSlug: String(req.params.public_slug),
  });
  sendList(res, result.data, result.pagination);
}





