export type NotificationType =
  | 'leave-request'
  | 'leave-approved'
  | 'leave-rejected'
  | 'account-request'
  | 'general';

export interface NotificationParams {
  employeeName?: string;
  leaveType?: string;
  days?: number;
}

export interface NotificationInt {
  id?: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedId?: string;
  audience?: 'admin' | 'employee'; // بدون قيمة = إشعار للأدمن
  recipientEmployeeId?: string;
  params?: NotificationParams;
  isRead: boolean;
  createdAt: string;
}