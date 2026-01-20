// Chart.js API Integration for Economic Data
// Handles fetching data from various APIs and creating animated charts

// API Configuration
const API_CONFIG = {
    // Exchange Rates - Using exchangerate-api.com (free tier)
    exchangeRate: {
        baseUrl: 'https://api.exchangerate-api.com/v4/latest/DKK',
        fallback: 'https://api.fixer.io/latest?base=DKK'
    },
    // FRED API for US data (requires API key, but we'll use public endpoints where possible)
    fred: {
        baseUrl: 'https://api.stlouisfed.org/fred/series/observations',
        // Using alternative free API
        alternative: 'https://api.stlouisfed.org/fred/'
    },
    // ECB API for European data
    ecb: {
        exchangeRates: 'https://api.exchangerate-api.com/v4/latest/EUR',
        interestRates: 'https://sdw.ecb.europa.eu/quickviewexport.do?SERIES_KEY=IRS.M.DK.L.L40.CI.0000.EUR.N.Z'
    },
    // World Bank API for GDP data
    worldBank: {
        baseUrl: 'https://api.worldbank.org/v2/country',
        indicators: {
            gdp: 'NY.GDP.MKTP.CD', // GDP in current USD
            gdpPerCapita: 'NY.GDP.PCAP.CD'
        }
    }
};

// Chart.js default configuration
const chartConfig = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
        duration: 2000,
        easing: 'easeInOutQuart'
    },
    plugins: {
        legend: {
            display: true,
            position: 'top',
            labels: {
                font: {
                    size: 12,
                    family: 'Inter, sans-serif'
                },
                padding: 15
            }
        },
        tooltip: {
            enabled: true,
            backgroundColor: 'rgba(0,0,0,0.8)',
            titleFont: {
                size: 14,
                weight: 'bold'
            },
            bodyFont: {
                size: 12
            },
            padding: 12,
            cornerRadius: 6
        }
    },
    scales: {
        x: {
            grid: {
                display: true,
                color: 'rgba(0,0,0,0.05)'
            },
            ticks: {
                font: {
                    size: 11,
                    family: 'Inter, sans-serif'
                }
            }
        },
        y: {
            grid: {
                display: true,
                color: 'rgba(0,0,0,0.05)'
            },
            ticks: {
                font: {
                    size: 11,
                    family: 'Inter, sans-serif'
                },
                callback: function(value) {
                    return value.toLocaleString('da-DK');
                }
            }
        }
    }
};

// Fetch exchange rates
async function fetchExchangeRates(days = 365) {
    try {
        // Using exchangerate-api.com which provides historical data
        const response = await fetch(API_CONFIG.exchangeRate.baseUrl);
        const data = await response.json();
        
        // Get current rates
        const rates = {
            EUR: 1 / data.rates.EUR, // DKK per EUR
            USD: 1 / data.rates.USD  // DKK per USD
        };
        
        // For historical data, we'll use a simulation based on current trend
        // In production, you'd use a proper historical API
        const historical = generateHistoricalExchangeRates(rates, days);
        
        return historical;
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        return generateMockExchangeRates(days);
    }
}

// Generate historical exchange rate data (simulated)
function generateHistoricalExchangeRates(currentRates, days) {
    const data = {
        labels: [],
        EUR: [],
        USD: []
    };
    
    const today = new Date();
    let eurRate = currentRates.EUR;
    let usdRate = currentRates.USD;
    
    // Generate data backwards from today
    for (let i = days; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        // Add some realistic variation (±2% daily)
        const eurVariation = (Math.random() - 0.5) * 0.02;
        const usdVariation = (Math.random() - 0.5) * 0.02;
        
        eurRate *= (1 + eurVariation);
        usdRate *= (1 + usdVariation);
        
        // Keep rates within reasonable bounds
        eurRate = Math.max(7.0, Math.min(7.8, eurRate));
        usdRate = Math.max(6.0, Math.min(7.5, usdRate));
        
        if (i % 7 === 0) { // Weekly data points
            data.labels.push(date.toLocaleDateString('da-DK', { month: 'short', day: 'numeric' }));
            data.EUR.push(Number(eurRate.toFixed(4)));
            data.USD.push(Number(usdRate.toFixed(4)));
        }
    }
    
    return data;
}

// Generate mock exchange rates if API fails
function generateMockExchangeRates(days) {
    const data = {
        labels: [],
        EUR: [],
        USD: []
    };
    
    const today = new Date();
    let eurRate = 7.45;
    let usdRate = 6.85;
    
    for (let i = days; i >= 0; i -= 7) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        eurRate += (Math.random() - 0.5) * 0.05;
        usdRate += (Math.random() - 0.5) * 0.05;
        
        eurRate = Math.max(7.0, Math.min(7.8, eurRate));
        usdRate = Math.max(6.0, Math.min(7.5, usdRate));
        
        data.labels.push(date.toLocaleDateString('da-DK', { month: 'short', day: 'numeric' }));
        data.EUR.push(Number(eurRate.toFixed(4)));
        data.USD.push(Number(usdRate.toFixed(4)));
    }
    
    return data;
}

// Fetch interest rates
async function fetchInterestRates(country = 'DK', days = 365) {
    try {
        // Simulated interest rate data
        // In production, use ECB API or Danish National Bank API
        // Days parameter: 730 = 2 years, 1825 = 5 years, 3650 = 10 years
        return generateInterestRates(country, days);
    } catch (error) {
        console.error('Error fetching interest rates:', error);
        return generateInterestRates(country, days);
    }
}

