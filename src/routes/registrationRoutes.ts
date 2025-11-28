import express from 'express';
import { registerForCourse, cancelRegistration } from '../controllers/registrationController';

const router = express.Router();

// POST /add/register/:course_id
router.post('/add/register/:course_id', registerForCourse);

// DELETE /cancel/:registration_id (changed from POST to DELETE for delete operation)
router.delete('/cancel/:registration_id', cancelRegistration);

export default router;
