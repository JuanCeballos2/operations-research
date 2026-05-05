import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimplexTwoPhasesView } from './simplex-two-phases-view';

describe('SimplexTwoPhasesView', () => {
  let component: SimplexTwoPhasesView;
  let fixture: ComponentFixture<SimplexTwoPhasesView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimplexTwoPhasesView],
    }).compileComponents();

    fixture = TestBed.createComponent(SimplexTwoPhasesView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
