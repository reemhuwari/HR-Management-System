import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';
import { Observable, map, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/users`;
  private readonly storageKey = 'peopleflow_user';

    login(
    email: string,
    password: string
  ): Observable<User | null> {

    return this.http
      .get<User[]>(
        `${this.apiUrl}?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
      )
      .pipe(
        map(users => users.length > 0 ? users[0] : null),

        tap(user => {
          if (
            user &&
            user.status !== 'pending' &&
            user.status !== 'rejected'
          ) {
            localStorage.setItem(
              this.storageKey,
              JSON.stringify(user)
            );
          }
        })
      );
  }

    register(
    userData: Omit<User, 'id' | 'createdAt' | 'role' | 'status'>
  ): Observable<User> {

    const newUser: User = {
      ...userData,
      role: 'employee',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    return this.http.post<User>(
      this.apiUrl,
      newUser
    );
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
  }

  homeRouteFor(role: User['role']): string {
    return role === 'employee'
      ? '/employee/dashboard'
      : '/dashboard';
  }

  getHomeRoute(): string {
    const user = this.getCurrentUser();

    return user ? this.homeRouteFor(user.role) : '/login';
  }

  startSession(user: User): void {
    localStorage.setItem(this.storageKey, JSON.stringify(user));
  }

  emailExists(email: string): Observable<boolean> {
    return this.http
      .get<User[]>(`${this.apiUrl}?email=${encodeURIComponent(email)}`)
      .pipe(map(users => users.length > 0));
  }
  getPendingUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}?status=pending`);
  }

  updateUserById(
    id: string,
    changes: Partial<User>
  ): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${id}`, changes);
  }
  getCurrentUser(): User | null {

    const user = localStorage.getItem(
      this.storageKey
    );

    if (!user) {
      return null;
    }

    try {
      return JSON.parse(user) as User;
    } catch {
      this.logout();
      return null;
    }
  }

  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null;
  }

  updateCurrentUser(
    changes: Partial<
      Pick<User, 'firstName' | 'lastName' | 'email' | 'department' | 'position'>
    >
  ): Observable<User> {
    const currentUser = this.getCurrentUser();

    if (!currentUser?.id) {
      return throwError(
        () => new Error('Unable to identify the current user.')
      );
    }

    return this.http
      .patch<User>(
        `${this.apiUrl}/${currentUser.id}`,
        changes
      )
      .pipe(
        map(updatedUser => ({
          ...currentUser,
          ...updatedUser,
          ...changes
        })),
        tap(updatedUser => {
          localStorage.setItem(
            this.storageKey,
            JSON.stringify(updatedUser)
          );
        })
      );
  }
}