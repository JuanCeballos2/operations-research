import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphicalMethodView } from './graphical-method-view';

describe('GraphicalMethodView', () => {
  let component: GraphicalMethodView;
  let fixture: ComponentFixture<GraphicalMethodView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraphicalMethodView],
    }).compileComponents();

    fixture = TestBed.createComponent(GraphicalMethodView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
