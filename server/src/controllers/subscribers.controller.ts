import type { Request, Response } from "express";
import { sendSuccess } from "../utils/httpResponse.js";
import {
  listSubscribersService,
  patchSubscriberService,
  subscribeService,
  unsubscribeService,
} from "../services/subscribers.service.js";

export async function postSubscribe(req: Request, res: Response) {
  const data = await subscribeService(req.body);
  sendSuccess(res, data, "Subscribed successfully.", 201);
}

export async function postUnsubscribe(req: Request, res: Response) {
  const data = await unsubscribeService(req.body.phone);
  sendSuccess(res, data, "Unsubscribed successfully.");
}

export async function getSubscribers(req: Request, res: Response) {
  const data = await listSubscribersService(req.query as Record<string, unknown>);
  res.json({ success: true, ...data });
}

export async function patchSubscriber(req: Request, res: Response) {
  const data = await patchSubscriberService(Number(req.params.id), req.user!.id, req.body);
  sendSuccess(res, data, "Subscriber updated.");
}
