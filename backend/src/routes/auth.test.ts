import request from 'supertest';
import express from 'express';
import { authRoutes } from './auth';
import { prisma } from '../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'testsecret';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// Error handler to see what's happening
app.use((err: any, req: any, res: any, next: any) => {
  res.status(500).json({ error: err.message });
});

jest.mock('../config/database', () => ({
  prisma: {
    creator: {
      findUnique: jest.fn(),
      create: jest.fn()
    }
  }
}));

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      (prisma.creator.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.creator.create as jest.Mock).mockResolvedValue({
        id: '1',
        name: 'Test',
        email: 'test@test.com',
        passwordHash: 'hashed',
        walletAddress: '0x123'
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test',
          email: 'test@test.com',
          password: 'password123',
          walletAddress: '0x123'
        });

      expect(res.status).toBe(201);
    });

    it('should fail if email exists', async () => {
      (prisma.creator.findUnique as jest.Mock).mockResolvedValue({ id: '1' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test',
          email: 'test@test.com',
          password: 'password123',
          walletAddress: '0x123'
        });

      expect(res.status).toBe(409); // Updated to 409
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login an existing user', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      (prisma.creator.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        name: 'Test',
        email: 'test@test.com',
        passwordHash,
        walletAddress: '0x123'
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return the current user', async () => {
      const token = jwt.sign({ userId: '1', email: 'test@test.com' }, 'testsecret');
      
      (prisma.creator.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        name: 'Test',
        email: 'test@test.com',
        walletAddress: '0x123'
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });
});
