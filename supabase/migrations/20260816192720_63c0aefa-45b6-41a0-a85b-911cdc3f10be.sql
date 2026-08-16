-- Persist the National Housing Fund deduction used by the Nigerian payroll breakdown.
ALTER TABLE public.hr_salary_schedules
  ADD COLUMN IF NOT EXISTS nhf numeric NOT NULL DEFAULT 0 CHECK (nhf >= 0);

COMMENT ON COLUMN public.hr_salary_schedules.nhf IS 'Employee National Housing Fund deduction calculated from the payroll breakdown';