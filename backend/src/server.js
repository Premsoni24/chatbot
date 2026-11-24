import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { generate } from "./chatbot.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());


app.get("/", (_request, response) => {
  response.json({ message: "Hello from the backend!" });
});
app.post("/chat", async (req, res) => {
  const { message, threadId } = req.body ?? {};
  if (!threadId) {
    return res.status(400).json({ error: "threadId is required" });
  }
  if (typeof threadId !== "string" || !threadId.trim()) {
    return res.status(400).json({ error: "threadId must be a non-empty string" });
  }
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message must be a non-empty string" });
  }

  console.log("Received message:", message);
  const result = await generate({ userMessage: message.trim(), threadId: threadId.trim() });
  res.json({ message: result });
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
