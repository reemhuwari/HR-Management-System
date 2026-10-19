import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeaveBalancesComponent } from './leave-balances';

describe('LeaveBalances', () => {
  let component: LeaveBalancesComponent;
  let fixture: ComponentFixture<LeaveBalancesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeaveBalancesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeaveBalancesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
