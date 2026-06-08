import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import resellersRouter from "./resellers";
import clientsRouter from "./clients";
import messagesRouter from "./messages";
import creditsRouter from "./credits";
import statsRouter from "./stats";
import gatewayRouter from "./gateway";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);

router.use(requireAuth);

router.use(resellersRouter);
router.use(clientsRouter);
router.use(messagesRouter);
router.use(creditsRouter);
router.use(statsRouter);
router.use(gatewayRouter);

export default router;
