import { Router } from "express";
import { healthRouter } from "./health.js";
import { authRouter } from "./auth.js";
import { mediaRouter } from "./media.js";
import { cyclesRouter } from "./cycles.js";
import { thoughtsRouter } from "./thoughts.js";
import { progressRouter } from "./progress.js";
import { messagesRouter } from "./messages.js";

import { moodsRouter } from "./moods.js";
import { notesRouter } from "./notes.js";
import { coupleRouter } from "./couple.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/media", mediaRouter);
apiRouter.use("/cycles", cyclesRouter);
apiRouter.use("/thoughts", thoughtsRouter);
apiRouter.use("/progress", progressRouter);
apiRouter.use("/messages", messagesRouter);
apiRouter.use("/moods", moodsRouter);
apiRouter.use("/notes", notesRouter);
apiRouter.use("/couple", coupleRouter);
