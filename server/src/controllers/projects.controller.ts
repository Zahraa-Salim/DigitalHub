// File Summary: server/src/controllers/projects.controller.ts
// Layer: controllers
// Purpose: Maps project HTTP requests to services and sends standard responses.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { sendList, sendSuccess } from "../utils/httpResponse.js";
import {
  createProjectService,
  deleteProjectService,
  getPublicProjectByIdService,
  listProjectsService,
  patchProjectService,
} from "../services/projects.service.js";

export async function createProject(req, res) {
  const data = await createProjectService(req.user.id, req.body);
  sendSuccess(res, data, "Project created successfully.", 201);
}

export async function getProjects(req, res) {
  const result = await listProjectsService(req.query);
  sendList(res, result.data, result.pagination);
}

export async function patchProject(req, res) {
  const data = await patchProjectService(Number(req.params.id), req.user.id, req.body);
  sendSuccess(res, data, "Project updated successfully.");
}

export async function deleteProject(req, res) {
  const data = await deleteProjectService(Number(req.params.id), req.user.id);
  sendSuccess(res, data, "Project deleted successfully.");
}

export async function getPublicProjects(req, res) {
  const result = await listProjectsService(req.query, { publicOnly: true });
  sendList(res, result.data, result.pagination);
}

export async function getPublicProjectById(req, res) {
  const data = await getPublicProjectByIdService(Number(req.params.id));
  sendSuccess(res, data);
}

export async function getPublicParticipantProjects(req, res) {
  const result = await listProjectsService(req.query, {
    publicOnly: true,
    publicSlug: String(req.params.public_slug),
  });
  sendList(res, result.data, result.pagination);
}
