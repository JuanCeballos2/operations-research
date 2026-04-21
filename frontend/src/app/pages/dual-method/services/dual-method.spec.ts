import { TestBed } from '@angular/core/testing';

import { DualMethod } from './dual-method';

describe('DualMethod', () => {
  let service: DualMethod;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DualMethod);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
