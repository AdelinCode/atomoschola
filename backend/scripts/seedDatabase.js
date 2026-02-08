import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Subject from '../models/Subject.js';
import Domain from '../models/Domain.js';
import Category from '../models/Category.js';
import Lesson from '../models/Lesson.js';
import InviteCode from '../models/InviteCode.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany();
    await Subject.deleteMany();
    await Domain.deleteMany();
    await Category.deleteMany();
    await Lesson.deleteMany();
    await InviteCode.deleteMany();

    // Create owner user
    console.log('Creating owner user...');
    const owner = await User.create({
      username: 'owner',
      email: 'owner@eduplatform.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'Owner',
      userType: 'owner'
    });

    // Create sample users
    console.log('Creating sample users...');
    const creator1 = await User.create({
      username: 'dr_smith',
      email: 'smith@eduplatform.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Smith',
      userType: 'creator'
    });

    const editor1 = await User.create({
      username: 'editor_jane',
      email: 'jane@eduplatform.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Doe',
      userType: 'editor'
    });

    // Create subjects
    console.log('Creating subjects...');
    const physics = await Subject.create({
      name: 'Physics',
      slug: 'physics',
      icon: 'fas fa-atom',
      description: 'Study of matter, energy, and their interactions',
      isPremium: false,
      managedBy: [owner._id]
    });

    const chemistry = await Subject.create({
      name: 'Chemistry',
      slug: 'chemistry',
      icon: 'fas fa-flask',
      description: 'Study of substances and their properties',
      isPremium: false,
      managedBy: [owner._id]
    });

    const mathematics = await Subject.create({
      name: 'Mathematics',
      slug: 'mathematics',
      icon: 'fas fa-calculator',
      description: 'Study of numbers, quantities, and shapes',
      isPremium: false,
      managedBy: [owner._id]
    });

    const biology = await Subject.create({
      name: 'Biology',
      slug: 'biology',
      icon: 'fas fa-dna',
      description: 'Study of living organisms',
      isPremium: false,
      managedBy: [owner._id]
    });

    // Create domains for Physics
    console.log('Creating domains...');
    const mechanics = await Domain.create({
      name: 'Mechanics',
      slug: 'mechanics',
      description: 'Study of motion, forces, and energy',
      subject: physics._id
    });

    const electromagnetism = await Domain.create({
      name: 'Electromagnetism',
      slug: 'electromagnetism',
      description: 'Electric and magnetic phenomena',
      subject: physics._id
    });

    physics.domains.push(mechanics._id, electromagnetism._id);
    await physics.save();

    // Create categories for Mechanics
    console.log('Creating categories...');
    const statics = await Category.create({
      name: 'Static Mechanics',
      slug: 'statics',
      description: 'Objects at rest and forces in equilibrium',
      domain: mechanics._id
    });

    const dynamics = await Category.create({
      name: 'Dynamic Mechanics',
      slug: 'dynamics',
      description: 'Objects in motion and the forces that cause motion',
      domain: mechanics._id
    });

    mechanics.categories.push(statics._id, dynamics._id);
    await mechanics.save();

    // Create lessons
    console.log('Creating lessons...');
    const lesson1 = await Lesson.create({
      title: 'Introduction to Forces',
      slug: 'introduction-to-forces',
      description: 'Understanding the basic concepts of forces and their effects on objects.',
      content: '<h2>What are Forces?</h2><p>A force is a push or pull upon an object resulting from the object\'s interaction with another object.</p><h3>Types of Forces</h3><ul><li>Contact Forces</li><li>Non-contact Forces</li></ul>',
      type: 'text',
      category: statics._id,
      creators: [creator1._id],
      status: 'published',
      isPremium: false
    });

    lesson1.ratings.push({ user: owner._id, rating: 5 });
    lesson1.calculateAverageRating();
    await lesson1.save();

    statics.lessons.push(lesson1._id);
    await statics.save();

    creator1.createdLessons.push(lesson1._id);
    await creator1.save();

    const lesson2 = await Lesson.create({
      title: 'Newton\'s Laws of Motion',
      slug: 'newtons-laws-of-motion',
      description: 'Comprehensive overview of Newton\'s three laws and their applications.',
      content: '<h2>Newton\'s Three Laws</h2><h3>First Law: Law of Inertia</h3><p>An object at rest stays at rest and an object in motion stays in motion with the same speed and in the same direction unless acted upon by an unbalanced force.</p>',
      type: 'video',
      category: dynamics._id,
      creators: [creator1._id],
      editors: [editor1._id],
      status: 'published',
      isPremium: true
    });

    lesson2.ratings.push({ user: owner._id, rating: 4 });
    lesson2.calculateAverageRating();
    await lesson2.save();

    dynamics.lessons.push(lesson2._id);
    await dynamics.save();

    creator1.createdLessons.push(lesson2._id);
    editor1.editedLessons.push(lesson2._id);
    await creator1.save();
    await editor1.save();

    // Create invite codes
    console.log('Creating invite codes...');
    await InviteCode.create({
      code: 'CREATOR123456789',
      userType: 'creator',
      createdBy: owner._id,
      isUsed: false
    });

    await InviteCode.create({
      code: 'EDITOR9876543210A',
      userType: 'editor',
      createdBy: owner._id,
      isUsed: false
    });

    console.log('✅ Database seeded successfully!');
    console.log('\n📝 Login credentials:');
    console.log('Owner: owner@eduplatform.com / password123');
    console.log('Creator: smith@eduplatform.com / password123');
    console.log('Editor: jane@eduplatform.com / password123');
    console.log('\n🔑 Invite codes:');
    console.log('Creator: CREATOR123456789');
    console.log('Editor: EDITOR9876543210A');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
