# Course Management System - Backend API

A robust Node.js/Express.js backend API built with TypeScript for managing course offerings and employee registrations using AWS DynamoDB.

## 🚀 Features

- **Course Management**: Create and manage course offerings with instructor assignments
- **Employee Registration**: Register employees for courses with automatic validation
- **Course Allotment**: Automatically allot courses based on min/max employee requirements
- **Registration Cancellation**: Cancel registrations with automatic course status updates
- **Single-Table Design**: Efficient DynamoDB single-table design pattern for optimal performance

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js v5
- **Language**: TypeScript
- **Database**: AWS DynamoDB
- **AWS SDK**: @aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb
- **Environment**: dotenv for configuration

## 📋 Prerequisites

- Node.js (v14 or higher)
- AWS Account with DynamoDB access
- AWS credentials configured locally

## 🔧 Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd BE_Assignment
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory:
```env
PORT=3000
TABLE_NAME=CourseManagementTable
AWS_REGION=your-aws-region
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

4. **Build the project**
```bash
npm run build
```

## 🚦 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## 📚 API Endpoints

### Course Management

#### Add Course Offering
```http
POST /add/courseOffering
Content-Type: application/json

{
  "course_name": "JAVA",
  "instructor_name": "JAMES",
  "start_date": "15062022",
  "min_employees": 1,
  "max_employees": 2
}
```

#### Allot Course
```http
POST /allot/:course_id
```
Automatically allots a course to registered employees if minimum requirements are met.

### Registration Management

#### Register for Course
```http
POST /add/register/:course_id
Content-Type: application/json

{
  "employee_name": "ANDY",
  "email": "ANDY@GMAIL.COM"
}
```

#### Cancel Registration
```http
POST /cancel/:registration_id
```

## 🗄️ Database Schema

The application uses a **single-table design** in DynamoDB with the following structure:

### Primary Keys
- **PK (Partition Key)**: Determines data distribution
- **SK (Sort Key)**: Enables efficient querying within partitions

### Access Patterns

1. **Course Details**: `PK = COURSE#<course_id>` AND `SK = METADATA`
2. **Course Registrations**: `PK = COURSE#<course_id>` AND `SK begins_with REG#`
3. **Employee Registrations**: `PK = EMPLOYEE#<email>` AND `SK begins_with COURSE#`
4. **Check Duplicate Registration**: `PK = EMPLOYEE#<email>` AND `SK = COURSE#<course_id>`

See [DB_Visual.md](./DB_Visual.md) for detailed schema visualization.

## 📁 Project Structure

```
BE_Assignment/
├── src/
│   ├── config/
│   │   └── dynamoDB.ts          # DynamoDB client configuration
│   ├── controllers/
│   │   ├── courseController.ts   # Course management logic
│   │   └── registrationController.ts  # Registration logic
│   ├── routes/
│   │   ├── courseRoutes.ts       # Course API routes
│   │   └── registrationRoutes.ts # Registration API routes
│   ├── types/
│   │   └── enums.ts              # TypeScript enums
│   ├── utils/
│   │   └── helpers.ts            # Utility functions
│   └── index.ts                  # Application entry point
├── .env                          # Environment variables (gitignored)
├── .gitignore
├── package.json
├── tsconfig.json                 # TypeScript configuration
└── README.md
```

## 🔐 Registration Status Flow

```
PENDING → ACCEPTED → CONFIRMED
   ↓
REJECTED
```

- **PENDING**: Initial registration state
- **ACCEPTED**: Registration accepted (within max capacity)
- **REJECTED**: Registration rejected (course full)
- **CONFIRMED**: Course allotted to employee

## 🎯 Key Features

### Automatic Table Initialization
The application automatically creates the DynamoDB table on startup if it doesn't exist.

### Transaction Support
Uses DynamoDB transactions to ensure data consistency across multiple operations:
- Registration creates entries in both course and employee partitions
- Cancellation updates course count and registration status atomically

### Validation
- Prevents duplicate registrations
- Enforces min/max employee constraints
- Validates course capacity before accepting registrations

### Error Handling
Comprehensive error handling with descriptive messages for:
- Course not found
- Registration conflicts
- Capacity violations
- Invalid operations

## 🧪 Testing

The application includes comprehensive validation for:
- Course creation with valid parameters
- Employee registration with duplicate detection
- Course allotment based on min/max requirements
- Registration cancellation with status updates

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `TABLE_NAME` | DynamoDB table name | CourseManagementTable |
| `AWS_REGION` | AWS region | - |
| `AWS_ACCESS_KEY_ID` | AWS access key | - |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | - |


---