// Generate interest rate data with historical negative rates
function generateInterestRates(country, days) {
    const data = {
        labels: [],
        rates: []
    };
    
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);
    
    // Historical rate simulation for Denmark
    // Starting from 2012 when negative rates began
    let rate = country === 'DK' ? -0.5 : 0.0; // Start with negative rates (2012-2022 period)
    
    // Calculate years back from today
    const yearsBack = days / 365;
    const historicalStartYear = today.getFullYear() - yearsBack;
    
    // Set initial rate based on historical context
    if (historicalStartYear < 2015) {
        rate = country === 'DK' ? 2.5 : 4.0; // Pre-negative rate era
    } else if (historicalStartYear < 2020) {
        rate = country === 'DK' ? -0.5 : 0.0; // Negative rate period
    } else if (historicalStartYear < 2022) {
        rate = country === 'DK' ? -0.75 : -0.5; // Most negative period
    } else {
        rate = country === 'DK' ? 2.0 : 3.0; // Recent positive rates
    }
    
    for (let i = days; i >= 0; i -= 7) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const year = date.getFullYear();
        
        // Historical context adjustments
        if (year < 2015) {
            // Pre-2015: Positive rates 0.5-4%
            rate += (Math.random() - 0.5) * 0.15;
            rate = Math.max(0.5, Math.min(4.0, rate));
        } else if (year >= 2015 && year < 2019) {
            // 2015-2019: Negative rates period
            rate += (Math.random() - 0.5) * 0.1;
            rate = Math.max(-0.75, Math.min(0.25, rate));
        } else if (year >= 2019 && year < 2022) {
            // 2019-2022: Most negative period
            rate += (Math.random() - 0.5) * 0.08;
            rate = Math.max(-0.90, Math.min(0.0, rate));
        } else {
            // 2022+: Rising rates
            rate += (Math.random() - 0.5) * 0.2;
            rate = Math.max(-0.5, Math.min(4.5, rate));
        }
        
        // Small random variation
        rate += (Math.random() - 0.5) * 0.05;
        
        // Include year in label format: "22. jan. 2015"
        data.labels.push(date.toLocaleDateString('da-DK', { month: 'short', day: 'numeric', year: 'numeric' }));
        data.rates.push(Number(rate.toFixed(2)));
    }
    
    return data;
}

// Fetch GDP data from World Bank
async function fetchGDPData(countries = ['DNK', 'DEU', 'SWE', 'NOR', 'USA'], years = 20) {
    try {
        const endYear = new Date().getFullYear();
        const startYear = endYear - years;
        
        const promises = countries.map(async (countryCode) => {
            const url = `${API_CONFIG.worldBank.baseUrl}/${countryCode}/indicator/${API_CONFIG.worldBank.indicators.gdp}?date=${startYear}:${endYear}&format=json`;
            
            try {
                const response = await fetch(url);
                const data = await response.json();
                
                if (data && data[1]) {
                    return {
                        country: countryCode,
                        data: data[1].reverse() // Most recent first
                    };
                }
            } catch (error) {
                console.error(`Error fetching GDP for ${countryCode}:`, error);
            }
            
            return null;
        });
        
        const results = await Promise.all(promises);
        
        // Process results
        const processedData = {
            labels: [],
            datasets: []
        };
        
        // Get all available years
        const allYears = new Set();
        results.forEach(result => {
            if (result && result.data) {
                result.data.forEach(item => {
                    if (item.date) allYears.add(item.date);
                });
            }
        });
        
        const sortedYears = Array.from(allYears).sort();
        processedData.labels = sortedYears;
        
        // Country names mapping
        const countryNames = {
            'DNK': 'Danmark',
            'DEU': 'Tyskland',
            'SWE': 'Sverige',
            'NOR': 'Norge',
            'USA': 'USA',
            'GBR': 'Storbritannien',
            'FRA': 'Frankrig',
            'JPN': 'Japan',
            'CHN': 'Kina',
            'IND': 'Indien',
            'RUS': 'Rusland',
            'ITA': 'Italien',
            'ESP': 'Spanien',
            'NLD': 'Holland',
            'POL': 'Polen'
        };
        
        // Colors for countries
        const colors = [
            { border: 'rgb(75, 192, 192)', background: 'rgba(75, 192, 192, 0.2)' },
            { border: 'rgb(255, 99, 132)', background: 'rgba(255, 99, 132, 0.2)' },
            { border: 'rgb(54, 162, 235)', background: 'rgba(54, 162, 235, 0.2)' },
            { border: 'rgb(255, 206, 86)', background: 'rgba(255, 206, 86, 0.2)' },
            { border: 'rgb(153, 102, 255)', background: 'rgba(153, 102, 255, 0.2)' },
            { border: 'rgb(255, 159, 64)', background: 'rgba(255, 159, 64, 0.2)' },
            { border: 'rgb(199, 199, 199)', background: 'rgba(199, 199, 199, 0.2)' },
            { border: 'rgb(83, 102, 255)', background: 'rgba(83, 102, 255, 0.2)' },
            { border: 'rgb(255, 99, 255)', background: 'rgba(255, 99, 255, 0.2)' },
            { border: 'rgb(99, 255, 132)', background: 'rgba(99, 255, 132, 0.2)' }
        ];
        
        results.forEach((result, index) => {
            if (result && result.data) {
                const countryData = sortedYears.map(year => {
                    const item = result.data.find(d => d.date === year);
                    return item && item.value ? item.value / 1000000000 : null; // Convert to billions
                });
                
                processedData.datasets.push({
                    label: countryNames[result.country] || result.country,
                    data: countryData,
                    borderColor: colors[index % colors.length].border,
                    backgroundColor: colors[index % colors.length].background,
                    tension: 0.4,
                    fill: false
                });
            }
        });
        
        return processedData;
    } catch (error) {
        console.error('Error fetching GDP data:', error);
        return generateMockGDPData(countries, years);
    }
}

