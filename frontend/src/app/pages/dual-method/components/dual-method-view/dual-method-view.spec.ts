import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DualMethodView } from './dual-method-view';

describe('DualMethodView', () => {
  let component: DualMethodView;
  let fixture: ComponentFixture<DualMethodView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DualMethodView],
    }).compileComponents();

    fixture = TestBed.createComponent(DualMethodView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
