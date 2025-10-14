import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AiCurrencyService {
  private GEMINI_API_KEY = 'AIzaSyDeKLbDDCYNkzEiM2vNTsaC7PAZlNhiIMM';
  private CURRENCY_API_URL = 'https://api.exchangerate-api.com/v4/latest';
  private GEMINI_MODEL = 'gemini-2.0-flash';

  constructor(private http: HttpClient) {}

  // Helper methods
  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getPastDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  // Step 1: Use Gemini to interpret user text
  async interpretQuery(
    query: string
  ): Promise<{ amount: number; from: string; to: string }> {
    const body = {
      contents: [
        {
          parts: [
            {
              text: `Extract currency conversion details from: "${query}"
              
              Extract:
              - amount (number, default: 1)
              - from currency (3-letter ISO code like USD, EUR, INR, GBP, JPY, CAD, AUD, CNY, etc.)
              - to currency (3-letter ISO code)
              
              Common currencies:
              USD (US Dollar), EUR (Euro), GBP (British Pound), JPY (Japanese Yen), 
              INR (Indian Rupee), CAD (Canadian Dollar), AUD (Australian Dollar),
              CHF (Swiss Franc), CNY (Chinese Yuan), SGD (Singapore Dollar),
              NZD (New Zealand Dollar), MXN (Mexican Peso), BRL (Brazilian Real),
              RUB (Russian Ruble), ZAR (South African Rand), AED (UAE Dirham),
              SAR (Saudi Riyal), TRY (Turkish Lira), KRW (South Korean Won)
              
              Respond ONLY with valid JSON:
              { "amount": number, "from": "USD", "to": "INR" }`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 150,
      },
    };

    try {
      const res: any = await firstValueFrom(
        this.http.post(
          `https://generativelanguage.googleapis.com/v1/models/${this.GEMINI_MODEL}:generateContent?key=${this.GEMINI_API_KEY}`,
          body
        )
      );

      const text = res?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!text) {
        throw new Error('No response from Gemini AI');
      }

      const cleanText = text.replace(/```json\s*|\s*```/g, '');
      const parsed = JSON.parse(cleanText);

      if (!parsed.from || !parsed.to) {
        throw new Error(
          'Could not detect currencies. Please specify both source and target currencies.'
        );
      }

      return {
        amount: Number(parsed.amount) || 1,
        from: parsed.from.toUpperCase(),
        to: parsed.to.toUpperCase(),
      };
    } catch (error) {
      console.error('Error interpreting query:', error);
      throw new Error(
        'Failed to understand your request. Please try: "Convert 100 USD to INR" or "50 euros in Japanese yen"'
      );
    }
  }

  // Step 2: Fetch live conversion
  async getConversion(
    from: string,
    to: string,
    amount: number
  ): Promise<{ converted: number; rate: number }> {
    try {
      const url = `${this.CURRENCY_API_URL}/${from}`;
      const res: any = await firstValueFrom(this.http.get(url));

      if (!res.rates || !res.rates[to]) {
        throw new Error(
          `Conversion from ${from} to ${to} not supported. Try common currencies like USD, EUR, GBP, JPY, INR, etc.`
        );
      }

      const rate = res.rates[to];
      const converted = amount * rate;

      return {
        converted: converted,
        rate: rate,
      };
    } catch (error: any) {
      console.error('Error converting currency:', error);
      throw new Error(`Failed to convert ${from} to ${to}. Please try again.`);
    }
  }

  // Get popular currencies for display
  getPopularCurrencies(): string[] {
    return [
      'USD',
      'EUR',
      'GBP',
      'JPY',
      'INR',
      'CAD',
      'AUD',
      'CHF',
      'CNY',
      'SGD',
      'NZD',
      'MXN',
      'BRL',
      'RUB',
      'ZAR',
      'AED',
      'SAR',
      'TRY',
      'KRW',
    ];
  }

  // Historical rates with fallback to mock data
  async getHistoricalRates(
    base: string,
    target: string,
    days: number = 7
  ): Promise<any[]> {
    try {
      // Using a free historical API
      const url = `https://api.frankfurter.app/${this.getPastDate(
        days
      )}..${this.getCurrentDate()}?from=${base}&to=${target}`;
      const res: any = await firstValueFrom(this.http.get(url));

      const rates = [];
      for (const [date, rateData] of Object.entries(res.rates)) {
        rates.push({
          date: date,
          rate: (rateData as any)[target],
        });
      }

      return rates.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Error fetching historical rates, using mock data:', error);
      return this.generateMockHistoricalData(base, target, days);
    }
  }

  // Generate mock historical data
  private generateMockHistoricalData(
    base: string,
    target: string,
    days: number
  ): any[] {
    const rates = [];
    const baseRate = this.getBaseRate(base, target);

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const variation = (Math.random() - 0.5) * 0.1;
      const rate = baseRate * (1 + variation);

      rates.push({
        date: dateStr,
        rate: parseFloat(rate.toFixed(4)),
      });
    }

    return rates;
  }

  private getBaseRate(from: string, to: string): number {
    const commonRates: any = {
      USD_EUR: 0.85,
      USD_GBP: 0.73,
      USD_INR: 83.0,
      USD_JPY: 110.0,
      EUR_USD: 1.18,
      EUR_GBP: 0.86,
      GBP_USD: 1.37,
      GBP_EUR: 1.16,
      INR_USD: 0.012,
      JPY_USD: 0.0091,
    };

    return commonRates[`${from}_${to}`] || 1.0;
  }

  // Add to AiCurrencyService class

  // Currency Converter with Fees
  async getConversionWithFees(
    from: string,
    to: string,
    amount: number,
    feePercentage: number = 1.5
  ): Promise<{
    converted: number;
    rate: number;
    feeAmount: number;
    netAmount: number;
    feePercentage: number;
    breakdown: {
      originalAmount: number;
      exchangeRate: number;
      grossAmount: number;
      fee: number;
      netAmount: number;
    };
  }> {
    try {
      // Get the base conversion
      const conversion = await this.getConversion(from, to, amount);

      // Calculate fees
      const feeAmount = conversion.converted * (feePercentage / 100);
      const netAmount = conversion.converted - feeAmount;

      return {
        converted: conversion.converted,
        rate: conversion.rate,
        feeAmount: feeAmount,
        netAmount: netAmount,
        feePercentage: feePercentage,
        breakdown: {
          originalAmount: amount,
          exchangeRate: conversion.rate,
          grossAmount: conversion.converted,
          fee: feeAmount,
          netAmount: netAmount,
        },
      };
    } catch (error) {
      console.error('Error in conversion with fees:', error);
      throw error;
    }
  }

  // Common fee structures for different services
  getFeeStructures(): { [key: string]: number } {
    return {
      Banks: 2.5,
      'Credit Cards': 3.0,
      PayPal: 4.0,
      TransferWise: 0.5,
      Revolut: 1.0,
      'Western Union': 5.0,
      'Airport Kiosks': 7.0,
      'No Fees': 0.0,
    };
  }
}