// Generate mock GDP data
function generateMockGDPData(countries, years) {
    const data = {
        labels: [],
        datasets: []
    };
    
    const endYear = new Date().getFullYear();
    const startYear = endYear - years;
    
    // Generate year labels
    for (let year = startYear; year <= endYear; year++) {
        data.labels.push(year.toString());
    }
    
    // Country base GDPs (in billions USD)
    const baseGDP = {
        'DNK': 400,
        'DEU': 4000,
        'SWE': 600,
        'NOR': 400,
        'USA': 25000,
        'JPN': 4500,
        'CHN': 14000,
        'IND': 3200,
        'RUS': 1800,
        'GBR': 3000,
        'FRA': 2800,
        'ITA': 2000,
        'ESP': 1400,
        'NLD': 900,
        'POL': 600
    };
    
    const countryNames = {
        'DNK': 'Danmark',
        'DEU': 'Tyskland',
        'SWE': 'Sverige',
        'NOR': 'Norge',
        'USA': 'USA',
        'JPN': 'Japan',
        'CHN': 'Kina',
        'IND': 'Indien',
        'RUS': 'Rusland',
        'GBR': 'Storbritannien',
        'FRA': 'Frankrig',
        'ITA': 'Italien',
        'ESP': 'Spanien',
        'NLD': 'Holland',
        'POL': 'Polen'
    };
    
    const colors = [
        { border: 'rgb(75, 192, 192)', background: 'rgba(75, 192, 192, 0.2)' },
        { border: 'rgb(255, 99, 132)', background: 'rgba(255, 99, 132, 0.2)' },
        { border: 'rgb(54, 162, 235)', background: 'rgba(54, 162, 235, 0.2)' },
        { border: 'rgb(255, 206, 86)', background: 'rgba(255, 206, 86, 0.2)' },
        { border: 'rgb(153, 102, 255)', background: 'rgba(153, 102, 255, 0.2)' },
        { border: 'rgb(199, 199, 199)', background: 'rgba(199, 199, 199, 0.2)' },
        { border: 'rgb(83, 102, 255)', background: 'rgba(83, 102, 255, 0.2)' },
        { border: 'rgb(255, 99, 255)', background: 'rgba(255, 99, 255, 0.2)' },
        { border: 'rgb(99, 255, 132)', background: 'rgba(99, 255, 132, 0.2)' },
        { border: 'rgb(255, 159, 64)', background: 'rgba(255, 159, 64, 0.2)' }
    ];
    
    countries.forEach((country, index) => {
        const base = baseGDP[country] || 500;
        const countryData = data.labels.map((year, i) => {
            // Simulate growth
            const growth = 1.02; // 2% annual growth
            return base * Math.pow(growth, i) * (1 + (Math.random() - 0.5) * 0.05);
        });
        
        data.datasets.push({
            label: countryNames[country] || country,
            data: countryData,
            borderColor: colors[index % colors.length].border,
            backgroundColor: colors[index % colors.length].background,
            tension: 0.4,
            fill: false
        });
    });
    
    return data;
}

// Fetch Balance of Payments data for Denmark
async function fetchBalanceOfPayments(years = 20) {
    try {
        // In production, use Danmarks Statistik API
        // For now, generate realistic mock data showing improvement
        return generateBalanceOfPayments(years);
    } catch (error) {
        console.error('Error fetching balance of payments:', error);
        return generateBalanceOfPayments(years);
    }
}

// Generate Balance of Payments data showing improvement from 1970
function generateBalanceOfPayments(years) {
    const data = {
        labels: [],
        currentAccount: [],
        overall: []
    };
    
    const endYear = new Date().getFullYear();
    const startYear = endYear - years;
    
    // Historical simulation starting from 1970
    // Denmark had deficits in 1970s-1980s, then improved
    let currentAccount = -15; // 1970 starting deficit (in billion DKK adjusted)
    
    for (let year = startYear; year <= endYear; year++) {
        // Historical context
        if (year < 1980) {
            // 1970s: Moderate deficits
            currentAccount = -15 + (year - startYear) * 0.3 + (Math.random() - 0.5) * 5;
        } else if (year < 1990) {
            // 1980s: Larger deficits due to oil crisis recovery
            currentAccount = -25 + (year - 1980) * 1.5 + (Math.random() - 0.5) * 8;
        } else if (year < 2000) {
            // 1990s: Improvement begins
            currentAccount = -5 + (year - 1990) * 1.2 + (Math.random() - 0.5) * 6;
        } else if (year < 2010) {
            // 2000s: Continued improvement, occasional surpluses
            currentAccount = 10 + (year - 2000) * 0.5 + (Math.random() - 0.5) * 10;
        } else if (year < 2020) {
            // 2010s: Mostly positive, strong surpluses
            currentAccount = 25 + (year - 2010) * 1.0 + (Math.random() - 0.5) * 8;
        } else {
            // 2020+: Strong surpluses
            currentAccount = 40 + (year - 2020) * 0.8 + (Math.random() - 0.5) * 6;
        }
        
        // Overall balance (similar but slightly different)
        const overall = currentAccount + (Math.random() - 0.5) * 5;
        
        data.labels.push(year.toString());
        data.currentAccount.push(Number(currentAccount.toFixed(1)));
        data.overall.push(Number(overall.toFixed(1)));
    }
    
    return data;
}

// Fetch National Accounts data for Denmark
async function fetchNationalAccounts(years = 20) {
    try {
        // In production, use Danmarks Statistik API
        return generateNationalAccounts(years);
    } catch (error) {
        console.error('Error fetching national accounts:', error);
        return generateNationalAccounts(years);
    }
}

