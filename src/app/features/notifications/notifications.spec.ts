import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Notifications } from './notifications';
import { NotificationService } from '../../core/services/notification.service';

describe('Notifications', () => {
  let component: Notifications;
  let fixture: ComponentFixture<Notifications>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Notifications],
      providers: [
        {
          provide: NotificationService,
          useValue: {
            getNotifications: () => of([]),
            markAsRead: () => of({}),
            markAllAsRead: () => of([]),
            deleteNotification: () => of(undefined)
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Notifications);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate unread notifications', () => {
    component.notifications = [
      {
        id: '1',
        title: 'Leave request',
        message: 'A new request was submitted.',
        type: 'leave-request',
        isRead: false,
        createdAt: '2026-10-15T10:00:00'
      },
      {
        id: '2',
        title: 'Leave approved',
        message: 'Your request was approved.',
        type: 'leave-approved',
        isRead: true,
        createdAt: '2026-10-15T11:00:00'
      }
    ];

    expect(component.unreadCount).toBe(1);
    expect(component.readCount).toBe(1);
  });

  it('should filter unread notifications', () => {
    component.notifications = [
      {
        id: '1',
        title: 'New request',
        message: 'A request needs review.',
        type: 'leave-request',
        isRead: false,
        createdAt: '2026-10-15T10:00:00'
      }
    ];

    component.setFilter('unread');

    expect(component.filteredNotifications.length).toBe(1);
  });
});