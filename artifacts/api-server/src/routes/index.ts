import { Router, type IRouter } from "express";
import healthRouter from "./health";
import resellersRouter from "./resellers";
import clientsRouter from "./clients";
import messagesRouter from "./messages";
import creditsRouter from "./credits";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(resellersRouter);
router.use(clientsRouter);
router.use(messagesRouter);
router.use(creditsRouter);
router.use(statsRouter);

export default router;
