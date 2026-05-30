# Toyota Incentive Calculator

A role-based internal application for managing sales incentives, vehicle inventory, and monthly sales records.

Built as part of the Nippon Toyota Internship Evaluation.

---

## Links

**Live Application:** https://toyota-task.vercel.app

**GitHub Repository:** https://github.com/ajaz-c-k/toyota-task

---

## Demo Credentials

| Role          | Email                                           | Password   |
| ------------- | ----------------------------------------------- | ---------- |
| Admin         | [admin@toyota.com](mailto:admin@toyota.com)     | admin123   |
| Sales Officer | [officer@toyota.com](mailto:officer@toyota.com) | officer123 |

---

## Features

### Sales Officer Portal

#### Monthly Sales Logging

* Select vehicle models
* Enter quantities sold
* Submit monthly sales records

#### Incentive Calculator

* Real-time incentive calculation
* Automatic slab matching
* Displays estimated payout before submission

#### Sales History

* View submitted records
* Review previous incentive payouts

---

### Admin Portal

#### Dashboard

* Total cars sold
* Total incentives paid
* Monthly sales overview
* Officer performance summaries

#### Incentive Slab Management

Configure incentive slabs dynamically.

Example:

| Cars Sold | Incentive per Car |
| --------- | ----------------- |
| 1–3       | ₹1,000            |
| 4–7       | ₹2,000            |
| 8+        | ₹3,500            |

#### Vehicle Management

* Add vehicle models
* Edit vehicle details
* Manage active inventory

#### Sales Records

* View all submissions
* Monitor officer activity
* Export records as CSV

---

## Data Integrity

### Locked Incentive Rates

When a sales record is submitted, the incentive rate used for the calculation is stored with that record.

This ensures historical incentive values remain unchanged even if slab configurations are modified later.

Example:

* An officer submits a record when the 4–7 slab pays ₹2,000 per car.
* The admin later changes the slab to ₹2,500 per car.
* Existing records continue using the original ₹2,000 rate.

### Single Submission Per Month

A compound database index prevents duplicate monthly submissions.

```typescript
SalesRecordSchema.index(
  { officerId: 1, month: 1 },
  { unique: true }
);
```

This ensures an officer can submit only one record for a given month.

---

## Tech Stack

### Frontend

* Next.js 16
* React 19
* TypeScript
* Tailwind CSS v4
* Lucide React

### Backend

* Next.js Route Handlers
* JWT Authentication
* Zod Validation
* Role-Based Access Control (RBAC)

### Database

* MongoDB
* Mongoose

---

## Project Structure

```text
app/
├── admin/
├── officer/
├── login/
├── api/

components/
lib/
models/
```

---

## Local Setup

### Clone the Repository

```bash
git clone https://github.com/ajaz-c-k/toyota-task.git
cd toyota-task
```

### Environment Variables

Create a `.env.local` file:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

### Install Dependencies

```bash
npm install
```

### Run the Application

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---
