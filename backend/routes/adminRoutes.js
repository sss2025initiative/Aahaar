import express from 'express';
import { approveNgo, getNgoBasedOnCity, getUsersBasedOnCity, verifyUser } from '../controllers/adminController';

const router = express.Router();
router.get('/users', getUsersBasedOnCity);
router.get('/ngo', getNgoBasedOnCity);
router.put('/ngo/:id/approve', approveNgo);
router.put('/user/:id/verify', verifyUser);