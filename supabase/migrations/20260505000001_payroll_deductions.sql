-- Add statutory deduction fields to worker_payments
ALTER TABLE public.worker_payments ADD COLUMN IF NOT EXISTS basic_salary DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE public.worker_payments ADD COLUMN IF NOT EXISTS housing_allowance DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE public.worker_payments ADD COLUMN IF NOT EXISTS transport_allowance DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE public.worker_payments ADD COLUMN IF NOT EXISTS other_allowances DECIMAL(15, 2) DEFAULT 0;

ALTER TABLE public.worker_payments ADD COLUMN IF NOT EXISTS pension_employee DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE public.worker_payments ADD COLUMN IF NOT EXISTS pension_employer DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE public.worker_payments ADD COLUMN IF NOT EXISTS nhf_deduction DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE public.worker_payments ADD COLUMN IF NOT EXISTS paye_tax DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE public.worker_payments ADD COLUMN IF NOT EXISTS other_deductions DECIMAL(15, 2) DEFAULT 0;

ALTER TABLE public.worker_payments ADD COLUMN IF NOT EXISTS net_pay DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE public.worker_payments ADD COLUMN IF NOT EXISTS gross_pay DECIMAL(15, 2) DEFAULT 0;

-- Update worker_profiles to store salary structure
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS basic_salary DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS housing_allowance DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS transport_allowance DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS other_allowances DECIMAL(15, 2) DEFAULT 0;

-- Document numbering for payslips
CREATE TRIGGER tr_worker_payments_doc_num BEFORE INSERT ON public.worker_payments FOR EACH ROW EXECUTE FUNCTION public.auto_assign_doc_number();
