/**
 * Validation utility functions for input validation
 */

/**
 * Validates basic email format
 * @param {string} email - Email string to validate
 * @returns {boolean} True if email format is valid
 * @example
 * isValidEmail('user@example.com') // returns true
 * isValidEmail('invalid-email') // returns false
 */
export const isValidEmail = (email: string): boolean => {
    if (!email || typeof email !== 'string') {
        return false;
    }

    // Basic email regex: localpart@domain.tld
    // Allows alphanumeric, dots, hyphens, underscores in local part
    // Requires @ symbol and domain with at least one dot
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
};

/**
 * Validates date format DDMMYYYY and calendar validity
 * @param {string} dateStr - Date string in DDMMYYYY format
 * @returns {boolean} True if date is valid (includes leap year check)
 * @example
 * isValidDateFormat('01012026') // returns true
 * isValidDateFormat('32012026') // returns false (invalid day)
 */
export const isValidDateFormat = (dateStr: string): boolean => {
    if (!dateStr || typeof dateStr !== 'string' || dateStr.length !== 8) {
        return false;
    }

    // Check if string contains only numbers
    if (!/^\d{8}$/.test(dateStr)) {
        return false;
    }

    // Extract day, month, year
    const day = parseInt(dateStr.substring(0, 2), 10);
    const month = parseInt(dateStr.substring(2, 4), 10);
    const year = parseInt(dateStr.substring(4, 8), 10);

    // Validate ranges
    if (month < 1 || month > 12) {
        return false;
    }

    if (day < 1 || day > 31) {
        return false;
    }

    // Check for valid day in month (considering leap years)
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    // Check for leap year
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (isLeapYear) {
        daysInMonth[1] = 29;
    }

    if (day > daysInMonth[month - 1]) {
        return false;
    }

    // Validate year is reasonable (between 1900 and 2100)
    if (year < 1900 || year > 2100) {
        return false;
    }

    return true;
};

/**
 * Validates registration ID format
 * @param {string} registrationId - Registration ID to validate
 * @returns {boolean} True if format matches EMPLOYEE-OFFERING-COURSE-INSTRUCTOR
 * @example
 * isValidRegistrationIdFormat('JOHN-OFFERING-JAVA-JAMES') // returns true
 */
export const isValidRegistrationIdFormat = (registrationId: string): boolean => {
    if (!registrationId || typeof registrationId !== 'string') {
        return false;
    }

    const trimmed = registrationId.trim();

    // Must contain at least 3 hyphens (4 parts: EMPLOYEE-OFFERING-COURSE-INSTRUCTOR)
    const parts = trimmed.split('-');

    if (parts.length < 4) {
        return false;
    }

    // Second part should be "OFFERING"
    if (parts[1] !== 'OFFERING') {
        return false;
    }

    // All parts should be non-empty
    return parts.every(part => part.length > 0);
};

/**
 * Validates course ID format
 * @param {string} courseId - Course ID to validate
 * @returns {boolean} True if format matches OFFERING-COURSE-INSTRUCTOR
 * @example
 * isValidCourseIdFormat('OFFERING-JAVA-JAMES') // returns true
 */
export const isValidCourseIdFormat = (courseId: string): boolean => {
    if (!courseId || typeof courseId !== 'string') {
        return false;
    }

    const trimmed = courseId.trim();

    // Must start with "OFFERING-"
    if (!trimmed.startsWith('OFFERING-')) {
        return false;
    }

    // Must have at least 3 parts (OFFERING-COURSE-INSTRUCTOR)
    const parts = trimmed.split('-');

    if (parts.length < 3) {
        return false;
    }

    // All parts should be non-empty
    return parts.every(part => part.length > 0);
};

/**
 * Sanitizes string input by trimming whitespace
 * @param {string} input - String to sanitize
 * @returns {string} Trimmed string or empty string if invalid
 */
export const sanitizeInput = (input: string): string => {
    if (!input || typeof input !== 'string') {
        return '';
    }
    return input.trim();
};

/**
 * Checks if a sanitized string is empty
 * @param {string} input - String to check
 * @returns {boolean} True if string is empty after trimming
 */
export const isEmptyAfterTrim = (input: string): boolean => {
    return sanitizeInput(input).length === 0;
};
