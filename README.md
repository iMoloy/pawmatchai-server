<div align="center">
  <h1>🐾 PawMatchAI — Backend Server</h1>
  <p>RESTful API + AI Engine for the PawMatchAI adoption platform</p>
  <p>
    <img src="https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs" />
    <img src="https://img.shields.io/badge/Express-4-000000?logo=express" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" />
    <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb" />
  </p>
</div>

---

## 📖 Overview

This is the **Express + TypeScript backend** for PawMatchAI. It provides:
- A full REST API for pet listings
- An AI Recommendation Engine with rule-based filtering
- A real-time SSE-based AI Chat endpoint ("Paws")
- MongoDB persistence via Mongoose

The frontend client lives in a separate repository: [`pawmatchai`](https://github.com/iMoloy/pawmatchai).

---

## 🛠 Tech Stack

- **Runtime**: Node.js 20
- **Framework**: Express 4
- **Language**: TypeScript 5 (via `ts-node-dev`)
- **Database**: MongoDB + Mongoose 8
- **Auth**: JWT (`jsonwebtoken`), `bcryptjs`
- **AI Streaming**: Server-Sent Events (SSE) — LLM-ready, mocked by default

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB running locally OR a MongoDB Atlas connection string

### 1. Clone & Install

```bash
git clone https://github.com/iMoloy/pawmatchai-server.git
cd pawmatch-server
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your real values:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/pawmatchai
JWT_SECRET=your_very_long_random_secret_here
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

> **Tip:** Generate a strong JWT secret with:
> ```bash
> openssl rand -base64 64
> ```

### 3. Start MongoDB (Local)

```bash
# Using systemd:
sudo systemctl start mongod

# Using Docker:
docker run -d -p 27017:27017 --name mongo mongo:latest
```

### 4. Run the Dev Server

```bash
npm run dev
```

The server will start on [http://localhost:5000](http://localhost:5000).

On first boot, the database will be **automatically seeded** with sample pet data if the `pets` collection is empty.

---

## 📁 Project Structure

```
src/
├── index.ts            # Main Express app entry point (all routes)
├── models/
│   ├── Pet.ts          # Mongoose Pet model + IPet interface
│   └── ChatSession.ts  # Mongoose ChatSession model for AI chat history
└── seed.ts             # Database seeder (sample pets)
```

---

## 📡 API Reference

### 🏥 Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Verify server is running |

### 🐶 Pets

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/pets` | List all pets (search, filter, sort, pagination) |
| `GET` | `/api/pets/:id` | Get a single pet by numeric ID or MongoDB ObjectId |
| `POST` | `/api/pets` | Create a new pet listing |
| `DELETE` | `/api/pets/:id` | Delete a pet listing |

#### `GET /api/pets` — Query Parameters

| Param | Type | Example | Description |
|-------|------|---------|-------------|
| `search` | string | `Luna` | Searches name, breed, and location |
| `species` | string | `Dog` | Filter by species |
| `size` | string | `small` | Filter by size (`small`, `medium`, `large`) |
| `ageRange` | string | `young` | Filter by age group (`puppy`, `young`, `adult`, `senior`) |
| `sort` | string | `youngest` | Sort order (`newest`, `youngest`, `closest`) |
| `page` | number | `1` | Pagination page (default: 1) |
| `limit` | number | `8` | Results per page (default: 8) |

---

### 🤖 AI Recommendation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai/recommend` | Submit quiz answers, get ranked pet matches with AI blurbs |
| `POST` | `/api/ai/feedback` | Like/Dislike a match to re-rank results |

#### `POST /api/ai/recommend` — Body

```json
{
  "answers": {
    "livingSpace": "Apartment",
    "activityLevel": "Medium",
    "familyPets": "Kids",
    "experience": "Some"
  }
}
```

#### Response

```json
{
  "success": true,
  "matches": [
    {
      "_id": "...",
      "name": "Luna",
      "breed": "Golden Retriever",
      "aiScore": 99,
      "aiReason": "Luna has a gentle temperament that is wonderful around children."
    }
  ]
}
```

---

### 💬 AI Chat (Paws)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ai/chat/:sessionId` | Fetch chat history for a session |
| `POST` | `/api/ai/chat` | Send a message — streams response via **SSE** |

#### `POST /api/ai/chat` — Body

```json
{
  "sessionId": "session_1234567890_abc",
  "message": "What is the adoption process?",
  "contextPetId": null
}
```

#### SSE Stream Event Types

| Event `type` | Payload | Description |
|-------------|---------|-------------|
| `connected` | — | Stream connection established |
| `chunk` | `{ content: " word" }` | Next word/token of the response |
| `suggestions` | `{ suggestions: [...] }` | Follow-up prompt chips |
| `done` | — | Stream complete |
| `error` | `{ message: "..." }` | Stream error |

---

## 🧱 Data Models

### Pet

```typescript
{
  id: number;           // Sequential ID
  name: string;
  breed: string;
  species: string;      // "Dog" | "Cat" | "Bird" | "Other"
  age: string;          // e.g. "2 years", "3 months"
  size: "small" | "medium" | "large";
  sex: "Male" | "Female";
  location: string;
  fee: number;
  image: string;
  images: string[];
  description: string;
  vaccinated: boolean;
  neutered: boolean;
  goodWithKids: boolean;
  goodWithPets: boolean;
  temperament: string[];
  weight: string;
}
```

### ChatSession

```typescript
{
  sessionId: string;    // Unique browser session ID
  userId?: string;      // Optional when user is authenticated
  messages: [
    {
      role: "user" | "assistant";
      content: string;
      timestamp: Date;
    }
  ];
}
```

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload (`ts-node-dev`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled production server |

---

## 🌐 Environment Variables

See [`.env.example`](.env.example) for all available options.

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Server port (default: 5000) |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret key for signing JWTs |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret |
| `GEMINI_API_KEY` | Optional | Google Gemini API key (for real AI) |
| `OPENAI_API_KEY` | Optional | OpenAI API key (for real AI) |

---

## 🗺 Roadmap

- [ ] Real LLM integration (Gemini / OpenAI) for `/api/ai/chat` and `/api/ai/recommend`
- [ ] Real `POST /api/auth/login` and `POST /api/auth/register` endpoints
- [ ] `GET /api/pets/mine` — user-specific pet listings
- [ ] `PATCH /api/pets/:id` — update a pet listing
- [ ] Google OAuth via Passport.js
- [ ] Adoption request storage (`POST /api/adopt`)
