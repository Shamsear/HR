-- 1. Employees Table
CREATE TABLE IF NOT EXISTS public.employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    qid TEXT NOT NULL,
    qid_expiry TEXT NOT NULL,
    passport_no TEXT NOT NULL,
    passport_expiry TEXT NOT NULL,
    license_no TEXT,
    license_expiry TEXT,
    joining_date TEXT NOT NULL,
    role_type TEXT NOT NULL, -- 'Staff' or 'Worker'
    basic_salary NUMERIC NOT NULL,
    accommodation_type TEXT NOT NULL, -- 'company', 'self', 'other'
    accommodation_allowance NUMERIC NOT NULL,
    transport_allowance NUMERIC NOT NULL,
    phone_allowance NUMERIC NOT NULL,
    food_allowance NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active', -- 'Active', 'On Leave', 'Terminated'
    end_date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Vacations Table (Separate table for booking details)
CREATE TABLE IF NOT EXISTS public.vacations (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    duration NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'Completed', -- 'Pending', 'Completed'
    ticket_type TEXT DEFAULT 'None',           -- 'Two-Way Ticket', 'One-Way Ticket', 'None'
    ticket_taken BOOLEAN DEFAULT false,        -- whether the annual air ticket was taken this leave
    paid_days NUMERIC DEFAULT 0,               -- days paid from accrued balance
    unpaid_days NUMERIC DEFAULT 0,             -- excess days taken as unpaid leave
    daily_rate NUMERIC DEFAULT 0,              -- leave salary daily rate
    net_salary NUMERIC DEFAULT 0,              -- paid leave salary (never negative)
    leave_basis NUMERIC DEFAULT 0,             -- monthly leave salary basis
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migration for existing installs: add ticket columns if missing
ALTER TABLE public.vacations ADD COLUMN IF NOT EXISTS ticket_type TEXT DEFAULT 'None';
ALTER TABLE public.vacations ADD COLUMN IF NOT EXISTS ticket_taken BOOLEAN DEFAULT false;
ALTER TABLE public.vacations ADD COLUMN IF NOT EXISTS paid_days NUMERIC DEFAULT 0;
ALTER TABLE public.vacations ADD COLUMN IF NOT EXISTS unpaid_days NUMERIC DEFAULT 0;
ALTER TABLE public.vacations ADD COLUMN IF NOT EXISTS daily_rate NUMERIC DEFAULT 0;
ALTER TABLE public.vacations ADD COLUMN IF NOT EXISTS net_salary NUMERIC DEFAULT 0;
ALTER TABLE public.vacations ADD COLUMN IF NOT EXISTS leave_basis NUMERIC DEFAULT 0;

-- 3. Salary History Table (Separate table for salary hikes)
CREATE TABLE IF NOT EXISTS public.salary_history (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    effective_date TEXT NOT NULL,
    old_basic_salary NUMERIC NOT NULL,
    new_basic_salary NUMERIC NOT NULL,
    old_allowances JSONB NOT NULL, -- { accommodation, transport, phone, food }
    new_allowances JSONB NOT NULL, -- { accommodation, transport, phone, food }
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Notifications Table (System alerts)
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT NOT NULL, -- 'success', 'warning', 'danger', 'info'
    employee_id TEXT REFERENCES public.employees(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Audit Logs Table (For tracking and reverting actions)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    action_type TEXT NOT NULL, -- 'ADD_EMPLOYEE', 'BOOK_VACATION', 'APPLY_HIKE', 'PROCESS_EOS'
    employee_id TEXT,
    details JSONB NOT NULL, -- Contains payload info for rollback
    reverted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Terminations Table (For previous employees records)
CREATE TABLE IF NOT EXISTS public.terminations (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    end_date TEXT NOT NULL,
    eos_details JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Admins Table (For dashboard login users)
CREATE TABLE IF NOT EXISTS public.admins (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed default admin user
INSERT INTO public.admins (id, username, password)
VALUES ('admin-1', 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9')
ON CONFLICT (username) DO NOTHING;

-- ==========================================
-- ROW LEVEL SECURITY (RLS) & POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Enable public bypass policies for development/mock client
CREATE POLICY "Allow public select on employees" ON public.employees FOR SELECT USING (true);
CREATE POLICY "Allow public insert on employees" ON public.employees FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on employees" ON public.employees FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on employees" ON public.employees FOR DELETE USING (true);

CREATE POLICY "Allow public select on vacations" ON public.vacations FOR SELECT USING (true);
CREATE POLICY "Allow public insert on vacations" ON public.vacations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on vacations" ON public.vacations FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on vacations" ON public.vacations FOR DELETE USING (true);

CREATE POLICY "Allow public select on salary_history" ON public.salary_history FOR SELECT USING (true);
CREATE POLICY "Allow public insert on salary_history" ON public.salary_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on salary_history" ON public.salary_history FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on salary_history" ON public.salary_history FOR DELETE USING (true);

CREATE POLICY "Allow public select on notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Allow public insert on notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on notifications" ON public.notifications FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on notifications" ON public.notifications FOR DELETE USING (true);

CREATE POLICY "Allow public select on audit_logs" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert on audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on audit_logs" ON public.audit_logs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on audit_logs" ON public.audit_logs FOR DELETE USING (true);

CREATE POLICY "Allow public select on terminations" ON public.terminations FOR SELECT USING (true);
CREATE POLICY "Allow public insert on terminations" ON public.terminations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on terminations" ON public.terminations FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on terminations" ON public.terminations FOR DELETE USING (true);

CREATE POLICY "Allow public select on admins" ON public.admins FOR SELECT USING (true);
CREATE POLICY "Allow public insert on admins" ON public.admins FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on admins" ON public.admins FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on admins" ON public.admins FOR DELETE USING (true);

-- ==========================================
-- GRANT SCHEMA PERMISSIONS
-- ==========================================
-- Grant usage on schema to api roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant privileges on all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- Grant privileges on sequences (if any)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Ensure future tables have these permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;

