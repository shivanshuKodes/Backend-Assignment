import express from 'express';
import { registerForCourse, cancelRegistration } from '../controllers/registrationController';

const router = express.Router();

// POST /add/register/:course_id
router.post('/add/register/:course_id', registerForCourse);

// POST /cancel/:registration_id
router.post('/cancel/:registration_id', cancelRegistration);

export default router;
