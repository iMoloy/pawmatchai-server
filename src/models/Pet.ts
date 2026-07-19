import mongoose, { Schema, Document } from 'mongoose';

export interface IPet extends Document {
  id: number;
  name: string;
  breed: string;
  species: string;
  age: string;
  location: string;
  fee: number;
  image: string;
  size: 'small' | 'medium' | 'large' | 'extra large';
  sex: 'Male' | 'Female' | 'Unknown';
  description: string;
  vaccinated: boolean;
  neutered: boolean;
  goodWithKids: boolean;
  goodWithPets: boolean;
  temperament: string[];
  weight: string;
  images: string[];
  ownerId?: string;
}

const PetSchema: Schema = new Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  breed: { type: String, required: true },
  species: { type: String, required: true },
  age: { type: String, required: true },
  location: { type: String, required: true },
  fee: { type: Number, required: true },
  image: { type: String, required: true },
  size: { type: String, enum: ['small', 'medium', 'large', 'extra large'], required: true },
  sex: { type: String, enum: ['Male', 'Female', 'Unknown'], default: 'Unknown' },
  description: { type: String, required: true },
  vaccinated: { type: Boolean, default: false },
  neutered: { type: Boolean, default: false },
  goodWithKids: { type: Boolean, default: false },
  goodWithPets: { type: Boolean, default: false },
  temperament: { type: [String], default: [] },
  weight: { type: String, required: true },
  images: { type: [String], default: [] },
  ownerId: { type: String, required: false }
}, {
  timestamps: true
});

export default mongoose.models.Pet || mongoose.model<IPet>('Pet', PetSchema);
