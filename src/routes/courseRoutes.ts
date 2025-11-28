import express from 'express';
import { addCourseOffering, allotCourse } from '../controllers/courseController';

const router = express.Router();

// POST /add/courseOffering
router.post('/add/courseOffering', addCourseOffering);

// PUT /allot/:course_id (changed from POST to PUT for update operation)
router.put('/allot/:course_id', allotCourse);

export default router;
