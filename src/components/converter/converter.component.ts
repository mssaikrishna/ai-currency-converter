import { Component } from '@angular/core';
import { AiCurrencyService } from '../../services/ai-currency.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-converter',
  templateUrl: './converter.component.html',
  imports: [FormsModule, CommonModule],
  styleUrls: ['./converter.component.css']
})
export class ConverterComponent {
  userQuery = '';
  result = '';
  detailedResult = '';
  error = '';
  loading = false;
  popularCurrencies: string[] = [];

  parsed: any = null;
  currentRate: number = 0;
  calculatorFromCurrency: string = 'USD';
  calculatorToCurrency: string = 'EUR';
  calculatorFromAmount: number = 1;
  calculatorToAmount: number = 1;
  
  showChart = false;
  historicalData: any = null;
  multipleResults: any[] = [];
  showCalculator = false;
  chart : any = null;
  
  favorites: string[] = [];

  currencyInfo: { [key: string]: { name: string; flag: string; symbol: string } } = {
    'USD': { name: 'US Dollar', flag: '🇺🇸', symbol: '$' },
    'EUR': { name: 'Euro', flag: '🇪🇺', symbol: '€' },
    'GBP': { name: 'British Pound', flag: '🇬🇧', symbol: '£' },
    'JPY': { name: 'Japanese Yen', flag: '🇯🇵', symbol: '¥' },
    'INR': { name: 'Indian Rupee', flag: '🇮🇳', symbol: '₹' },
    'CAD': { name: 'Canadian Dollar', flag: '🇨🇦', symbol: 'CA$' },
    'AUD': { name: 'Australian Dollar', flag: '🇦🇺', symbol: 'A$' },
    'CHF': { name: 'Swiss Franc', flag: '🇨🇭', symbol: 'CHF' },
    'CNY': { name: 'Chinese Yuan', flag: '🇨🇳', symbol: '¥' },
    'SGD': { name: 'Singapore Dollar', flag: '🇸🇬', symbol: 'S$' },
    'NZD': { name: 'New Zealand Dollar', flag: '🇳🇿', symbol: 'NZ$' },
    'MXN': { name: 'Mexican Peso', flag: '🇲🇽', symbol: 'MX$' },
    'BRL': { name: 'Brazilian Real', flag: '🇧🇷', symbol: 'R$' },
    'RUB': { name: 'Russian Ruble', flag: '🇷🇺', symbol: '₽' },
    'ZAR': { name: 'South African Rand', flag: '🇿🇦', symbol: 'R' },
    'AED': { name: 'UAE Dirham', flag: '🇦🇪', symbol: 'د.إ' },
    'SAR': { name: 'Saudi Riyal', flag: '🇸🇦', symbol: '﷼' },
    'TRY': { name: 'Turkish Lira', flag: '🇹🇷', symbol: '₺' },
    'KRW': { name: 'South Korean Won', flag: '🇰🇷', symbol: '₩' }
  };
  
  examples = [
    'Convert 100 USD to INR',
    '50 euros in Japanese yen',
    '1000 GBP to Canadian dollars',
    '25 Australian dollars in Indian rupees',
    '5000 Japanese yen to US dollars',
    '75 Swiss francs in euros',
    '1000 Chinese yuan to US dollars'
  ];

  constructor(private aiService: AiCurrencyService) {
    this.popularCurrencies = this.aiService.getPopularCurrencies();
    this.loadFavorites();
  }

  loadFavorites() {
    const saved = localStorage.getItem('favoriteCurrencies');
    this.favorites = saved ? JSON.parse(saved) : ['USD', 'EUR', 'GBP', 'JPY', 'INR'];
  }

  getMaxRate(): number {
    if (!this.historicalData) return 0;
    return Math.max(...this.historicalData.map((item: any) => item.rate));
  }
  
  getMinRate(): number {
    if (!this.historicalData) return 0;
    return Math.min(...this.historicalData.map((item: any) => item.rate));
  }
  
  getAverageRate(): number {
    if (!this.historicalData) return 0;
    const sum = this.historicalData.reduce((acc: number, item: any) => acc + item.rate, 0);
    return sum / this.historicalData.length;
  }

