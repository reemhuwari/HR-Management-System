export interface User {
  id?: string;
  employeeId?: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'employee' | 'hr' | 'admin';
  status?: 'active' | 'pending' | 'rejected'; 
  department?: string;
  position?: string;
  phone?: string;
  createdAt: string;
}