import { ComponentFixture, TestBed } from '@angular/core/testing';

import {Attendace} from './attendace'

describe('Attendace', () => {
  let component: Attendace;
  let fixture: ComponentFixture<Attendace>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Attendace]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Attendace);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
