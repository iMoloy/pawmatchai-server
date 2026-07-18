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
      petsList = petsList.filter(pet => {
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
      petsList = petsList.filter(pet => pet.location.includes('Austin') || pet.location.includes('Seattle'));
    }

    // 6. Sorting
    if (sort) {
      const sortType = sort.toString();
      petsList.sort((a, b) => {
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
