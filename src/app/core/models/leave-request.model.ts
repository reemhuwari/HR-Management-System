export interface LeaveRequest {
  id?: string;
  employeeId: string;
  employeeName: string;
  type: 'Annual Leave' | 'Sick Leave' | 'Personal Leave';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}