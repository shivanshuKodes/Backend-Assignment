/**
 * Generate course ID from course name and instructor name
 * @param {string} courseName - Name of the course
 * @param {string} instructorName - Name of the instructor
 * @returns {string} Course ID in format OFFERING-COURSENAME-INSTRUCTOR
 * @example
 * generateCourseId('Java', 'James') // returns 'OFFERING-JAVA-JAMES'
 */
export const generateCourseId = (courseName: string, instructorName: string): string => {
    return `OFFERING-${courseName.toUpperCase()}-${instructorName.toUpperCase()}`;
};

/**
 * Generate registration ID from employee name and course ID
 * @param {string} employeeName - Name of the employee
 * @param {string} courseId - Course ID
 * @returns {string} Registration ID in format EMPLOYEE-COURSEID
 * @example
 * generateRegistrationId('Andy', 'OFFERING-JAVA-JAMES') // returns 'ANDY-OFFERING-JAVA-JAMES'
 */
export const generateRegistrationId = (employeeName: string, courseId: string): string => {
    return `${employeeName.toUpperCase()}-${courseId}`;
};

/**
 * Sort array of registrations by registration_id in ascending order
 * @param {any[]} items - Array of registration objects
 * @returns {any[]} Sorted array
 */
export const sortByRegistrationId = (items: any[]): any[] => {
    return items.sort((a, b) => a.registration_id.localeCompare(b.registration_id));
};

/**
 * Extract course_id from registration_id
 * @param {string} registrationId - Registration ID
 * @returns {string} Extracted course ID
 * @example
 * extractCourseIdFromRegistration('ANDY-OFFERING-JAVA-JAMES') // returns 'OFFERING-JAVA-JAMES'
 */
export const extractCourseIdFromRegistration = (registrationId: string): string => {
    const parts = registrationId.split('-');
    return parts.slice(1).join('-');
};
