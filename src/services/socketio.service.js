import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { redis } from "../db/redis.js";

let io = null;

export function initializeSocketIO(server, opts = {}) {
  io = new Server(server, {
    path: "/socket.io",
    cors: { origin: "*" },
    ...opts,
  });

  // If redis is available, plug in adapter for scaling
  try {
    const pubClient = redis.duplicate();
    const subClient = redis.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    console.log("[SocketIO] Redis adapter initialized");
  } catch (err) {
    console.warn("[SocketIO] Redis adapter unavailable, running single-node", err?.message);
  }

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    // Simple auth placeholder - validate JWT in production
    if (socket.handshake.query && socket.handshake.query.apiKey === process.env.PUBLIC_API_KEY) {
      return next();
    }
    // Allow anonymous read-only connections if no token
    return next();
  });

  io.on("connection", (socket) => {
    console.log(`[SocketIO] client connected: ${socket.id}`);

    socket.on("SUBSCRIBE_SYMBOL", (payload) => {
      try {
        const { symbol } = payload || {};
        if (!symbol) return;
        const room = `sym:${symbol}`;
        socket.join(room);
        socket.emit("SUBSCRIBED", { symbol });
        console.log(`[SocketIO] ${socket.id} joined ${room}`);
      } catch (err) {
        console.error("[SocketIO] subscribe error", err.message);
      }
    });

    socket.on("UNSUBSCRIBE_SYMBOL", (payload) => {
      try {
        const { symbol } = payload || {};
        if (!symbol) return;
        const room = `sym:${symbol}`;
        socket.leave(room);
        socket.emit("UNSUBSCRIBED", { symbol });
      } catch (err) {
        console.error("[SocketIO] unsubscribe error", err.message);
      }
    });

    socket.on("heartbeat", () => {
      socket.emit("heartbeat_ack", { ts: Date.now() });
    });

    socket.on("disconnect", (reason) => {
      console.log(`[SocketIO] client disconnected: ${socket.id} (${reason})`);
    });
  });

  console.log("[SocketIO] initialized");
}

export function broadcastToSymbol(symbol, event, payload) {
  if (!io) return;
  const room = `sym:${symbol}`;
  io.to(room).emit(event, payload);
}

export function getSocketStats() {
  if (!io) return { clients: 0 };
  return { clients: io.of('/').sockets.size };
}

export default io;
