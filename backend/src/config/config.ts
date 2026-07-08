import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

export const app = express();
app.use(express.json());

export const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});
