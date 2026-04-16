import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimplexMethodView } from './simplex-method-view';

describe('SimplexMethodView', () => {
  let component: SimplexMethodView;
  let fixture: ComponentFixture<SimplexMethodView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimplexMethodView],
    }).compileComponents();

    fixture = TestBed.createComponent(SimplexMethodView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
