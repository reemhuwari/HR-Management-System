import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Attendance } from '../models/attendance.model';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    `${environment.apiUrl}/attendance`;

  getAttendance(): Observable<Attendance[]> {
    return this.http.get<Attendance[]>(
      this.apiUrl
    );
  }

  getAttendanceByDate(
    date: string
  ): Observable<Attendance[]> {
    return this.http.get<Attendance[]>(
      `${this.apiUrl}?date=${encodeURIComponent(date)}`
    );
  }

  getAttendanceByEmployee(
    employeeId: string
  ): Observable<Attendance[]> {
    return this.http.get<Attendance[]>(
      `${this.apiUrl}?employeeId=${encodeURIComponent(employeeId)}`
    );
  }

  getTodayAttendance(
    employeeId: string,
    date: string
  ): Observable<Attendance[]> {
    return this.http.get<Attendance[]>(
      `${this.apiUrl}?employeeId=${encodeURIComponent(employeeId)}&date=${encodeURIComponent(date)}`
    );
  }

  getAttendanceById(
    id: string
  ): Observable<Attendance> {
    return this.http.get<Attendance>(
      `${this.apiUrl}/${id}`
    );
  }

  addAttendance(
    record: Attendance
  ): Observable<Attendance> {
    return this.http.post<Attendance>(
      this.apiUrl,
      record
    );
  }

  updateAttendance(
    id: string,
    record: Attendance
  ): Observable<Attendance> {
    return this.http.put<Attendance>(
      `${this.apiUrl}/${id}`,
      record
    );
  }

  deleteAttendance(
    id: string
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`
    );
  }

  checkIn(
    employeeId: string,
    date: string,
    checkIn: string,
    status: 'present' | 'late'
  ): Observable<Attendance> {
    const record: Attendance = {
      employeeId,
      date,
      checkIn,
      checkOut: null,
      status,
      workHours: 0
    };

    return this.addAttendance(record);
  }

  checkOut(
    id: string,
    record: Attendance,
    checkOut: string,
    workHours: number
  ): Observable<Attendance> {
    const updatedRecord: Attendance = {
      ...record,
      checkOut,
      workHours,
      status: record.status === 'late'
        ? 'late'
        : 'present'
    };

    return this.updateAttendance(
      id,
      updatedRecord
    );
  }
}