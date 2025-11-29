import express from 'express';
import { registerForCourse, cancelRegistration, getCourseRegistrations } from '../controllers/registrationController';

const router = express.Router();

// POST /add/register/:course_id
router.post('/add/register/:course_id', registerForCourse);

// DELETE /cancel/:registration_id (changed from POST to DELETE for delete operation)
router.delete('/cancel/:registration_id', cancelRegistration);

// GET /registrations/:course_id
router.get('/registrations/:course_id', getCourseRegistrations);

export default router;