// Generate National Accounts data
function generateNationalAccounts(years) {
    const data = {
        labels: [],
        bnp: [],
        bnpPerCapita: [],
        export: [],
        import: [],
        consumption: [],
        investment: []
    };
    
    const endYear = new Date().getFullYear();
    const startYear = endYear - years;
    
    let bnp = 1800; // Starting in billions DKK
    let exportVal = 900;
    let importVal = 850;
    let consumption = 1200;
    let investment = 400;
    
    for (let year = startYear; year <= endYear; year++) {
        // Growth
        bnp *= 1.02;
        exportVal *= 1.025;
        importVal *= 1.022;
        consumption *= 1.02;
        investment *= 1.03;
        
        data.labels.push(year.toString());
        data.bnp.push(Number(bnp.toFixed(0)));
        data.bnpPerCapita.push(Number((bnp * 1000 / 5.8).toFixed(0))); // Approx population
        data.export.push(Number(exportVal.toFixed(0)));
        data.import.push(Number(importVal.toFixed(0)));
        data.consumption.push(Number(consumption.toFixed(0)));
        data.investment.push(Number(investment.toFixed(0)));
    }
    
    return data;
}

// Create Exchange Rate Chart
function createExchangeRateChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    fetchExchangeRates(365).then(data => {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'DKK/EUR',
                        data: data.EUR,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: 'DKK/USD',
                        data: data.USD,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        tension: 0.4,
                        fill: false
                    }
                ]
            },
            options: {
                ...chartConfig,
                plugins: {
                    ...chartConfig.plugins,
                    title: {
                        display: true,
                        text: 'Udvikling i valutakurser (DKK)',
                        font: {
                            size: 16,
                            weight: 'bold',
                            family: 'Inter, sans-serif'
                        },
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    }
                },
                scales: {
                    ...chartConfig.scales,
                    y: {
                        ...chartConfig.scales.y,
                        title: {
                            display: true,
                            text: 'Kurs (DKK pr. enhed)',
                            font: {
                                size: 12,
                                weight: 'bold',
                                family: 'Inter, sans-serif'
                            }
                        }
                    },
                    x: {
                        ...chartConfig.scales.x,
                        title: {
                            display: true,
                            text: 'Dato',
                            font: {
                                size: 12,
                                weight: 'bold',
                                family: 'Inter, sans-serif'
                            }
                        }
                    }
                }
            }
        });
    });
}

// Create Interest Rate Chart with negative rates support
function createInterestRateChart(canvasId, country = 'DK') {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    // Fetch more years to show negative rate period (10 years = ~3650 days)
    fetchInterestRates(country, 3650).then(data => {
        // Find min and max for proper scaling
        const minRate = Math.min(...data.rates);
        const maxRate = Math.max(...data.rates);
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: country === 'DK' ? 'Danske renter (%)' : 'ECB renter (%)',
                        data: data.rates,
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        tension: 0.4,
                        fill: false,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                ...chartConfig,
                plugins: {
                    ...chartConfig.plugins,
                    title: {
                        display: true,
                        text: country === 'DK' ? 'Udvikling i danske renter' : 'Udvikling i ECB renter',
                        font: {
                            size: 16,
                            weight: 'bold',
                            family: 'Inter, sans-serif'
                        },
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    }
                },
                scales: {
                    ...chartConfig.scales,
                    y: {
                        ...chartConfig.scales.y,
                        min: Math.max(-2, Math.floor(minRate) - 0.5),
                        max: Math.min(5, Math.ceil(maxRate) + 0.5),
                        ticks: {
                            ...chartConfig.scales.y.ticks,
                            stepSize: 0.5,
                            callback: function(value) {
                                // Round to 0.5 increments and format
                                const rounded = Math.round(value * 2) / 2;
                                return rounded.toFixed(1) + '%';
                            }
                        },
                        title: {
                            display: true,
                            text: 'Rente (%)',
                            font: {
                                size: 12,
                                weight: 'bold',
                                family: 'Inter, sans-serif'
                            }
                        }
                    },
                    x: {
                        ...chartConfig.scales.x,
                        title: {
                            display: true,
                            text: 'Dato',
                            font: {
                                size: 12,
                                weight: 'bold',
                                family: 'Inter, sans-serif'
                            }
                        }
                    }
                }
            }
        });
    });
}

// Fetch GDP per capita data
async function fetchGDPPerCapitaData(countries = ['DNK', 'DEU', 'SWE', 'NOR', 'USA', 'JPN', 'CHN', 'IND'], years = 30) {
    try {
        const endYear = new Date().getFullYear();
        const startYear = endYear - years;
        
        const promises = countries.map(async (countryCode) => {
            const url = `${API_CONFIG.worldBank.baseUrl}/${countryCode}/indicator/${API_CONFIG.worldBank.indicators.gdpPerCapita}?date=${startYear}:${endYear}&format=json`;
            
            try {
                const response = await fetch(url);
                const data = await response.json();
                
                if (data && data[1]) {
                    return {
                        country: countryCode,
                        data: data[1].reverse()
                    };
                }
            } catch (error) {
                console.error(`Error fetching GDP per capita for ${countryCode}:`, error);
            }
            
            return null;
        });
        
        const results = await Promise.all(promises);
        
        const processedData = {
            labels: [],
            datasets: []
        };
        
        const allYears = new Set();
        results.forEach(result => {
            if (result && result.data) {
                result.data.forEach(item => {
                    if (item.date) allYears.add(item.date);
                });
            }
        });
        
        const sortedYears = Array.from(allYears).sort();
        processedData.labels = sortedYears;
        
        const countryNames = {
            'DNK': 'Danmark', 'DEU': 'Tyskland', 'SWE': 'Sverige', 'NOR': 'Norge', 'USA': 'USA',
            'JPN': 'Japan', 'CHN': 'Kina', 'IND': 'Indien', 'RUS': 'Rusland', 'GBR': 'Storbritannien',
            'FRA': 'Frankrig', 'ITA': 'Italien', 'ESP': 'Spanien', 'NLD': 'Holland', 'POL': 'Polen'
        };
        
        const colors = [
            { border: 'rgb(75, 192, 192)', background: 'rgba(75, 192, 192, 0.2)' },
            { border: 'rgb(255, 99, 132)', background: 'rgba(255, 99, 132, 0.2)' },
            { border: 'rgb(54, 162, 235)', background: 'rgba(54, 162, 235, 0.2)' },
            { border: 'rgb(255, 206, 86)', background: 'rgba(255, 206, 86, 0.2)' },
            { border: 'rgb(153, 102, 255)', background: 'rgba(153, 102, 255, 0.2)' },
            { border: 'rgb(199, 199, 199)', background: 'rgba(199, 199, 199, 0.2)' },
            { border: 'rgb(83, 102, 255)', background: 'rgba(83, 102, 255, 0.2)' },
            { border: 'rgb(255, 99, 255)', background: 'rgba(255, 99, 255, 0.2)' }
        ];
        
        results.forEach((result, index) => {
            if (result && result.data) {
                const countryData = sortedYears.map(year => {
                    const item = result.data.find(d => d.date === year);
                    return item && item.value ? item.value : null;
                });
                
                processedData.datasets.push({
                    label: countryNames[result.country] || result.country,
                    data: countryData,
                    borderColor: colors[index % colors.length].border,
                    backgroundColor: colors[index % colors.length].background,
                    tension: 0.4,
                    fill: false
                });
            }
        });
        
        return processedData;
    } catch (error) {
        console.error('Error fetching GDP per capita data:', error);
        return generateMockGDPPerCapitaData(countries, years);
    }
}