  async handleConvert() {
    this.result = '';
    this.detailedResult = '';
    this.error = '';
    this.loading = true;

    try {
      this.parsed = await this.aiService.interpretQuery(this.userQuery);
      const conversion = await this.aiService.getConversion(this.parsed.from, this.parsed.to, this.parsed.amount);
      
      this.currentRate = conversion.rate;
      this.result = `${this.parsed.amount} ${this.parsed.from} = ${conversion.converted.toFixed(2)} ${this.parsed.to}`;
      this.detailedResult = `Exchange rate: 1 ${this.parsed.from} = ${conversion.rate.toFixed(4)} ${this.parsed.to}`;
      
    } catch (err: any) {
      console.error(err);
      this.error = err.message || 'Sorry, something went wrong. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  async convertToMultiple(currency: string) {
    if (!this.userQuery.trim()) return;
    
    this.error = '';
    this.loading = true;

    try {
      // If we haven't parsed yet, parse the query first
      if (!this.parsed) {
        this.parsed = await this.aiService.interpretQuery(this.userQuery);
      }
      
      const conversion = await this.aiService.getConversion(this.parsed.from, currency, this.parsed.amount);
      
      this.currentRate = conversion.rate;
      this.result = `${this.parsed.amount} ${this.parsed.from} = ${conversion.converted.toFixed(2)} ${currency}`;
      this.detailedResult = `Exchange rate: 1 ${this.parsed.from} = ${conversion.rate.toFixed(4)} ${currency}`;
      
    } catch (err: any) {
      console.error(err);
      this.error = err.message || 'Failed to convert currency.';
    } finally {
      this.loading = false;
    }
  }

  // Toggle currency in favorites
  toggleFavorite(currency: string) {
    const index = this.favorites.indexOf(currency);
    if (index > -1) {
      this.favorites.splice(index, 1);
    } else {
      this.favorites.push(currency);
    }
    // Save to localStorage
    localStorage.setItem('favoriteCurrencies', JSON.stringify(this.favorites));
  }

  // Convert to all popular currencies
  async convertToAllPopular() {
    if (!this.userQuery.trim()) return;
    
    this.error = '';
    this.loading = true;

    try {
      if (!this.parsed) {
        this.parsed = await this.aiService.interpretQuery(this.userQuery);
      }
      
      this.multipleResults = [];
      for (const currency of this.popularCurrencies) {
        if (currency !== this.parsed.from) {
          const conversion = await this.aiService.getConversion(this.parsed.from, currency, this.parsed.amount);
          this.multipleResults.push({
            currency: currency,
            converted: conversion.converted,
            rate: conversion.rate,
            flag: this.currencyInfo[currency]?.flag || '',
            name: this.currencyInfo[currency]?.name || currency
          });
        }
      }
      
    } catch (err: any) {
      console.error(err);
      this.error = 'Failed to load multiple conversions';
    } finally {
      this.loading = false;
    }
  }

  // Show historical chart
  // async showHistoricalChart(from: string, to: string) {
  //   try {
  //     this.loading = true;
  //     this.historicalData = await this.aiService.getHistoricalRates(from, to, 30);
  //     this.showChart = true;
  //   } catch (error) {
  //     this.error = 'Could not load historical data';
  //   } finally {
  //     this.loading = false;
  //   }
  // }

  // Calculator methods
  toggleCalculator() {
    this.showCalculator = !this.showCalculator;
    if (this.showCalculator) {
      this.updateCalculator();
    }
  }

  async updateCalculator() {
    try {
      const conversion = await this.aiService.getConversion(this.calculatorFromCurrency, this.calculatorToCurrency, 1);
      this.calculatorToAmount = this.calculatorFromAmount * conversion.rate;
    } catch (error) {
      console.error('Calculator error:', error);
    }
  }

  swapCalculatorCurrencies() {
    const temp = this.calculatorFromCurrency;
    this.calculatorFromCurrency = this.calculatorToCurrency;
    this.calculatorToCurrency = temp;
    this.updateCalculator();
  }

  useExample(example: string) {
    this.userQuery = example;
    this.result = '';
    this.detailedResult = '';
    this.error = '';
    this.parsed = null; // Reset parsed data
    this.multipleResults = []; // Clear multiple results
    this.showChart = false; // Hide chart
  }

  quickConvert(amount: number, from: string, to: string) {
    this.userQuery = `Convert ${amount} ${from} to ${to}`;
    this.handleConvert();
  }

  async showHistoricalChart(from: string, to: string) {
    try {
      this.loading = true;
      this.historicalData = await this.aiService.getHistoricalRates(from, to, 30);
      this.showChart = true;
      
      // Wait for the DOM to update then create chart
      setTimeout(() => {
        this.createChart();
      }, 100);
      
    } catch (error) {
      this.error = 'Could not load historical data';
    } finally {
      this.loading = false;
    }
  }

  createChart() {
    // Destroy existing chart if it exists
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = document.getElementById('historyChart') as HTMLCanvasElement;
    if (!ctx) return;

    const labels = this.historicalData.map((item: any) => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const rates = this.historicalData.map((item: any) => item.rate);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: `${this.parsed?.from} to ${this.parsed?.to}`,
          data: rates,
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#667eea',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#2d3748',
              font: {
                size: 14,
                weight: 'bold'
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#2d3748',
            bodyColor: '#2d3748',
            borderColor: '#e2e8f0',
            borderWidth: 1,
            displayColors: false,
            callbacks: {
              label: function(context : any) {
                return `Rate: ${context.parsed.y.toFixed(4)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(226, 232, 240, 0.5)'
            },
            ticks: {
              color: '#718096',
              maxTicksLimit: 8
            }
          },
          y: {
            grid: {
              color: 'rgba(226, 232, 240, 0.5)'
            },
            ticks: {
              color: '#718096',
              callback: function(value : any) {
                return value.toFixed(3);
              }
            }
          }
        }
      }
    });
  }

  // Update the method that closes the chart to also destroy it
  closeChart() {
    this.showChart = false;
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

}