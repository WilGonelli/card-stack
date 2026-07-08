import { Router } from "express";
import { CreateRoom } from "../controllers/GameController.js";

const router = Router();

router.post("/app/create-room", CreateRoom);

export default router;