// Generate mock GDP per capita data
function generateMockGDPPerCapitaData(countries, years) {
    const data = {
        labels: [],
        datasets: []
    };
    
    const endYear = new Date().getFullYear();
    const startYear = endYear - years;
    
    for (let year = startYear; year <= endYear; year++) {
        data.labels.push(year.toString());
    }
    
    const baseGDPPerCapita = {
        'DNK': 65000, 'DEU': 50000, 'SWE': 55000, 'NOR': 75000, 'USA': 65000,
        'JPN': 40000, 'CHN': 12000, 'IND': 2000, 'RUS': 11000, 'GBR': 45000
    };
    
    const countryNames = {
        'DNK': 'Danmark', 'DEU': 'Tyskland', 'SWE': 'Sverige', 'NOR': 'Norge', 'USA': 'USA',
        'JPN': 'Japan', 'CHN': 'Kina', 'IND': 'Indien', 'RUS': 'Rusland', 'GBR': 'Storbritannien'
    };
    
    const colors = [
        { border: 'rgb(75, 192, 192)', background: 'rgba(75, 192, 192, 0.2)' },
        { border: 'rgb(255, 99, 132)', background: 'rgba(255, 99, 132, 0.2)' },
        { border: 'rgb(54, 162, 235)', background: 'rgba(54, 162, 235, 0.2)' },
        { border: 'rgb(255, 206, 86)', background: 'rgba(255, 206, 86, 0.2)' },
        { border: 'rgb(153, 102, 255)', background: 'rgba(153, 102, 255, 0.2)' },
        { border: 'rgb(199, 199, 199)', background: 'rgba(199, 199, 199, 0.2)' },
        { border: 'rgb(83, 102, 255)', background: 'rgba(83, 102, 255, 0.2)' },
        { border: 'rgb(255, 99, 255)', background: 'rgba(255, 99, 255, 0.2)' }
    ];
    
    countries.forEach((country, index) => {
        const base = baseGDPPerCapita[country] || 30000;
        const countryData = data.labels.map((year, i) => {
            const growth = country === 'CHN' ? 1.08 : country === 'IND' ? 1.06 : 1.02;
            return base * Math.pow(growth, i) * (1 + (Math.random() - 0.5) * 0.03);
        });
        
        data.datasets.push({
            label: countryNames[country] || country,
            data: countryData,
            borderColor: colors[index % colors.length].border,
            backgroundColor: colors[index % colors.length].background,
            tension: 0.4,
            fill: false
        });
    });
    
    return data;
}

// Fetch unemployment and inflation data
async function fetchUnemploymentInflationData(country = 'DNK', years = 40) {
    try {
        // In production, use OECD API or Danmarks Statistik API
        return generateUnemploymentInflationData(country, years);
    } catch (error) {
        console.error('Error fetching unemployment/inflation data:', error);
        return generateUnemploymentInflationData(country, years);
    }
}

// Country-specific base values
const countryBaseValues = {
    'DNK': { unemploymentBase: 5.0, inflationBase: 2.0 },
    'DEU': { unemploymentBase: 5.5, inflationBase: 2.2 },
    'SWE': { unemploymentBase: 6.0, inflationBase: 2.1 },
    'NOR': { unemploymentBase: 4.0, inflationBase: 2.3 },
    'USA': { unemploymentBase: 5.5, inflationBase: 2.5 },
    'FRA': { unemploymentBase: 8.0, inflationBase: 2.0 },
    'GBR': { unemploymentBase: 5.0, inflationBase: 2.5 }
};

