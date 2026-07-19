import express, { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import Pet from "./models/Pet";
import User from "./models/User";
import ChatSession from "./models/ChatSession";
import { seedDatabase } from "./seed";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;
const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/pawmatchai";
const JWT_SECRET = process.env.JWT_SECRET || "your_fallback_secret_key";

// Helper: check if MongoDB is connected before using Mongoose
const isDbConnected = () => mongoose.connection.readyState === 1;

// Middlewares
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://pawmatchai.vercel.app",
  "https://www.pawmatchai.vercel.app",
  process.env.CLIENT_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    exposedHeaders: ["Content-Type", "Cache-Control", "Connection"],
  }),
);
app.use(express.json());

// Basic health check route
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "PawMatchAI Backend is running" });
});

// Middleware placeholder for JWT Authentication
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = (req as any).headers
    ? (req as any).headers["authorization"]
    : undefined;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token missing" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || "user",
    };
    next();
  });
};

// GET /api/pets - Listing route with Search, Filter & Sort
app.get("/api/pets", async (req: Request, res: Response) => {
  try {
    if (!isDbConnected()) {
      return res.json({
        success: true,
        totalCount: 0,
        page: 1,
        limit: 8,
        totalPages: 0,
        pets: [],
      });
    }

    const {
      search,
      species,
      ageRange,
      size,
      location,
      sort,
      page = "1",
      limit = "8",
    } = req.query;

    const query: any = {};

    // 1. Search filter (name, breed, location)
    if (search) {
      const searchRegex = new RegExp(search.toString(), "i");
      query.$or = [
        { name: searchRegex },
        { breed: searchRegex },
        { location: searchRegex },
      ];
    }

    // 2. Species filter
    if (species) {
      query.species = new RegExp(`^${species.toString()}$`, "i");
    }

    // 3. Size filter
    if (size) {
      query.size = size.toString();
    }

    // Fetch matching pets from database
    let petsList = await Pet.find(query);

    // 4. Age range filter (done in-memory for simpler string match regex handling)
    if (ageRange) {
      const range = ageRange.toString();
      petsList = petsList.filter((pet: any) => {
        const ageStr = pet.age.toLowerCase();
        const val = parseInt(ageStr);
        if (isNaN(val)) {
          if (
            ageStr.includes("month") ||
            ageStr.includes("kitten") ||
            ageStr.includes("puppy")
          ) {
            return range === "puppy";
          }
          return false;
        }
        if (range === "puppy") return ageStr.includes("month") || val < 1;
        if (range === "young")
          return val >= 1 && val <= 3 && !ageStr.includes("month");
        if (range === "adult")
          return val > 3 && val <= 7 && !ageStr.includes("month");
        if (range === "senior") return val > 7 && !ageStr.includes("month");
        return true;
      });
    }

    // 5. Location filter (Mock "nearby" check)
    if (location === "nearby") {
      petsList = petsList.filter(
        (pet: any) =>
          pet.location.includes("Austin") || pet.location.includes("Seattle"),
      );
    }

    // 6. Sorting
    if (sort) {
      const sortType = sort.toString();
      petsList.sort((a: any, b: any) => {
        if (sortType === "newest") {
          return b.id - a.id;
        }
        if (sortType === "youngest") {
          const getAgeMonths = (ageStr: string) => {
            const val = parseInt(ageStr);
            if (isNaN(val)) return 12;
            if (ageStr.toLowerCase().includes("month")) return val;
            return val * 12;
          };
          return getAgeMonths(a.age) - getAgeMonths(b.age);
        }
        if (sortType === "closest") {
          return a.location.localeCompare(b.location);
        }
        return 0;
      });
    }

    // 7. Pagination
    const pageNum = parseInt(page.toString()) || 1;
    const limitNum = parseInt(limit.toString()) || 8;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = pageNum * limitNum;

    const paginatedPets = petsList.slice(startIndex, endIndex);

    res.json({
      success: true,
      totalCount: petsList.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(petsList.length / limitNum),
      pets: paginatedPets,
    });
  } catch (error) {
    console.error("Error fetching pets:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET /api/pets/:id - Fetch single pet by ID (both unique sequential id or mongodb _id)
app.get("/api/pets/:id", async (req: Request, res: Response) => {
  try {
    const paramId = req.params.id;
    let pet;

    // Check if integer ID or MongoDB object ID
    if (/^\d+$/.test(paramId)) {
      pet = await Pet.findOne({ id: parseInt(paramId) });
    } else if (mongoose.Types.ObjectId.isValid(paramId)) {
      pet = await Pet.findById(paramId);
    }

    if (!pet) {
      return res.status(404).json({ success: false, message: "Pet not found" });
    }

    res.json({ success: true, pet });
  } catch (error) {
    console.error("Error fetching pet details:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ==========================================
// AI RECOMMENDATION ENGINE (Mock implementation)
// ==========================================

// POST /api/ai/recommend - Process quiz and return ranked matches
app.post("/api/ai/recommend", async (req: Request, res: Response) => {
  try {
    const { answers } = req.body;
    const allPets = await Pet.find();

    // Pre-filtering
    let filtered = [...allPets];
    if (answers.livingSpace === "Apartment") {
      filtered = filtered.filter((p) => p.size !== "large");
    }

    if (!genAI) {
      // Fallback to basic random if no API key
      return res.json({
        success: true,
        matches: filtered.slice(0, 6).map((p) => ({
          ...p.toObject(),
          id: p._id.toString(),
          aiScore: 85,
          aiReason: "Fallback: AI Key missing.",
        })),
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Prepare prompt
    const prompt = `
    You are an expert pet adoption counselor. A user just completed a questionnaire with these answers:
    ${JSON.stringify(answers)}

    Here is a list of available pets (ID, Name, Species, Breed, Age, Traits):
    ${filtered.map((p) => `ID: ${p._id}, Name: ${p.name}, Species: ${p.species}, Breed: ${p.breed}, Size: ${p.size}, Traits: ${p.temperament.join(", ")}`).join("\n")}

    Please rank the top 6 pets that best match the user's answers.
    For each pet, provide:
    1. id (the exact ID string)
    2. aiScore (a number between 70 and 99 indicating match quality)
    3. aiReason (a short, warm 1-2 sentence explanation of why this pet is a great match based on their specific answers)

    Return ONLY a valid JSON array of objects with the keys "id", "aiScore", and "aiReason".
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    // Parse JSON out of markdown block if present
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const parsedRankings = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    // Merge rankings with full pet data
    const rankedMatches = parsedRankings
      .map((ranking: any) => {
        const pet = filtered.find((p) => p._id.toString() === ranking.id);
        if (!pet) return null;
        return {
          ...pet.toObject(),
          id: pet._id.toString(),
          aiScore: ranking.aiScore,
          aiReason: ranking.aiReason,
        };
      })
      .filter(Boolean);

    res.json({
      success: true,
      matches: rankedMatches.length > 0 ? rankedMatches : filtered.slice(0, 6),
    });
  } catch (error) {
    console.error("Error generating AI recommendations:", error);
    res.status(500).json({ success: false, message: "AI Engine failed" });
  }
});

// POST /api/ai/feedback - Re-rank based on like/dislike
app.post("/api/ai/feedback", async (req: Request, res: Response) => {
  try {
    const { petId, feedback, currentResults } = req.body;

    // In a real app, we'd store the feedback in the DB and call the LLM to re-evaluate.
    // Here we'll just mock a quick re-sort of the remaining items.

    // Remove the disliked pet
    let updatedResults = currentResults.filter(
      (p: any) => p.id !== petId && p._id !== petId,
    );

    if (feedback === "like") {
      // If they liked it, maybe find similar pets and bump them up (mocked by shuffle)
      updatedResults = updatedResults.sort(() => 0.5 - Math.random());
    }

    res.json({ success: true, reRankedMatches: updatedResults });
  } catch (error) {
    console.error("Error processing AI feedback:", error);
    res
      .status(500)
      .json({ success: false, message: "Feedback processing failed" });
  }
});

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/google
app.post("/api/auth/google", async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res
        .status(400)
        .json({ success: false, message: "Google access token missing" });
    }

    // Fetch user profile from Google using the access token
    const googleResponse = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!googleResponse.ok) {
      return res.status(400).json({
        success: false,
        message: "Failed to fetch user profile from Google",
      });
    }

    const payload = await googleResponse.json();
    const { sub: googleId, email, name, picture: avatar } = payload;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email missing from Google payload" });
    }

    // Find or create user
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email,
        name: name || "User",
        googleId,
        avatar,
        role: "user",
      });
      await user.save();
    } else if (!user.googleId) {
      // Link Google ID if user exists but hasn't linked Google yet
      user.googleId = googleId;
      user.avatar = user.avatar || avatar;
      await user.save();
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    console.error("Error verifying Google auth:", error);
    res.status(500).json({ success: false, message: "Google Auth failed" });
  }
});

// ==========================================
// AI CHAT ASSISTANT (Mock SSE Implementation)
// ==========================================

// GET /api/ai/chat/:sessionId - Fetch chat history
app.get("/api/ai/chat/:sessionId", async (req: Request, res: Response) => {
  try {
    if (!isDbConnected()) {
      return res.json({ success: true, messages: [] }); // Gracefully return empty if no DB
    }
    const { sessionId } = req.params;
    const session = await ChatSession.findOne({ sessionId });
    if (!session) {
      return res.json({ success: true, messages: [] });
    }
    res.json({ success: true, messages: session.messages });
  } catch (error) {
    console.error("Error fetching chat session:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch chat history" });
  }
});

// POST /api/ai/chat - Stream AI Response (SSE)
app.post("/api/ai/chat", async (req: Request, res: Response) => {
  const { sessionId, message, contextPetId } = req.body;

  if (!sessionId || !message) {
    return res
      .status(400)
      .json({ success: false, message: "sessionId and message are required" });
  }

  try {
    // 1. Fetch or create the chat session (only if DB is available)
    let session: any = null;
    if (isDbConnected()) {
      try {
        session = await ChatSession.findOne({ sessionId });
        if (!session) session = new ChatSession({ sessionId, messages: [] });
        session.messages.push({
          role: "user",
          content: message,
          timestamp: new Date(),
        });
        await session.save();
      } catch (dbErr) {
        console.warn(
          "DB write skipped (no connection):",
          (dbErr as Error).message,
        );
        session = null;
      }
    }

    // 2. Setup Server-Sent Events (SSE) headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
    res.flushHeaders(); // Flush headers immediately so the client can begin reading

    // Send initial connection establish event
    res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

    // 3. Generate response using Gemini
    let streamedContent = "";
    if (!genAI) {
      // Fallback
      const chunk =
        "Fallback: Gemini API Key is missing. Please configure GEMINI_API_KEY.";
      streamedContent = chunk;
      res.write(
        `data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`,
      );
    } else {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      let systemInstruction =
        "You are Paws, a friendly AI adoption assistant for PawMatch AI. Keep answers short, warm, and helpful.";
      if (contextPetId) {
        try {
          const contextPet = await Pet.findById(contextPetId);
          if (contextPet) {
            systemInstruction += `\nContext: The user is asking about a pet named ${contextPet.name}, a ${contextPet.breed} ${contextPet.species}. Traits: ${contextPet.temperament.join(", ")}. Fee: $${contextPet.fee}.`;
          }
        } catch (e) {
          // ignore
        }
      }

      // Convert history to Gemini format
      const history =
        session?.messages.slice(0, -1).map((m: any) => ({
          role: m.role === "ai" ? "model" : "user",
          parts: [{ text: m.content }],
        })) || [];

      const chat = model.startChat({
        history: [
          { role: "user", parts: [{ text: systemInstruction }] },
          {
            role: "model",
            parts: [{ text: "Understood. I am Paws, ready to help." }],
          },
          ...history,
        ],
      });

      const resultStream = await chat.sendMessageStream(message);
      for await (const chunk of resultStream.stream) {
        const text = chunk.text();
        streamedContent += text;
        res.write(
          `data: ${JSON.stringify({ type: "chunk", content: text })}\n\n`,
        );
      }
    }

    // 5. Send suggestions at the end
    const suggestions = [
      "What is the adoption process?",
      "How much does it cost?",
      "Can I volunteer?",
    ];
    res.write(
      `data: ${JSON.stringify({ type: "suggestions", suggestions })}\n\n`,
    );

    // 6. Signal completion
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();

    // 7. Save AI response to DB (only if session exists)
    if (isDbConnected() && session) {
      try {
        session.messages.push({
          role: "assistant",
          content: streamedContent,
          timestamp: new Date(),
        });
        await session.save();
      } catch (dbErr) {
        console.warn(
          "DB save skipped (no connection):",
          (dbErr as Error).message,
        );
      }
    }
  } catch (error) {
    console.error("SSE Chat Error:", error);
    // If headers haven't been sent, we can return 500, else we just end the stream with an error event
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Chat Engine failed" });
    } else {
      res.write(
        `data: ${JSON.stringify({ type: "error", message: "Internal Server Error" })}\n\n`,
      );
      res.end();
    }
  }
});

// Connect to MongoDB & Start Server
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("Successfully connected to MongoDB database.");

    // Seed database if empty
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`Server is running in development mode on port ${PORT}`);
    });
  })
  .catch((error: any) => {
    console.error("Error connecting to MongoDB:", error);
    // In local development without mongo running, we still boot Express server with warning
    console.warn(
      "Booting server without database connection for local exploration...",
    );
    app.listen(PORT, () => {
      console.log(`Server is running in fallback mode on port ${PORT}`);
    });
  });
