import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { validateBody, validateQuery, validateParams } from "../middleware/validate.js";
import { CycleService } from "../services/cycleService.js";

export const cyclesRouter = Router();

// Protect all cycle endpoints
cyclesRouter.use(requireAuth);

const createCycleSchema = z.object({
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  flow: z.enum(["light", "medium", "heavy", "spotting"]).optional(),
  notes: z.string().max(1000).optional(),
});

const updateCycleSchema = createCycleSchema.partial();

const logSymptomsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  symptoms: z.array(z.string()),
  pain: z.number().min(0).max(10).optional(),
  mood: z.string().optional(),
});

const getQuerySchema = z.object({
  targetUserId: z.string().optional(),
  date: z.string().optional(),
});

const idParamSchema = z.object({
  id: z.string(),
});

/**
 * POST /cycles
 * Only owner creates their cycle
 */
cyclesRouter.post(
  "/",
  validateBody(createCycleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cycle = await CycleService.createCycle(req.user!, req.body);
      res.status(201).json(cycle);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /cycles
 * Returns cycles (partner unshared filtered in service)
 */
cyclesRouter.get(
  "/",
  validateQuery(getQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetUserId = req.query.targetUserId as string | undefined;
      const cycles = await CycleService.getCycles(req.user!, targetUserId);
      res.status(200).json(cycles);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /cycles/:id
 * Only owner updates
 */
cyclesRouter.put(
  "/:id",
  validateParams(idParamSchema),
  validateBody(updateCycleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cycle = await CycleService.updateCycle(req.user!, req.params.id, req.body);
      res.status(200).json(cycle);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /cycles/:id
 * Only owner deletes
 */
cyclesRouter.delete(
  "/:id",
  validateParams(idParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await CycleService.deleteCycle(req.user!, req.params.id);
      res.status(200).json({ message: "Cycle deleted successfully." });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /cycles/symptoms
 * Log symptoms (upsert for current user and date)
 */
cyclesRouter.post(
  "/symptoms",
  validateBody(logSymptomsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const log = await CycleService.logSymptoms(req.user!, req.body);
      res.status(200).json(log);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /cycles/symptoms
 * Get symptoms (partner unshared checked in service)
 */
cyclesRouter.get(
  "/symptoms",
  validateQuery(getQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetUserId = req.query.targetUserId as string | undefined;
      const date = req.query.date as string | undefined;
      const logs = await CycleService.getSymptomLogs(req.user!, targetUserId, date);
      res.status(200).json(logs);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /cycles/symptoms/:id
 * Only owner deletes
 */
cyclesRouter.delete(
  "/symptoms/:id",
  validateParams(idParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await CycleService.deleteSymptomLog(req.user!, req.params.id);
      res.status(200).json({ message: "Symptom log deleted successfully." });
    } catch (error) {
      next(error);
    }
  }
);
