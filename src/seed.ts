import Pet from './models/Pet';
import User from './models/User';
import bcrypt from 'bcryptjs';

const placeholderPetsToSeed = [
  {
    id: 1,
    name: "Buddy",
    breed: "Golden Retriever",
    species: "Dog",
    age: "2 years",
    location: "Austin, TX",
    fee: 250,
    image: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&h=600&fit=crop",
    size: "large",
    sex: "Male",
    description: "Buddy is a cheerful, outgoing Golden Retriever who loves long walks, playing fetch, and cuddling on the couch. He is great with kids and other dogs.",
    vaccinated: true,
    neutered: true,
    goodWithKids: true,
    goodWithPets: true,
    temperament: ["Friendly", "Energetic", "Gentle", "Playful"],
    weight: "70 lbs",
    images: [
      "https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=800&h=600&fit=crop"
    ]
  },
  {
    id: 2,
    name: "Luna",
    breed: "Siamese",
    species: "Cat",
    age: "1 year",
    location: "Seattle, WA",
    fee: 150,
    image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&h=600&fit=crop",
    size: "small",
    sex: "Female",
    description: "Luna is an elegant and talkative Siamese cat. She is incredibly affectionate, loves climbing high bookshelves, and will follow you around the house demanding chin scratches.",
    vaccinated: true,
    neutered: true,
    goodWithKids: true,
    goodWithPets: false,
    temperament: ["Affectionate", "Curious", "Vocal", "Intelligent"],
    weight: "8 lbs",
    images: [
      "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=800&h=600&fit=crop"
    ]
  },
  {
    id: 3,
    name: "Max",
    breed: "Labrador Mix",
    species: "Dog",
    age: "3 years",
    location: "Denver, CO",
    fee: 200,
    image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=600&fit=crop",
    size: "large",
    sex: "Male",
    description: "Max is a smart, loyal Labrador Mix. He has completed basic training, is house-broken, and is eager to find an active family who can take him hiking and camping.",
    vaccinated: true,
    neutered: true,
    goodWithKids: true,
    goodWithPets: true,
    temperament: ["Loyal", "Smart", "Active", "Protective"],
    weight: "65 lbs",
    images: [
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=600&fit=crop"
    ]
  },
  {
    id: 4,
    name: "Milo",
    breed: "Maine Coon",
    species: "Cat",
    age: "6 months",
    location: "Portland, OR",
    fee: 180,
    image: "https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=800&h=600&fit=crop",
    size: "medium",
    sex: "Male",
    description: "Milo is a fluffy, gentle giant in the making. He's very laid back, gets along beautifully with dogs, and has a sweet chirp instead of a meow.",
    vaccinated: false,
    neutered: false,
    goodWithKids: true,
    goodWithPets: true,
    temperament: ["Gentle", "Quiet", "Friendly", "Independent"],
    weight: "12 lbs",
    images: [
      "https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=800&h=600&fit=crop"
    ]
  },
  {
    id: 5,
    name: "Bella",
    breed: "French Bulldog",
    species: "Dog",
    age: "4 years",
    location: "Miami, FL",
    fee: 300,
    image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&h=600&fit=crop",
    size: "medium",
    sex: "Female",
    description: "Bella is a compact, loveable clown of a dog. She prefers short walks and long naps. Perfect for apartment living and loves nothing more than being pampered.",
    vaccinated: true,
    neutered: true,
    goodWithKids: false,
    goodWithPets: true,
    temperament: ["Playful", "Affectionate", "Easygoing", "Quiet"],
    weight: "22 lbs",
    images: [
      "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&h=600&fit=crop"
    ]
  },
  {
    id: 6,
    name: "Oliver",
    breed: "Bengal",
    species: "Cat",
    age: "2 years",
    location: "San Diego, CA",
    fee: 220,
    image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&h=600&fit=crop",
    size: "medium",
    sex: "Male",
    description: "Oliver has the stunning wild look of a Bengal paired with a highly intelligent, inquisitive nature. He needs lots of interactive playtime and mental stimulation.",
    vaccinated: true,
    neutered: true,
    goodWithKids: false,
    goodWithPets: false,
    temperament: ["Active", "Intelligent", "Playful", "Bold"],
    weight: "11 lbs",
    images: [
      "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&h=600&fit=crop"
    ]
  },
  {
    id: 7,
    name: "Charlie",
    breed: "Border Collie",
    species: "Dog",
    age: "1 year",
    location: "Nashville, TN",
    fee: 260,
    image: "https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=800&h=600&fit=crop",
    size: "large",
    sex: "Male",
    description: "Charlie is a high-energy, work-oriented Border Collie. He excels at agility training, frisbee, and would love a home with a big yard or a farm where he can be busy.",
    vaccinated: true,
    neutered: true,
    goodWithKids: true,
    goodWithPets: true,
    temperament: ["Energetic", "Hyper-intelligent", "Loyal", "Eager to Please"],
    weight: "45 lbs",
    images: [
      "https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=800&h=600&fit=crop"
    ]
  },
  {
    id: 8,
    name: "Simba",
    breed: "Persian",
    species: "Cat",
    age: "3 years",
    location: "Chicago, IL",
    fee: 190,
    image: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=600&fit=crop",
    size: "small",
    sex: "Male",
    description: "Simba is a sweet-tempered Persian cat with a lush, luxurious coat. He enjoys peaceful environments, soft music, and being brushed daily to keep him looking his best.",
    vaccinated: true,
    neutered: true,
    goodWithKids: true,
    goodWithPets: true,
    temperament: ["Calm", "Sweet", "Gentle", "Reserved"],
    weight: "9 lbs",
    images: [
      "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=600&fit=crop"
    ]
  }
];

export const seedDatabase = async () => {
  try {
    const count = await Pet.countDocuments();
    if (count === 0) {
      console.log('No pets found in database. Seeding initial pet records...');
      await Pet.insertMany(placeholderPetsToSeed);
      console.log('Database successfully seeded with 8 pets!');
    } else {
      console.log(`Database already has ${count} records. Skipping seeding.`);
    }

    const demoUser = await User.findOne({ email: 'demo@pawmatch.ai' });
    if (!demoUser) {
      console.log('Seeding demo user...');
      const hashedPassword = await bcrypt.hash('pawmatch2026', 10);
      await User.create({
        name: 'Demo User',
        email: 'demo@pawmatch.ai',
        password: hashedPassword,
        role: 'user'
      });
      console.log('Demo user seeded successfully!');
    }
  } catch (error) {
    console.error('Failed to seed database:', error);
  }

  // Seed a demo account so the "Try Demo Account" button on the login page works
  try {
    const demoEmail = 'demo@pawmatch.ai';
    const existingDemoUser = await User.findOne({ email: demoEmail });
    if (!existingDemoUser) {
      const hashedPassword = await bcrypt.hash('pawmatch2026', 10);
      await User.create({
        name: 'Demo User',
        email: demoEmail,
        password: hashedPassword,
        role: 'user',
      });
      console.log('Demo account seeded (demo@pawmatch.ai).');
    }
  } catch (error) {
    console.error('Failed to seed demo user:', error);
  }
};
