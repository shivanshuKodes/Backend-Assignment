import express from 'express';
import { addCourseOffering, allotCourse } from '../controllers/courseController';

const router = express.Router();

// POST /add/courseOffering
router.post('/add/courseOffering', addCourseOffering);

// POST /allot/:course_id
router.post('/allot/:course_id', allotCourse);

export default router;
