import { TestBed } from '@angular/core/testing';

import { SimplexTwoPhasesServices } from './simplex-two-phases.services';

describe('SimplexTwoPhasesServices', () => {
  let service: SimplexTwoPhasesServices;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SimplexTwoPhasesServices);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
