/**
 * Nigerian Payroll Calculator (Simplified for NIF Technical ERP)
 * Based on current PIT Act and Pension Act.
 */

export interface SalaryBreakdown {
  basic: number;
  housing: number;
  transport: number;
  otherAllowances: number;
  grossPay: number;
  pensionEmployee: number;
  pensionEmployer: number;
  nhf: number;
  paye: number;
  netPay: number;
}

export const calculateNigerianSalary = (
  monthlyGross: number,
  ratios = { basic: 0.5, housing: 0.3, transport: 0.2 }
): SalaryBreakdown => {
  const basic = monthlyGross * ratios.basic;
  const housing = monthlyGross * ratios.housing;
  const transport = monthlyGross * ratios.transport;
  const otherAllowances = 0;
  
  // 1. Pension (8% of Basic + Housing + Transport)
  const pensionBase = basic + housing + transport;
  const pensionEmployee = pensionBase * 0.08;
  const pensionEmployer = pensionBase * 0.10;
  
  // 2. NHF (2.5% of Basic)
  const nhf = basic * 0.025;
  
  // 3. PAYE (Progressive Tax)
  // Consolidated Relief Allowance (CRA): 
  // Higher of N200k per annum or 1% of Gross, PLUS 20% of Gross.
  const annualGross = monthlyGross * 12;
  const cra = Math.max(200000, 0.01 * annualGross) + (0.2 * annualGross);
  
  // Taxable Income = Gross - CRA - Pension - NHF
  const annualTaxable = Math.max(0, annualGross - cra - (pensionEmployee * 12) - (nhf * 12));
  
  // Progressive tax rates (Annual)
  // First 300k @ 7%
  // Next 300k @ 11%
  // Next 500k @ 15%
  // Next 500k @ 19%
  // Next 1.6m @ 21%
  // Above 3.2m @ 24%
  
  let tax = 0;
  let remaining = annualTaxable;
  
  const bands = [
    { limit: 300000, rate: 0.07 },
    { limit: 300000, rate: 0.11 },
    { limit: 500000, rate: 0.15 },
    { limit: 500000, rate: 0.19 },
    { limit: 1600000, rate: 0.21 },
    { limit: Infinity, rate: 0.24 },
  ];
  
  for (const band of bands) {
    const taxableInBand = Math.min(remaining, band.limit);
    tax += taxableInBand * band.rate;
    remaining -= taxableInBand;
    if (remaining <= 0) break;
  }
  
  const monthlyPaye = tax / 12;
  
  // 4. Net Pay
  const netPay = monthlyGross - pensionEmployee - nhf - monthlyPaye;
  
  return {
    basic,
    housing,
    transport,
    otherAllowances,
    grossPay: monthlyGross,
    pensionEmployee,
    pensionEmployer,
    nhf,
    paye: monthlyPaye,
    netPay
  };
};
