/*
 Generate course ID from course name and instructor name
 Format: OFFERING-<COURSE-NAME>-<INSTRUCTOR>
 */
export const generateCourseId = (courseName: string, instructorName: string): string => {
    return `OFFERING-${courseName.toUpperCase()}-${instructorName.toUpperCase()}`;
};

/*
 Generate registration ID from employee name and course ID
 Format: <EMPLOYEE-NAME>-<COURSE-ID>
 */
export const generateRegistrationId = (employeeName: string, courseId: string): string => {
    return `${employeeName.toUpperCase()}-${courseId}`;
};

/*
  Sort array of registrations by registration_id in ascending order
 */
export const sortByRegistrationId = (items: any[]): any[] => {
    return items.sort((a, b) => a.registration_id.localeCompare(b.registration_id));
};

/*
 Extract course_id from registration_id
 Example: "ANDY-OFFERING-JAVA-JAMES" -> "OFFERING-JAVA-JAMES"
 */
export const extractCourseIdFromRegistration = (registrationId: string): string => {
    const parts = registrationId.split('-');
    return parts.slice(1).join('-');
};
