import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

// Trust proxy for Render and other reverse proxy environments
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "upgrade-insecure-requests": null,
      },
    },
  })
);
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true
  })
);
app.use(express.json());
app.use(morgan("dev"));

app.use("/api", apiRouter);

app.use((error, _req, res, _next) => {
  console.error(error);
  const status = error.status || 500;
  res.status(status).json({ message: error.message || "Internal server error" });
});