// Generate unemployment and inflation data
function generateUnemploymentInflationData(country, years) {
    const data = {
        labels: [],
        unemployment: [],
        inflation: []
    };
    
    const endYear = new Date().getFullYear();
    const startYear = endYear - years;
    
    const baseValues = countryBaseValues[country] || { unemploymentBase: 5.5, inflationBase: 2.0 };
    let unemployment = baseValues.unemploymentBase;
    let inflation = baseValues.inflationBase;
    
    for (let year = startYear; year <= endYear; year++) {
        // Historical context
        if (year < 1990) {
            unemployment = (baseValues.unemploymentBase + 3.0) + (year - startYear) * -0.1;
            inflation = (baseValues.inflationBase + 3.0) + (year - startYear) * -0.05;
        } else if (year < 2000) {
            unemployment = (baseValues.unemploymentBase + 1.0) + (year - 1990) * -0.15;
            inflation = baseValues.inflationBase + 0.5 + (year - 1990) * 0.05;
        } else if (year < 2010) {
            unemployment = baseValues.unemploymentBase - 0.5 + (year - 2000) * 0.05;
            inflation = baseValues.inflationBase - 0.5 + (year - 2000) * 0.02;
        } else if (year < 2020) {
            unemployment = baseValues.unemploymentBase + 0.5 + (year - 2010) * -0.1;
            inflation = baseValues.inflationBase - 0.5 + (year - 2010) * 0.03;
        } else {
            // More realistic inflation: spike in 2021-2022, then declining
            unemployment = baseValues.unemploymentBase - 0.5 + (year - 2020) * -0.1;
            if (year === 2020) {
                inflation = 0.3; // Low inflation in 2020
            } else if (year === 2021) {
                inflation = 1.9; // Starting to rise
            } else if (year === 2022) {
                inflation = 7.7; // Peak inflation from energy crisis
            } else if (year === 2023) {
                inflation = 3.4; // Declining
            } else {
                // 2024 onwards: stabilize around 2-3%
                inflation = 2.5 - (year - 2024) * 0.1; // Gradually back to target
                if (inflation < baseValues.inflationBase) inflation = baseValues.inflationBase;
                // Ensure future inflation stays reasonable (not above 4%)
                if (inflation > 4.0) inflation = 4.0;
            }
        }
        
        // Add random variation (smaller for recent years to keep inflation realistic)
        const randomUnemployment = (Math.random() - 0.5) * 0.5;
        const randomInflation = year >= 2020 ? (Math.random() - 0.5) * 0.2 : (Math.random() - 0.5) * 0.3;
        
        unemployment += randomUnemployment;
        inflation += randomInflation;
        
        unemployment = Math.max(2.0, Math.min(12.0, unemployment));
        // Clamp inflation more strictly, especially for future years
        const maxInflation = year >= 2024 ? 4.0 : (year >= 2022 ? 8.0 : 10.0);
        inflation = Math.max(-0.5, Math.min(maxInflation, inflation));
        
        data.labels.push(year.toString());
        data.unemployment.push(Number(unemployment.toFixed(1)));
        data.inflation.push(Number(inflation.toFixed(1)));
    }
    
    return data;
}

// Create GDP Comparison Chart
function createGDPChart(canvasId, countries = ['DNK', 'DEU', 'SWE', 'NOR']) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    fetchGDPData(countries, 30).then(data => {
        new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                ...chartConfig,
                plugins: {
                    ...chartConfig.plugins,
                    title: {
                        display: true,
                        text: 'BNP-udvikling for forskellige lande',
                        font: {
                            size: 16,
                            weight: 'bold',
                            family: 'Inter, sans-serif'
                        },
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    }
                },
                scales: {
                    ...chartConfig.scales,
                    y: {
                        ...chartConfig.scales.y,
                        title: {
                            display: true,
                            text: 'BNP (mia. USD)',
                            font: {
                                size: 12,
                                weight: 'bold',
                                family: 'Inter, sans-serif'
                            }
                        }
                    },
                    x: {
                        ...chartConfig.scales.x,
                        title: {
                            display: true,
                            text: 'År',
                            font: {
                                size: 12,
                                weight: 'bold',
                                family: 'Inter, sans-serif'
                            }
                        }
                    }
                }
            }
        });
    });
}

// Create GDP Indexed Chart (base year = 100)
function createGDPIndexedChart(canvasId, countries = ['DNK', 'DEU', 'SWE', 'NOR', 'USA', 'JPN', 'CHN', 'IND']) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    fetchGDPData(countries, 30).then(data => {
        // Convert to indexed (base year = first year, value = 100)
        const indexedData = {
            labels: data.labels,
            datasets: data.datasets.map(dataset => {
                const firstValue = dataset.data.find(v => v !== null);
                const firstIndex = dataset.data.findIndex(v => v !== null);
                
                const indexedValues = dataset.data.map((value, index) => {
                    if (value === null || firstValue === null || firstValue === 0) return null;
                    // Calculate index: (current value / base value) * 100
                    return (value / firstValue) * 100;
                });
                
                return {
                    ...dataset,
                    data: indexedValues
                };
            })
        };
        
        new Chart(ctx, {
            type: 'line',
            data: indexedData,
            options: {
                ...chartConfig,
                plugins: {
                    ...chartConfig.plugins,
                    title: {
                        display: true,
                        text: 'BNP-udvikling indekseret (basisår = 100)',
                        font: {
                            size: 16,
                            weight: 'bold',
                            family: 'Inter, sans-serif'
                        },
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    }
                },
                scales: {
                    ...chartConfig.scales,
                    y: {
                        ...chartConfig.scales.y,
                        title: {
                            display: true,
                            text: 'Indeks (basisår = 100)',
                            font: {
                                size: 12,
                                weight: 'bold',
                                family: 'Inter, sans-serif'
                            }
                        },
                        ticks: {
                            ...chartConfig.scales.y.ticks,
                            callback: function(value) {
                                return value.toFixed(0);
                            }
                        }
                    },
                    x: {
                        ...chartConfig.scales.x,
                        title: {
                            display: true,
                            text: 'År',
                            font: {
                                size: 12,
                                weight: 'bold',
                                family: 'Inter, sans-serif'
                            }
                        }
                    }
                }
            }
        });
    });
}

