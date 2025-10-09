import { TestBed } from '@angular/core/testing';

import { AiCurrencyService } from './ai-currency.service';

describe('AiCurrencyService', () => {
  let service: AiCurrencyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AiCurrencyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
