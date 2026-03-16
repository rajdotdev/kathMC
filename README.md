# Kathford MC Ledger & Student Management

A robust, offline-first Progressive Web Application (PWA) built to manage student ledgers, event payments, and financial transactions for Kathford MC. The application features seamless offline synchronization, role-based access control, and comprehensive reporting tools.

## Key Features

- **Offline-First PWA:** Fully functional without an internet connection. Actions are queued locally using IndexedDB and automatically synced to the server when the connection is restored.
- **Student Management:** Add, edit, and remove students. Supports bulk importing via CSV.
- **Event Management:** Create events and assign costs to all or specific students.
- **Ledger System:** Track individual student balances, log partial or full payments, and process bulk payments for multiple students at once.
- **Transaction History:** View, filter, and export transaction logs. Generate and print professional payment receipts.
- **Role-Based Access Control (RBAC):** Restricts access to specific Kathford student emails, with designated Admin and Viewer roles.
- **Real-time Sync:** Powered by Supabase for real-time database updates and authentication.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Backend/Database:** Supabase (PostgreSQL, GoTrue Auth)
- **Offline Storage:** IndexedDB (Custom Queue System)
- **PWA:** `vite-plugin-pwa`

---

## Page Structure

The application is structured into several intuitive modules:

1. **Dashboard (`/`)**
   - High-level overview of total collections, goals, and recent activity.
   - Quick stats and visual summaries.

2. **Students (`/students`)**
   - Directory of all registered students.
   - Features: Search, Add/Edit/Delete, CSV Import.
   - Displays contact info and quick WhatsApp/Email links.

3. **Ledger (`/ledger`)**
   - The core financial tracking interface.
   - Select an event to view student balances specific to that event.
   - Features: Log payments, mark as fully paid, bulk payments, bulk remove, and send reminders.

4. **Transactions (`/transactions`)**
   - Comprehensive log of all payments.
   - Features: Filter by date, payment method, or search query.
   - Export to CSV or view/print individual receipts.

5. **Events (`/events`)**
   - Manage event categories and individual events.
   - Track active vs. past events and their associated costs.

---

## Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A Supabase project

### 1. Clone & Install
```bash
# Clone the repository
git clone <repository-url>
cd kathford-mc-ledger

# Install dependencies
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Development Server
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

### 4. Build for Production
```bash
npm run build
```

---

## 🗄️ Database Schema (Supabase SQL)

To set up your Supabase database, run the following SQL commands in your Supabase SQL Editor.

```sql
-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Students Table: Stores student profiles and financial summaries
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  roll_no TEXT,
  phone TEXT,
  email TEXT,
  amount_owed NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  balances JSONB DEFAULT '{}'::jsonb
);

-- 2. Categories Table: Groups events (e.g., 'Sports', 'Academic')
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL
);

-- 3. Events Table: Individual fee-collection events
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'active',
  amount_per_student NUMERIC DEFAULT 0
);

-- 4. Transactions Table: Records payments made by students
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  payment_method TEXT DEFAULT 'Cash'
);

-- 5. App Settings Table: Global configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  id INTEGER PRIMARY KEY,
  total_goal NUMERIC DEFAULT 0
);

-- Initialize default settings (only if not already present)
INSERT INTO public.app_settings (id, total_goal) 
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;
```

### Row Level Security (RLS)
*Note: For a production environment, you should enable RLS on all tables and configure policies based on the authenticated user's role.*

---

## Authentication & Roles

The application uses Supabase Google OAuth. Access is strictly controlled via the `Auth.tsx` component.

- **Domain Restriction:** Only emails ending in `@kathford.edu.np` (specifically `082@kathford.edu.np`) are permitted to log in.
- **Admin Role:** Hardcoded admin emails have full read/write access (Add students, log payments, delete records).
- **Viewer Role:** All other valid Kathford emails default to a "Viewer" role, which allows them to see the ledger and transactions but prevents any data mutation.

To modify admin access, update the `adminEmails` array in `/src/components/Auth.tsx`.

---

## Offline Synchronization Architecture

The app is designed to work flawlessly in environments with poor or no internet connectivity.

1. **Local State:** React context (`StoreContext.tsx`) maintains the optimistic UI state.
2. **Action Queue:** When offline, mutations (Add Payment, Create Event, etc.) are intercepted and saved to an IndexedDB store (`offlineQueue.ts`).
3. **Background Sync:** Upon detecting an online connection (`window.addEventListener('online')`), the app sequentially processes the queued actions, pushing them to Supabase.
4. **ID Preservation:** UUIDs are generated on the client-side *before* queuing. This ensures that relational data (e.g., an offline payment linked to an offline event) maintains its integrity when synced to the backend.