// Create GDP Per Capita Chart
function createGDPPerCapitaChart(canvasId, countries = ['DNK', 'DEU', 'SWE', 'NOR', 'USA', 'JPN', 'CHN', 'IND']) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    fetchGDPPerCapitaData(countries, 30).then(data => {
        new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                ...chartConfig,
                plugins: {
                    ...chartConfig.plugins,
                    title: {
                        display: true,
                        text: 'BNP pr. indbygger for forskellige lande',
                        font: {
                            size: 16,
                            weight: 'bold',
                            family: 'Inter, sans-serif'
                        },
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    }
                },
                scales: {
                    ...chartConfig.scales,
                    y: {
                        ...chartConfig.scales.y,
                        title: {
                            display: true,
                            text: 'BNP pr. indbygger (USD)',
                            font: {
                                size: 12,
                                weight: 'bold',
                                family: 'Inter, sans-serif'
                            }
                        },
                        ticks: {
                            ...chartConfig.scales.y.ticks,
                            callback: function(value) {
                                return value.toLocaleString('da-DK');
                            }
                        }
                    },
                    x: {
                        ...chartConfig.scales.x,
                        title: {
                            display: true,
                            text: 'År',
                            font: {
                                size: 12,
                                weight: 'bold',
                                family: 'Inter, sans-serif'
                            }
                        }
                    }
                }
            }
        });
    });
}

// Create Unemployment and Inflation Chart
function createUnemploymentInflationChart(canvasId, country = 'DNK') {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    fetchUnemploymentInflationData(country, 40).then(data => {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Ledighed (%)',
                        data: data.unemployment,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        tension: 0.4,
                        fill: false,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Inflation (%)',
                        data: data.inflation,
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        tension: 0.4,
                        fill: false,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                ...chartConfig,
                plugins: {
                    ...chartConfig.plugins,
                    title: {
                        display: true,
                        text: 'Ledighed og inflation i Danmark',
                        font: {
                            size: 16,
                            weight: 'bold',
                            family: 'Inter, sans-serif'
                        },
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    }
                },
                scales: {
                    ...chartConfig.scales,
                    y: {
                        ...chartConfig.scales.y,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Ledighed (%)',
                            font: {
                                size: 12,
                                weight: 'bold',
                                family: 'Inter, sans-serif'
                            }
                        },
                        ticks: {
                            ...chartConfig.scales.y.ticks,
                            callback: function(value) {
                                return value.toFixed(1) + '%';
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        },
                        title: {
                            display: true,
                            text: 'Inflation (%)',
                            font: {
                                size: 12,
                                weight: 'bold',
                                family: 'Inter, sans-serif'
                            }
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(1) + '%';
                            }
                        }
                    },
                    x: {
                        ...chartConfig.scales.x,
                        title: {
                            display: true,
                            text: 'År',
                            font: {
                                size: 12,
                                weight: 'bold',
                                family: 'Inter, sans-serif'
                            }
                        }
                    }
                }
            }
        });
    });
}

// Create Multi-Country Unemployment and Inflation Chart
function createMultiCountryUnemploymentInflationChart(canvasId, countries = ['DNK', 'DEU', 'SWE', 'NOR']) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    // Color scheme for countries
    // DK uses same color for both unemployment and inflation
    const countryColors = {
        'DNK': { unemployment: 'rgb(255, 99, 132)', inflation: 'rgb(255, 99, 132)' },
        'DEU': { unemployment: 'rgb(54, 162, 235)', inflation: 'rgb(108, 189, 255)' },
        'SWE': { unemployment: 'rgb(255, 206, 86)', inflation: 'rgb(255, 223, 138)' },
        'NOR': { unemployment: 'rgb(75, 192, 192)', inflation: 'rgb(136, 219, 219)' },
        'USA': { unemployment: 'rgb(153, 102, 255)', inflation: 'rgb(186, 153, 255)' },
        'FRA': { unemployment: 'rgb(255, 159, 64)', inflation: 'rgb(255, 192, 128)' },
        'GBR': { unemployment: 'rgb(199, 199, 199)', inflation: 'rgb(230, 230, 230)' }
    };
    
    // Country names for display
    const countryNames = {
        'DNK': 'Danmark',
        'DEU': 'Tyskland',
        'SWE': 'Sverige',
        'NOR': 'Norge',
        'USA': 'USA',
        'FRA': 'Frankrig',
        'GBR': 'Storbritannien'
    };
    
    // Fetch data for all countries
    Promise.all(countries.map(country => fetchUnemploymentInflationData(country, 40)))
        .then(dataArray => {
            // Use labels from first country (assuming all have same years)
            const labels = dataArray[0].labels;
            
            // Build datasets
            const datasets = [];
            
            // Helper function to convert rgb to rgba
            const rgbToRgba = (rgb, alpha = 0.1) => {
                const match = rgb.match(/\d+/g);
                if (match && match.length >= 3) {
                    return `rgba(${match[0]}, ${match[1]}, ${match[2]}, ${alpha})`;
                }
                return rgb;
            };
            
            // Add unemployment datasets
            countries.forEach((country, index) => {
                const data = dataArray[index];
                const colors = countryColors[country] || { unemployment: 'rgb(128, 128, 128)', inflation: 'rgb(128, 128, 128)' };
                // Hide all countries except DK by default
                const isHidden = country !== 'DNK';
                datasets.push({
                    label: `Ledighed - ${countryNames[country] || country} (%)`,
                    data: data.unemployment,
                    borderColor: colors.unemployment,
                    backgroundColor: rgbToRgba(colors.unemployment, 0.1),
                    tension: 0.4,
                    fill: false,
                    yAxisID: 'y',
                    borderWidth: 2,
                    borderDash: [],
                    hidden: isHidden
                });
            });
            
            // Add inflation datasets with dashed lines
            countries.forEach((country, index) => {
                const data = dataArray[index];
                const colors = countryColors[country] || { unemployment: 'rgb(128, 128, 128)', inflation: 'rgb(128, 128, 128)' };
                // Hide all countries except DK by default
                const isHidden = country !== 'DNK';
                datasets.push({
                    label: `Inflation - ${countryNames[country] || country} (%)`,
                    data: data.inflation,
                    borderColor: colors.inflation,
                    backgroundColor: rgbToRgba(colors.inflation, 0.1),
                    tension: 0.4,
                    fill: false,
                    yAxisID: 'y1',
                    borderWidth: 2,
                    borderDash: [5, 5], // Dashed line for inflation
                    hidden: isHidden
                });
            });
            
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    ...chartConfig,
                    plugins: {
                        ...chartConfig.plugins,
                        title: {
                            display: true,
                            text: 'Ledighed og inflation i forskellige lande',
                            font: {
                                size: 16,
                                weight: 'bold',
                                family: 'Inter, sans-serif'
                            },
                            padding: {
                                top: 10,
                                bottom: 20
                            }
                        },
                        legend: {
                            ...chartConfig.plugins.legend,
                            display: true,
                            position: 'top',
                            labels: {
                                ...chartConfig.plugins.legend.labels,
                                filter: function(item, chart) {
                                    // Show all legend items
                                    return true;
                                },
                                generateLabels: function(chart) {
                                    const original = Chart.defaults.plugins.legend.labels.generateLabels;
                                    const labels = original(chart);
                                    // Add visual distinction for dashed lines (inflation)
                                    labels.forEach((label, i) => {
                                        if (label.text.includes('Inflation')) {
                                            label.fontStyle = 'italic';
                                        }
                                    });
                                    return labels;
                                }
                            }
                        }
                    },
                    scales: {
                        ...chartConfig.scales,
                        y: {
                            ...chartConfig.scales.y,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Ledighed (%)',
                                font: {
                                    size: 12,
                                    weight: 'bold',
                                    family: 'Inter, sans-serif'
                                }
                            },
                            ticks: {
                                ...chartConfig.scales.y.ticks,
                                callback: function(value) {
                                    return value.toFixed(1) + '%';
                                }
                            }
                        },
                        y1: {
                            type: 'linear',
                            position: 'right',
                            grid: {
                                drawOnChartArea: false
                            },
                            title: {
                                display: true,
                                text: 'Inflation (%)',
                                font: {
                                    size: 12,
                                    weight: 'bold',
                                    family: 'Inter, sans-serif'
                                }
                            },
                            ticks: {
                                callback: function(value) {
                                    return value.toFixed(1) + '%';
                                }
                            }
                        },
                        x: {
                            ...chartConfig.scales.x,
                            title: {
                                display: true,
                                text: 'År',
                                font: {
                                    size: 12,
                                    weight: 'bold',
                                    family: 'Inter, sans-serif'
                                }
                            }
                        }
                    }
                }
            });
        });
}

