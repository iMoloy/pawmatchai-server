import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import Pet from './models/Pet';
import { seedDatabase } from './seed';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pawmatchai';
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key';

// Middlewares
app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'PawMatchAI Backend is running' });
});

// Middleware placeholder for JWT Authentication
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = (req as any).headers ? (req as any).headers['authorization'] : undefined;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'user',
    };
    next();
  });
};

// GET /api/pets - Listing route with Search, Filter & Sort
app.get('/api/pets', async (req: Request, res: Response) => {
  try {
    const { search, species, ageRange, size, location, sort, page = '1', limit = '8' } = req.query;

    const query: any = {};

    // 1. Search filter (name, breed, location)
    if (search) {
      const searchRegex = new RegExp(search.toString(), 'i');
      query.$or = [
        { name: searchRegex },
        { breed: searchRegex },
        { location: searchRegex }
      ];
    }

    // 2. Species filter
    if (species) {
      query.species = new RegExp(`^${species.toString()}$`, 'i');
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
          if (ageStr.includes("month") || ageStr.includes("kitten") || ageStr.includes("puppy")) {
            return range === "puppy";
          }
          return false;
        }
        if (range === 'puppy') return ageStr.includes("month") || val < 1;
        if (range === 'young') return val >= 1 && val <= 3 && !ageStr.includes("month");
        if (range === 'adult') return val > 3 && val <= 7 && !ageStr.includes("month");
        if (range === 'senior') return val > 7 && !ageStr.includes("month");
        return true;
      });
    }

    // 5. Location filter (Mock "nearby" check)
    if (location === 'nearby') {
      petsList = petsList.filter((pet: any) => pet.location.includes('Austin') || pet.location.includes('Seattle'));
    }

    // 6. Sorting
    if (sort) {
      const sortType = sort.toString();
      petsList.sort((a: any, b: any) => {
        if (sortType === 'newest') {
          return b.id - a.id;
        }
        if (sortType === 'youngest') {
          const getAgeMonths = (ageStr: string) => {
            const val = parseInt(ageStr);
            if (isNaN(val)) return 12;
            if (ageStr.toLowerCase().includes('month')) return val;
            return val * 12;
          };
          return getAgeMonths(a.age) - getAgeMonths(b.age);
        }
        if (sortType === 'closest') {
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
      pets: paginatedPets
    });
  } catch (error) {
    console.error('Error fetching pets:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/pets/:id - Fetch single pet by ID (both unique sequential id or mongodb _id)
app.get('/api/pets/:id', async (req: Request, res: Response) => {
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
      return res.status(404).json({ success: false, message: 'Pet not found' });
    }

    res.json({ success: true, pet });
  } catch (error) {
    console.error('Error fetching pet details:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==========================================
// AI RECOMMENDATION ENGINE (Mock implementation)
// ==========================================

// POST /api/ai/recommend - Process quiz and return ranked matches
app.post('/api/ai/recommend', async (req: Request, res: Response) => {
  try {
    const { answers } = req.body;
    
    // 1. Fetch all pets (in a real app, we'd pre-filter here)
    const allPets = await Pet.find();
    
    // 2. Rule-based pre-filtering based on answers
    let filtered = [...allPets];
    if (answers.livingSpace === 'Apartment') {
      // Don't recommend extra large dogs for apartments
      filtered = filtered.filter(p => p.size !== 'Extra Large');
    }
    
    // 3. Mock LLM delay to simulate API call (1.5 seconds)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 4. Mock AI Scoring & Blurb Generation
    // We'll just shuffle them pseudo-randomly and append an AI reason
    const rankedMatches = filtered
      .sort(() => 0.5 - Math.random()) // Random shuffle for demo
      .slice(0, 6) // Return top 6
      .map((pet, index) => {
        const petObj = pet.toObject();
        // Generate contextual blurb
        let reason = "This pet looks like a great match for your household!";
        if (answers.activityLevel === 'High' && pet.species === 'Dog') {
          reason = `Perfect for your active lifestyle! ${pet.name} will love going on runs with you.`;
        } else if (answers.livingSpace === 'Apartment' && pet.size === 'Small') {
          reason = `As a small ${pet.species.toLowerCase()}, ${pet.name} is the ideal size for apartment living.`;
        } else if (answers.familyPets === 'Kids') {
          reason = `${pet.name} has a gentle temperament that is wonderful around children.`;
        }
        
        return {
          ...petObj,
          id: petObj.id || petObj._id.toString(), // Ensure ID is mapped correctly for frontend
          aiScore: 99 - (index * 5), // Fake score decreasing
          aiReason: reason
        };
      });

    res.json({ success: true, matches: rankedMatches });
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    res.status(500).json({ success: false, message: 'AI Engine failed' });
  }
});

// POST /api/ai/feedback - Re-rank based on like/dislike
app.post('/api/ai/feedback', async (req: Request, res: Response) => {
  try {
    const { petId, feedback, currentResults } = req.body;
    
    // In a real app, we'd store the feedback in the DB and call the LLM to re-evaluate.
    // Here we'll just mock a quick re-sort of the remaining items.
    
    // Remove the disliked pet
    let updatedResults = currentResults.filter((p: any) => p.id !== petId && p._id !== petId);
    
    if (feedback === 'like') {
      // If they liked it, maybe find similar pets and bump them up (mocked by shuffle)
      updatedResults = updatedResults.sort(() => 0.5 - Math.random());
    }

    res.json({ success: true, reRankedMatches: updatedResults });
  } catch (error) {
    console.error('Error processing AI feedback:', error);
    res.status(500).json({ success: false, message: 'Feedback processing failed' });
  }
});

// Placeholder for Google OAuth setup info
app.get('/api/auth/google/callback-placeholder', (req: Request, res: Response) => {
  res.json({
    message: 'Google OAuth login flow placeholder. Set up Passport.js or Better Auth config here.',
    clientId: process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Missing GOOGLE_CLIENT_ID env'
  });
});

// Connect to MongoDB & Start Server
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log('Successfully connected to MongoDB database.');
    
    // Seed database if empty
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`Server is running in development mode on port ${PORT}`);
    });
  })
  .catch((error: any) => {
    console.error('Error connecting to MongoDB:', error);
    // In local development without mongo running, we still boot Express server with warning
    console.warn('Booting server without database connection for local exploration...');
    app.listen(PORT, () => {
      console.log(`Server is running in fallback mode on port ${PORT}`);
    });
  });
