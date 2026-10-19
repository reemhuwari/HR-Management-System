export interface LeaveBalance {
  id?: string;
  employeeId: string;
  employeeName: string;
  annual: number;
  sick: number;
  personal: number;
  total: number;
}