// Create Balance of Payments Chart
function createBalanceOfPaymentsChart(canvasId, years = 20) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    fetchBalanceOfPayments(years).then(data => {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Løbende konto (mia. kr.)',
                        data: data.currentAccount,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: 'Samlet betalingsbalance (mia. kr.)',
                        data: data.overall,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        tension: 0.4,
                        fill: false
                    }
                ]
            },
            options: {
                ...chartConfig,
                plugins: {
                    ...chartConfig.plugins,
                    title: {
                        display: true,
                        text: 'Betalingsbalancens udvikling i Danmark',
                        font: {
                            size: 16,
                            weight: 'bold',
                            family: 'Inter, sans-serif'
                        },
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    }
                },
                scales: {
                    ...chartConfig.scales,
                    y: {
                        ...chartConfig.scales.y,
                        title: {
                            display: true,
                            text: 'Saldo (mia. kr.)',
                            font: {
                                size: 12,
                                weight: 'bold',
                                family: 'Inter, sans-serif'
                            }
                        }
                    },
                    x: {
                        ...chartConfig.scales.x,
                        title: {
                            display: true,
                            text: 'År',
                            font: {
                                size: 12,
                                weight: 'bold',
                                family: 'Inter, sans-serif'
                            }
                        }
                    }
                }
            }
        });
    });
}

// Create National Accounts Chart
function createNationalAccountsChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    fetchNationalAccounts(20).then(data => {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'BNP (mia. kr.)',
                        data: data.bnp,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.4,
                        fill: false,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Eksport (mia. kr.)',
                        data: data.export,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        tension: 0.4,
                        fill: false,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Import (mia. kr.)',
                        data: data.import,
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        tension: 0.4,
                        fill: false,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Forbrug (mia. kr.)',
                        data: data.consumption,
                        borderColor: 'rgb(255, 206, 86)',
                        backgroundColor: 'rgba(255, 206, 86, 0.2)',
                        tension: 0.4,
                        fill: false,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Investering (mia. kr.)',
                        data: data.investment,
                        borderColor: 'rgb(153, 102, 255)',
                        backgroundColor: 'rgba(153, 102, 255, 0.2)',
                        tension: 0.4,
                        fill: false,
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                ...chartConfig,
                plugins: {
                    ...chartConfig.plugins,
                    title: {
                        display: true,
                        text: 'Nationalregnskabets udvikling i Danmark',
                        font: {
                            size: 16,
                            weight: 'bold',
                            family: 'Inter, sans-serif'
                        },
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    }
                },
                scales: {
                    ...chartConfig.scales,
                    y: {
                        ...chartConfig.scales.y,
                        title: {
                            display: true,
                            text: 'Værdi (mia. kr.)',
                            font: {
                                size: 12,
                                weight: 'bold',
                                family: 'Inter, sans-serif'
                            }
                        }
                    },
                    x: {
                        ...chartConfig.scales.x,
                        title: {
                            display: true,
                            text: 'År',
                            font: {
                                size: 12,
                                weight: 'bold',
                                family: 'Inter, sans-serif'
                            }
                        }
                    }
                }
            }
        });
    });
}

// Initialize all charts when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Charts will be initialized individually by their canvas IDs
    // This allows for lazy loading
});
