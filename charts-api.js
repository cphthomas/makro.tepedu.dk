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
                callback: function (value) {
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

// Fetch GDP data from World Bank - uses cached data first for recent data
async function fetchGDPData(countries = ['DNK', 'DEU', 'SWE', 'NOR', 'USA'], years = 20) {
    try {
        const endYear = new Date().getFullYear();
        const startYear = endYear - years;

        // For bubble chart (years=1), try cached data first
        let useCachedData = false;
        let results = [];

        if (years === 1) {
            const cache = await loadCachedChartData();
            if (cache && cache.gdp && cache.gdp.data) {
                const hasAllCountries = countries.every(code => cache.gdp.data[code]);
                if (hasAllCountries) {
                    useCachedData = true;
                    results = countries.map(countryCode => {
                        const cachedCountryData = cache.gdp.data[countryCode];
                        if (cachedCountryData && cachedCountryData.length > 0) {
                            // Get most recent year
                            const latest = cachedCountryData[cachedCountryData.length - 1];
                            return {
                                country: countryCode,
                                data: [{ date: latest.date, value: latest.value }]
                            };
                        }
                        return null;
                    }).filter(r => r !== null);
                }
            }
        }

        // If not using cached data, fetch from API
        if (!useCachedData) {
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

            results = await Promise.all(promises);
        }

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
            'POL': 'Polen',
            'TUR': 'Tyrkiet',
            'BRA': 'Brasilien',
            'GRC': 'Grækenland',
            'ARG': 'Argentina',
            'KOR': 'Sydkorea'
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
        'POL': 600,
        'TUR': 900,
        'BRA': 1800,
        'GRC': 220,
        'ARG': 480,
        'KOR': 1800
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
        'POL': 'Polen',
        'TUR': 'Tyrkiet',
        'BRA': 'Brasilien',
        'GRC': 'Grækenland',
        'ARG': 'Argentina',
        'KOR': 'Sydkorea'
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

/**
 * Creates a premium, interactive JS-based Economic Circuit (Det økonomiske kredsløb)
 * using the vis-network library.
 * @param {string} containerId - The ID of the container element
 */
/**
 * Creates a premium, interactive and highly aesthetic Economic Circuit (Det økonomiske kredsløb)
 * using a dedicated SVG implementation for maximum visual impact and clarity.
 * 
 * Alternative libraries for similar diagrams:
 * - D3.js: Most powerful, but requires more code. Best for complex custom visualizations.
 * - Mermaid.js: Great for flowcharts/diagrams from text. Simpler but less customizable.
 * - Cytoscape.js: Excellent for network/graph diagrams. Good for interactive node-link diagrams.
 * - vis-network: Already loaded in project. Good for network visualizations but may be overkill.
 * - React Flow / Vue Flow: If using React/Vue frameworks.
 * 
 * Current SVG approach: Lightweight, no dependencies, full control, but requires manual positioning.
 * @param {string} containerId - The ID of the container element
 */
function createEconomicCircuit(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.style.height = "auto";
    container.style.border = "none";
    container.style.backgroundColor = "transparent";

    const svg = `
    <div class="economic-circuit-wrapper" style="width: 100%; background: transparent; margin: 30px 0; padding: 0;">
        <svg viewBox="0 0 1000 600" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: auto; display: block;">
            <defs>
                <filter id="boxShadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                    <feOffset dx="0" dy="1" result="offsetblur"/>
                    <feComponentTransfer>
                        <feFuncA type="linear" slope="0.1"/>
                    </feComponentTransfer>
                    <feMerge>
                        <feMergeNode/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
                
                <marker id="arrow-blue" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
                </marker>
                <marker id="arrow-red" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
                </marker>
            </defs>

            <!-- CONNECTIONS -->
            <g class="flow-lines">
                <path class="flow-path" d="M 320 200 L 320 110 L 430 110" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arrow-red)" stroke-dasharray="4,4" />
                <path class="flow-path" d="M 430 135 L 350 135 L 350 200" stroke="#3b82f6" stroke-width="1.5" fill="none" marker-end="url(#arrow-blue)" stroke-dasharray="4,4" />
                
                <path class="flow-path" d="M 680 200 L 680 110 L 570 110" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arrow-red)" stroke-dasharray="4,4" />
                <path class="flow-path" d="M 570 135 L 650 135 L 650 200" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arrow-red)" stroke-dasharray="4,4" />

                <path class="flow-path" d="M 420 240 L 580 240" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arrow-red)" stroke-dasharray="4,4" />
                <path class="flow-path" d="M 580 270 L 420 270" stroke="#3b82f6" stroke-width="1.5" fill="none" marker-end="url(#arrow-blue)" stroke-dasharray="4,4" />

                <path class="flow-path" d="M 280 300 L 280 420 L 400 420" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arrow-red)" stroke-dasharray="4,4" />
                <path class="flow-path" d="M 400 445 L 310 445 L 310 300" stroke="#3b82f6" stroke-width="1.5" fill="none" marker-end="url(#arrow-blue)" stroke-dasharray="4,4" />

                <path class="flow-path" d="M 490 420 L 580 420" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arrow-red)" stroke-dasharray="4,4" />
                
                <path class="flow-path" d="M 720 300 L 720 420 L 610 420" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arrow-red)" stroke-dasharray="4,4" />
                <path class="flow-path" d="M 610 445 L 690 445 L 690 300" stroke="#3b82f6" stroke-width="1.5" fill="none" marker-end="url(#arrow-blue)" stroke-dasharray="4,4" />
            </g>

            <!-- LABELS -->
            <g class="flow-labels" style="font-size: 10px; font-weight: 500; font-style: italic;">
                <text x="270" y="100" fill="#ef4444">Skat (T)</text>
                <text x="350" y="150" text-anchor="middle" fill="#3b82f6">Løn & Overførsler (Y, Tr)</text>
                
                <text x="600" y="100" fill="#ef4444">Skat (T)</text>
                <text x="660" y="150" fill="#ef4444">Off. Forbrug (Cg)</text>

                <text x="500" y="230" text-anchor="middle" fill="#ef4444">Privat Forbrug (Cp)</text>
                <text x="500" y="290" text-anchor="middle" fill="#3b82f6">Indkomst/Profit (Y)</text>

                <text x="270" y="410" text-anchor="middle" fill="#ef4444">Opsparing (S)</text>
                <text x="535" y="410" text-anchor="middle" fill="#ef4444">Investering (I)</text>
                <text x="720" y="410" text-anchor="middle" fill="#ef4444">Import (IM)</text>
                <text x="690" y="470" text-anchor="middle" fill="#3b82f6">Eksport (X)</text>
            </g>

            <!-- NODES -->
            <!-- Offentlig sektor -->
            <g class="circuit-node" transform="translate(430, 80)" data-info="<strong>Offentlig sektor</strong><br>Opkræver skat (T) og står for offentligt forbrug (Cg).">
                <rect width="140" height="60" rx="0" fill="#ffffff" stroke="none" filter="url(#boxShadow)" />
                <!-- Government building icon (SVG) - more visible -->
                <g transform="translate(20, 15)">
                    <rect x="0" y="10" width="24" height="14" fill="#1e293b" opacity="0.9" rx="1"/>
                    <polygon points="12,0 22,10 2,10" fill="#1e293b" opacity="0.9"/>
                    <rect x="5" y="14" width="3" height="10" fill="#1e293b" opacity="0.7"/>
                    <rect x="16" y="14" width="3" height="10" fill="#1e293b" opacity="0.7"/>
                    <circle cx="12" cy="6" r="1.5" fill="#1e293b" opacity="0.9"/>
                </g>
                <text x="70" y="38" text-anchor="middle" font-size="13" font-weight="600" fill="#1e293b" font-style="italic">Offentlig sektor</text>
            </g>

            <!-- Husholdninger -->
            <g class="circuit-node" transform="translate(280, 200)" data-info="<strong>Husholdninger</strong><br>Modtager indkomst (Y) og bruger den på forbrug (Cp), skat (T) og opsparing (S).">
                <rect width="140" height="100" rx="0" fill="#ffffff" stroke="none" filter="url(#boxShadow)" />
                <image x="50" y="20" width="40" height="40" href="https://img.icons8.com/material-outlined/50/000000/home.png" />
                <text x="70" y="80" text-anchor="middle" font-size="13" font-weight="600" fill="#1e293b">Husholdninger</text>
            </g>

            <!-- Virksomheder -->
            <g class="circuit-node" transform="translate(580, 200)" data-info="<strong>Virksomheder</strong><br>Producerer varer og skaber indkomst (Y) til husholdningerne.">
                <rect width="140" height="100" rx="0" fill="#ffffff" stroke="none" filter="url(#boxShadow)" />
                <image x="50" y="20" width="40" height="40" href="https://img.icons8.com/material-outlined/50/000000/factory.png" />
                <text x="70" y="80" text-anchor="middle" font-size="13" font-weight="600" fill="#1e293b">Virksomheder</text>
            </g>

            <!-- Banker -->
            <g class="circuit-node" transform="translate(400, 400)" data-info="<strong>Banker</strong><br>Omdanner opsparing (S) til investeringer (I).">
                <rect width="90" height="70" rx="0" fill="#ffffff" stroke="none" filter="url(#boxShadow)" />
                <image x="25" y="12" width="40" height="40" href="https://img.icons8.com/material-outlined/50/000000/museum.png" />
                <text x="45" y="65" text-anchor="middle" font-size="13" font-weight="600" fill="#1e293b">Banker</text>
            </g>

            <!-- Udlandet -->
            <g class="circuit-node" transform="translate(520, 400)" data-info="<strong>Udlandet</strong><br>Køber danske varer (X) og sælger varer til os (IM).">
                <rect width="90" height="70" rx="0" fill="#ffffff" stroke="none" filter="url(#boxShadow)" />
                <image x="25" y="12" width="40" height="40" href="https://img.icons8.com/material-outlined/50/000000/globe.png" />
                <text x="45" y="65" text-anchor="middle" font-size="13" font-weight="600" fill="#1e293b">Udlandet</text>
            </g>
        </svg>

        <div id="circuit-tooltip" style="position: absolute; display: none; background: #fff; border: 1px solid #e2e8f0; padding: 10px; border-radius: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); z-index: 1000; max-width: 220px; font-size: 12px; pointer-events: none;"></div>
    </div>

    <style>
        .circuit-node:hover rect { stroke: #3b82f6; stroke-width: 1.5px; cursor: pointer; }
        .flow-path { opacity: 0.7; transition: opacity 0.2s ease; }
        .flow-path:hover { opacity: 1; stroke-width: 2.5; cursor: help; }
    </style>
    `;

    container.innerHTML = svg;

    // Interactive Logic
    const nodeEls = container.querySelectorAll('.circuit-node');
    const tooltipEl = container.querySelector('#circuit-tooltip');

    nodeEls.forEach(node => {
        node.addEventListener('mouseenter', (e) => {
            const info = node.getAttribute('data-info');
            tooltipEl.innerHTML = info;
            tooltipEl.style.display = 'block';
        });

        node.addEventListener('mousemove', (e) => {
            const rect = container.getBoundingClientRect();
            let x = e.clientX - rect.left + 15;
            let y = e.clientY - rect.top + 15;
            if (x + 250 > rect.width) x -= 270;
            if (y + 100 > rect.height) y -= 120;
            tooltipEl.style.left = x + 'px';
            tooltipEl.style.top = y + 'px';
        });

        node.addEventListener('mouseleave', () => {
            tooltipEl.style.display = 'none';
        });
    });

    // Animate flow lines
    const flowPaths = container.querySelectorAll('.flow-path');
    flowPaths.forEach(path => {
        path.style.strokeDasharray = "8, 8";
        let offset = 0;
        function animate() {
            offset -= 0.4;
            path.style.strokeDashoffset = offset;
            requestAnimationFrame(animate);
        }
        animate();
    });
}

// Create Economic Circuit with D3.js
function createEconomicCircuitD3(containerId) {
    const container = document.getElementById(containerId);
    if (!container || typeof d3 === 'undefined') {
        setTimeout(() => createEconomicCircuitD3(containerId), 200);
        return;
    }

    container.style.height = "600px";
    container.style.width = "100%";
    container.innerHTML = "";

    const width = Math.max(container.offsetWidth || 1000, 1000);
    const height = 600;
    const svg = d3.select(container)
        .append("svg")
        .attr("width", "100%")
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    // Add shadow filter
    const defs = svg.append("defs");
    const filter = defs.append("filter")
        .attr("id", "boxShadow")
        .attr("x", "-50%")
        .attr("y", "-50%")
        .attr("width", "200%")
        .attr("height", "200%");
    filter.append("feGaussianBlur")
        .attr("in", "SourceAlpha")
        .attr("stdDeviation", 2);
    filter.append("feOffset")
        .attr("dx", 0)
        .attr("dy", 1)
        .attr("result", "offsetblur");
    filter.append("feComponentTransfer")
        .append("feFuncA")
        .attr("type", "linear")
        .attr("slope", 0.1);
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Define nodes
    const nodes = [
        { id: "offentlig", label: "Offentlig sektor", x: width * 0.5, y: 80, type: "sector" },
        { id: "husholdninger", label: "Husholdninger", x: width * 0.25, y: 250, type: "sector" },
        { id: "virksomheder", label: "Virksomheder", x: width * 0.75, y: 250, type: "sector" },
        { id: "banker", label: "Banker", x: width * 0.35, y: 450, type: "sector" },
        { id: "udlandet", label: "Udlandet", x: width * 0.65, y: 450, type: "sector" }
    ];

    // Define edges
    const edges = [
        { from: "husholdninger", to: "offentlig", label: "Skat (T)", color: "#ef4444" },
        { from: "offentlig", to: "husholdninger", label: "Løn & Overførsler (Y, Tr)", color: "#3b82f6" },
        { from: "virksomheder", to: "offentlig", label: "Skat (T)", color: "#ef4444" },
        { from: "offentlig", to: "virksomheder", label: "Off. Forbrug (Cg)", color: "#ef4444" },
        { from: "husholdninger", to: "virksomheder", label: "Privat Forbrug (Cp)", color: "#ef4444" },
        { from: "virksomheder", to: "husholdninger", label: "Indkomst/Profit (Y)", color: "#3b82f6" },
        { from: "husholdninger", to: "banker", label: "Opsparing (S)", color: "#ef4444" },
        { from: "banker", to: "virksomheder", label: "Investering (I)", color: "#ef4444" },
        { from: "virksomheder", to: "udlandet", label: "Eksport (X)", color: "#3b82f6" },
        { from: "udlandet", to: "virksomheder", label: "Import (IM)", color: "#ef4444" }
    ];

    // Add arrow markers to defs
    edges.forEach(edge => {
        const markerId = `arrow-${edge.color.replace('#', '')}-${edge.from}-${edge.to}`;
        defs.append("marker")
            .attr("id", markerId)
            .attr("viewBox", "0 0 10 10")
            .attr("refX", 8)
            .attr("refY", 5)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M 0 0 L 10 5 L 0 10 z")
            .attr("fill", edge.color);
    });

    // Create edges
    const link = svg.append("g")
        .selectAll("path")
        .data(edges)
        .enter()
        .append("path")
        .attr("stroke", d => d.color)
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4,4")
        .attr("fill", "none")
        .attr("marker-end", d => {
            const markerId = `arrow-${d.color.replace('#', '')}-${d.from}-${d.to}`;
            return `url(#${markerId})`;
        })
        .attr("d", d => {
            const source = nodes.find(n => n.id === d.from);
            const target = nodes.find(n => n.id === d.to);
            return `M ${source.x},${source.y} L ${target.x},${target.y}`;
        });

    // Create nodes
    const node = svg.append("g")
        .selectAll("g")
        .data(nodes)
        .enter()
        .append("g")
        .attr("transform", d => `translate(${d.x},${d.y})`);

    node.append("rect")
        .attr("width", d => d.id === "offentlig" ? 140 : d.id === "husholdninger" || d.id === "virksomheder" ? 140 : 90)
        .attr("height", d => d.id === "offentlig" ? 60 : d.id === "husholdninger" || d.id === "virksomheder" ? 100 : 70)
        .attr("x", d => d.id === "offentlig" ? -70 : d.id === "husholdninger" || d.id === "virksomheder" ? -70 : -45)
        .attr("y", d => d.id === "offentlig" ? -30 : d.id === "husholdninger" || d.id === "virksomheder" ? -50 : -35)
        .attr("fill", "#ffffff")
        .attr("stroke", "none")
        .attr("filter", "url(#boxShadow)")
        .style("cursor", "pointer");

    node.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", d => d.id === "offentlig" ? 5 : d.id === "husholdninger" || d.id === "virksomheder" ? 30 : 20)
        .attr("font-size", "13")
        .attr("font-weight", "600")
        .attr("fill", "#1e293b")
        .text(d => d.label);

    // Add edge labels
    edges.forEach(edge => {
        const source = nodes.find(n => n.id === edge.from);
        const target = nodes.find(n => n.id === edge.to);
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;

        svg.append("text")
            .attr("x", midX)
            .attr("y", midY)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("font-weight", "500")
            .attr("font-style", "italic")
            .attr("fill", edge.color)
            .attr("pointer-events", "none")
            .text(edge.label);
    });
}

// Create Economic Circuit with Cytoscape.js
function createEconomicCircuitCytoscape(containerId) {
    const container = document.getElementById(containerId);
    if (!container || typeof cytoscape === 'undefined') {
        setTimeout(() => createEconomicCircuitCytoscape(containerId), 200);
        return;
    }

    container.style.height = "600px";
    container.style.width = "100%";
    container.innerHTML = "";

    const cy = cytoscape({
        container: container,
        elements: [
            { data: { id: 'offentlig', label: 'Offentlig sektor' } },
            { data: { id: 'husholdninger', label: 'Husholdninger' } },
            { data: { id: 'virksomheder', label: 'Virksomheder' } },
            { data: { id: 'banker', label: 'Banker' } },
            { data: { id: 'udlandet', label: 'Udlandet' } },
            { data: { id: 'e1', source: 'husholdninger', target: 'offentlig', label: 'Skat (T)', color: '#ef4444' } },
            { data: { id: 'e2', source: 'offentlig', target: 'husholdninger', label: 'Løn & Overførsler (Y, Tr)', color: '#3b82f6' } },
            { data: { id: 'e3', source: 'virksomheder', target: 'offentlig', label: 'Skat (T)', color: '#ef4444' } },
            { data: { id: 'e4', source: 'offentlig', target: 'virksomheder', label: 'Off. Forbrug (Cg)', color: '#ef4444' } },
            { data: { id: 'e5', source: 'husholdninger', target: 'virksomheder', label: 'Privat Forbrug (Cp)', color: '#ef4444' } },
            { data: { id: 'e6', source: 'virksomheder', target: 'husholdninger', label: 'Indkomst/Profit (Y)', color: '#3b82f6' } },
            { data: { id: 'e7', source: 'husholdninger', target: 'banker', label: 'Opsparing (S)', color: '#ef4444' } },
            { data: { id: 'e8', source: 'banker', target: 'virksomheder', label: 'Investering (I)', color: '#ef4444' } },
            { data: { id: 'e9', source: 'virksomheder', target: 'udlandet', label: 'Eksport (X)', color: '#3b82f6' } },
            { data: { id: 'e10', source: 'udlandet', target: 'virksomheder', label: 'Import (IM)', color: '#ef4444' } }
        ],
        style: [
            {
                selector: 'node',
                style: {
                    'label': 'data(label)',
                    'width': 140,
                    'height': 60,
                    'shape': 'round-rectangle',
                    'background-color': '#ffffff',
                    'border-width': 0,
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'font-size': '13px',
                    'font-weight': '600',
                    'color': '#1e293b',
                    'text-wrap': 'wrap',
                    'text-max-width': '130px'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 1.5,
                    'line-color': 'data(color)',
                    'target-arrow-color': 'data(color)',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'straight',
                    'line-style': 'dashed',
                    'label': 'data(label)',
                    'font-size': '10px',
                    'font-weight': '500',
                    'font-style': 'italic',
                    'text-rotation': 'autorotate',
                    'text-margin-y': -10
                }
            }
        ],
        layout: {
            name: 'preset',
            positions: {
                'offentlig': { x: 500, y: 80 },
                'husholdninger': { x: 250, y: 250 },
                'virksomheder': { x: 750, y: 250 },
                'banker': { x: 350, y: 450 },
                'udlandet': { x: 650, y: 450 }
            }
        }
    });

    // Make it zoomable and pannable
    cy.userPanningEnabled(true);
    cy.userZoomingEnabled(true);
    cy.fit();
}

// Create Economic Circuit with vis-network
function createEconomicCircuitVis(containerId) {
    const container = document.getElementById(containerId);
    if (!container || typeof vis === 'undefined') {
        setTimeout(() => createEconomicCircuitVis(containerId), 200);
        return;
    }

    container.style.height = "600px";
    container.style.width = "100%";
    container.innerHTML = "";

    // Get container width for better scaling - wait for layout
    let containerWidth = container.offsetWidth;
    if (!containerWidth || containerWidth < 800) {
        // Fallback: use parent or calculate from viewport
        const parent = container.parentElement;
        containerWidth = parent ? Math.min(parent.offsetWidth - 40, 1400) : 1200;
    }

    // Ensure minimum width
    containerWidth = Math.max(containerWidth, 1000);

    // Node information for tooltips (simple, clear explanations)
    const nodeInfo = {
        'offentlig': 'Offentlig sektor\nOpkræver skat fra husholdninger og virksomheder.\nBetaler løn og overførsler.\nKøber varer og tjenester.',
        'husholdninger': 'Husholdninger\nModtager indkomst fra virksomheder og offentlig sektor.\nBruger penge på forbrug, skat og opsparing.',
        'virksomheder': 'Virksomheder\nProducerer varer og tjenester.\nBetaler løn til husholdninger.\nBetaler skat til offentlig sektor.',
        'banker': 'Banker\nModtager opsparing fra husholdninger.\nLåner penge ud til virksomheder som investeringer.',
        'udlandet': 'Udlandet\nKøber danske varer (eksport).\nSælger varer til Danmark (import).'
    };

    // Calculate positions based on container width
    const centerX = containerWidth * 0.5;
    const leftX = containerWidth * 0.2;
    const rightX = containerWidth * 0.8;
    const topY = 80;
    const midY = 250;
    const bottomY = 450;
    const leftBottomX = containerWidth * 0.3;
    const rightBottomX = containerWidth * 0.7;

    const nodes = new vis.DataSet([
        { id: 'offentlig', label: 'Offentlig sektor', x: centerX, y: topY, fixed: true, shape: 'box', font: { size: 16, face: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }, title: nodeInfo['offentlig'] },
        { id: 'husholdninger', label: 'Husholdninger', x: leftX, y: midY, fixed: true, shape: 'box', font: { size: 16, face: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }, title: nodeInfo['husholdninger'] },
        { id: 'virksomheder', label: 'Virksomheder', x: rightX, y: midY, fixed: true, shape: 'box', font: { size: 16, face: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }, title: nodeInfo['virksomheder'] },
        { id: 'banker', label: 'Banker', x: leftBottomX, y: bottomY, fixed: true, shape: 'box', font: { size: 16, face: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }, title: nodeInfo['banker'] },
        { id: 'udlandet', label: 'Udlandet', x: rightBottomX, y: bottomY, fixed: true, shape: 'box', font: { size: 16, face: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }, title: nodeInfo['udlandet'] }
    ]);

    const edges = new vis.DataSet([
        { from: 'husholdninger', to: 'offentlig', label: 'Skat (T)', color: { color: '#ef4444' }, dashes: true, arrows: 'to', font: { size: 13, align: 'middle', face: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' } },
        { from: 'offentlig', to: 'husholdninger', label: 'Løn & Overførsler (Y, Tr)', color: { color: '#3b82f6' }, dashes: true, arrows: 'to', font: { size: 13, align: 'middle', face: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' } },
        { from: 'virksomheder', to: 'offentlig', label: 'Skat (T)', color: { color: '#ef4444' }, dashes: true, arrows: 'to', font: { size: 13, align: 'middle', face: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' } },
        { from: 'offentlig', to: 'virksomheder', label: 'Off. Forbrug (Cg)', color: { color: '#ef4444' }, dashes: true, arrows: 'to', font: { size: 13, align: 'middle', face: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' } },
        { from: 'husholdninger', to: 'virksomheder', label: 'Privat Forbrug (Cp)', color: { color: '#ef4444' }, dashes: true, arrows: 'to', font: { size: 13, align: 'middle', face: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' } },
        { from: 'husholdninger', to: 'banker', label: 'Opsparing (S)', color: { color: '#ef4444' }, dashes: true, arrows: 'to', font: { size: 13, align: 'middle', face: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' } },
        { from: 'banker', to: 'virksomheder', label: 'Investering (I)', color: { color: '#ef4444' }, dashes: true, arrows: 'to', font: { size: 13, align: 'middle', face: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' } },
        { from: 'virksomheder', to: 'udlandet', label: 'Eksport (X)', color: { color: '#3b82f6' }, dashes: true, arrows: 'to', font: { size: 13, align: 'middle', face: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' } },
        { from: 'udlandet', to: 'virksomheder', label: 'Import (IM)', color: { color: '#ef4444' }, dashes: true, arrows: 'to', font: { size: 13, align: 'middle', face: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' } }
    ]);

    const data = { nodes: nodes, edges: edges };
    const options = {
        nodes: {
            shape: 'box',
            margin: 16, // Increased margin for better text spacing
            font: {
                size: 16,
                face: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                color: '#0f172a',
                multi: false
            },
            color: {
                background: '#ffffff',
                border: '#e2e8f0',
                borderWidth: 1,
                highlight: {
                    background: '#f0f9ff',
                    border: '#3b82f6',
                    borderWidth: 2
                },
                hover: {
                    background: '#f8fafc',
                    border: '#3b82f6'
                }
            },
            shadow: { enabled: true, size: 8, x: 0, y: 2 },
            widthConstraint: { maximum: 160 },
            heightConstraint: { maximum: 85 }
        },
        edges: {
            arrows: { to: { enabled: true, scaleFactor: 0.8 } },
            font: {
                size: 13,
                align: 'middle',
                face: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                color: '#1e293b',
                multi: false
            },
            smooth: { type: 'straight' },
            color: { highlight: '#3b82f6' }
        },
        physics: false,
        interaction: {
            dragNodes: false,
            zoomView: false,  // Disabled zoom
            dragView: false,  // Disabled pan
            selectConnectedEdges: false,
            hover: true,
            tooltipDelay: 100,
            selectable: false  // Disable selection to prevent black box
        },
        configure: {
            enabled: false
        }
    };

    const network = new vis.Network(container, data, options);

    // Prevent selection and fix font consistency
    network.on("selectNode", function (params) {
        if (params.nodes.length > 0) {
            network.unselectAll();
        }
    });

    // Ensure font consistency - override any default styles
    network.on("stabilizationEnd", function () {
        const canvas = container.querySelector('canvas');
        if (canvas) {
            canvas.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        }

        // Add CSS to prevent black selection
        if (!document.getElementById('vis-network-font-fix')) {
            const style = document.createElement('style');
            style.id = 'vis-network-font-fix';
            style.textContent = `
                #${containerId} canvas {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
                }
                .vis-network .vis-node.vis-selected {
                    background-color: #f0f9ff !important;
                    border-color: #3b82f6 !important;
                    color: #0f172a !important;
                }
            `;
            document.head.appendChild(style);
        }
    });

    // Create custom tooltip element with modern styling
    const tooltip = document.createElement('div');
    tooltip.id = 'economic-circuit-tooltip';
    tooltip.style.cssText = `
        position: absolute;
        display: none;
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        border: 2px solid #3b82f6;
        border-radius: 0;
        padding: 14px 16px;
        box-shadow: 0 10px 25px rgba(59, 130, 246, 0.15), 0 4px 10px rgba(0,0,0,0.1);
        font-family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        font-size: 13px;
        color: #0f172a;
        max-width: 280px;
        z-index: 10000;
        pointer-events: none;
        white-space: pre-line;
        line-height: 1.5;
        backdrop-filter: blur(10px);
    `;

    // Add modern gradient top border styling
    if (!document.getElementById('economic-circuit-tooltip-style')) {
        const style = document.createElement('style');
        style.id = 'economic-circuit-tooltip-style';
        style.textContent = `
            #economic-circuit-tooltip::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%);
                border-radius: 0;
            }
            #economic-circuit-tooltip {
                font-weight: 500;
            }
        `;
        document.head.appendChild(style);
    }
    document.body.appendChild(tooltip);

    // Custom tooltip handling with plain text support
    let currentHoveredNode = null;

    network.on("hoverNode", function (params) {
        if (params.node) {
            currentHoveredNode = params.node;
            const node = nodes.get(params.node);
            if (node && node.title) {
                container.style.cursor = 'pointer';
                // Use textContent instead of innerHTML for plain text
                tooltip.textContent = node.title;
                tooltip.style.display = 'block';
            }
        }
    });

    network.on("blurNode", function (params) {
        currentHoveredNode = null;
        container.style.cursor = 'default';
        tooltip.style.display = 'none';
    });

    // Track mouse position for tooltip
    const updateTooltipPosition = function (e) {
        if (currentHoveredNode && tooltip.style.display === 'block') {
            const mouseX = e.clientX;
            const mouseY = e.clientY;

            tooltip.style.left = (mouseX + 15) + 'px';
            tooltip.style.top = (mouseY + 15) + 'px';

            // Adjust if tooltip goes off screen (check after rendering)
            requestAnimationFrame(() => {
                const tooltipRect = tooltip.getBoundingClientRect();
                if (tooltipRect.right > window.innerWidth) {
                    tooltip.style.left = (mouseX - tooltipRect.width - 15) + 'px';
                }
                if (tooltipRect.bottom > window.innerHeight) {
                    tooltip.style.top = (mouseY - tooltipRect.height - 15) + 'px';
                }
                if (tooltipRect.left < 0) {
                    tooltip.style.left = '15px';
                }
                if (tooltipRect.top < 0) {
                    tooltip.style.top = '15px';
                }
            });
        }
    };

    // Add mouse move listener to container
    container.addEventListener('mousemove', updateTooltipPosition);

    // Also listen on the canvas if it exists
    network.on("stabilizationEnd", function () {
        const canvas = container.querySelector('canvas');
        if (canvas) {
            canvas.addEventListener('mousemove', updateTooltipPosition);
        }
    });
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
                            callback: function (value) {
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

// Load cached chart data
let cachedChartData = null;
async function loadCachedChartData() {
    if (cachedChartData) return cachedChartData;

    try {
        const response = await fetch('chart-data-cache.json');
        cachedChartData = await response.json();
        return cachedChartData;
    } catch (error) {
        console.warn('Could not load cached chart data:', error);
        return null;
    }
}

// Fetch GDP per capita data - uses cached data first, then API, then mock data
async function fetchGDPPerCapitaData(countries = ['DNK', 'DEU', 'SWE', 'NOR', 'USA', 'JPN', 'CHN', 'IND'], years = 30) {
    try {
        const endYear = new Date().getFullYear();
        const startYear = endYear - years;

        // Try to load cached data first
        const cache = await loadCachedChartData();
        let useCachedData = false;
        let results = [];

        if (cache && cache.gdpPerCapita && cache.gdpPerCapita.data) {
            // Check if we have data for all requested countries
            const hasAllCountries = countries.every(code => cache.gdpPerCapita.data[code]);
            if (hasAllCountries) {
                useCachedData = true;
                results = countries.map(countryCode => {
                    const cachedCountryData = cache.gdpPerCapita.data[countryCode];
                    if (cachedCountryData) {
                        // Filter data by year range
                        const filteredData = cachedCountryData.filter(item => {
                            const year = parseInt(item.date);
                            return year >= startYear && year <= endYear;
                        });
                        return {
                            country: countryCode,
                            data: filteredData.map(item => ({ date: item.date, value: item.value }))
                        };
                    }
                    return null;
                }).filter(r => r !== null);
            }
        }

        // If cached data not available or incomplete, try API
        if (!useCachedData) {
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

            results = await Promise.all(promises);
        }

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
            'FRA': 'Frankrig', 'ITA': 'Italien', 'ESP': 'Spanien', 'NLD': 'Holland', 'POL': 'Polen',
            'TUR': 'Tyrkiet', 'BRA': 'Brasilien', 'GRC': 'Grækenland', 'ARG': 'Argentina', 'KOR': 'Sydkorea'
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
            if (result && result.data && result.data.length > 0) {
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

        // If no data was found, use mock data
        if (processedData.datasets.length === 0) {
            console.warn('No GDP per capita data found, using mock data');
            return generateMockGDPPerCapitaData(countries, years);
        }

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
        'JPN': 40000, 'CHN': 12000, 'IND': 2000, 'RUS': 11000, 'GBR': 45000,
        'TUR': 10000, 'BRA': 8000, 'ITA': 35000, 'ESP': 30000, 'GRC': 20000, 'ARG': 10000, 'KOR': 35000
    };

    const countryNames = {
        'DNK': 'Danmark', 'DEU': 'Tyskland', 'SWE': 'Sverige', 'NOR': 'Norge', 'USA': 'USA',
        'JPN': 'Japan', 'CHN': 'Kina', 'IND': 'Indien', 'RUS': 'Rusland', 'GBR': 'Storbritannien',
        'TUR': 'Tyrkiet', 'BRA': 'Brasilien', 'ITA': 'Italien', 'ESP': 'Spanien', 'GRC': 'Grækenland', 'ARG': 'Argentina', 'KOR': 'Sydkorea'
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
    'GBR': { unemploymentBase: 5.0, inflationBase: 2.5 },
    'KOR': { unemploymentBase: 3.5, inflationBase: 2.2 }
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
                            callback: function (value) {
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
        // Ensure we have valid data
        if (!data || !data.datasets || data.datasets.length === 0) {
            console.error('No GDP per capita data available');
            return;
        }

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
                            callback: function (value) {
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
    }).catch(error => {
        console.error('Error creating GDP per capita chart:', error);
        // Try to use cached data directly
        loadCachedChartData().then(cache => {
            if (cache && cache.gdpPerCapita && cache.gdpPerCapita.data) {
                const processedData = {
                    labels: [],
                    datasets: []
                };

                const allYears = new Set();
                countries.forEach(code => {
                    const countryData = cache.gdpPerCapita.data[code];
                    if (countryData) {
                        countryData.forEach(item => {
                            if (item.date) allYears.add(item.date);
                        });
                    }
                });

                const sortedYears = Array.from(allYears).sort();
                processedData.labels = sortedYears;

                const countryNames = {
                    'DNK': 'Danmark', 'DEU': 'Tyskland', 'SWE': 'Sverige', 'NOR': 'Norge', 'USA': 'USA',
                    'JPN': 'Japan', 'CHN': 'Kina', 'IND': 'Indien', 'RUS': 'Rusland', 'GBR': 'Storbritannien',
                    'TUR': 'Tyrkiet', 'BRA': 'Brasilien', 'ITA': 'Italien', 'ESP': 'Spanien', 'GRC': 'Grækenland', 'ARG': 'Argentina', 'KOR': 'Sydkorea'
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

                countries.forEach((countryCode, index) => {
                    const countryData = cache.gdpPerCapita.data[countryCode];
                    if (countryData && countryData.length > 0) {
                        const dataPoints = sortedYears.map(year => {
                            const item = countryData.find(d => d.date === year);
                            return item && item.value ? item.value : null;
                        });

                        processedData.datasets.push({
                            label: countryNames[countryCode] || countryCode,
                            data: dataPoints,
                            borderColor: colors[index % colors.length].border,
                            backgroundColor: colors[index % colors.length].background,
                            tension: 0.4,
                            fill: false
                        });
                    }
                });

                if (processedData.datasets.length > 0) {
                    new Chart(ctx, {
                        type: 'line',
                        data: processedData,
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
                                        callback: function (value) {
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
                            callback: function (value) {
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
                            callback: function (value) {
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
    const countryColors = {
        'DNK': { unemployment: 'rgb(255, 99, 132)', inflation: 'rgb(255, 99, 132)' },
        'DEU': { unemployment: 'rgb(54, 162, 235)', inflation: 'rgb(108, 189, 255)' },
        'SWE': { unemployment: 'rgb(255, 206, 86)', inflation: 'rgb(255, 223, 138)' },
        'NOR': { unemployment: 'rgb(75, 192, 192)', inflation: 'rgb(136, 219, 219)' },
        'USA': { unemployment: 'rgb(153, 102, 255)', inflation: 'rgb(186, 153, 255)' },
        'FRA': { unemployment: 'rgb(255, 159, 64)', inflation: 'rgb(255, 192, 128)' },
        'GBR': { unemployment: 'rgb(199, 199, 199)', inflation: 'rgb(230, 230, 230)' },
        'KOR': { unemployment: 'rgb(0, 71, 160)', inflation: 'rgb(50, 120, 210)' }
    };

    const countryNames = {
        'DNK': 'Danmark',
        'DEU': 'Tyskland',
        'SWE': 'Sverige',
        'NOR': 'Norge',
        'USA': 'USA',
        'FRA': 'Frankrig',
        'GBR': 'Storbritannien',
        'KOR': 'Sydkorea'
    };

    Promise.all(countries.map(country => fetchUnemploymentInflationData(country, 40)))
        .then(dataArray => {
            const labels = dataArray[0].labels;
            const datasets = [];

            const rgbToRgba = (rgb, alpha = 0.1) => {
                const match = rgb.match(/\d+/g);
                if (match && match.length >= 3) {
                    return `rgba(${match[0]}, ${match[1]}, ${match[2]}, ${alpha})`;
                }
                return rgb;
            };

            // 1. Add unemployment for all countries (Row 1 of legend)
            countries.forEach((country, index) => {
                const data = dataArray[index];
                const colors = countryColors[country] || { unemployment: 'rgb(128, 128, 128)', inflation: 'rgb(128, 128, 128)' };
                datasets.push({
                    label: `${countryNames[country] || country} - Ledighed (%)`,
                    data: data.unemployment,
                    borderColor: colors.unemployment,
                    backgroundColor: rgbToRgba(colors.unemployment, 0.1),
                    tension: 0.4,
                    fill: false,
                    yAxisID: 'y',
                    borderWidth: 2,
                    hidden: country !== 'DNK'
                });
            });

            // 2. Add inflation for all countries (Row 2 of legend)
            countries.forEach((country, index) => {
                const data = dataArray[index];
                const colors = countryColors[country] || { unemployment: 'rgb(128, 128, 128)', inflation: 'rgb(128, 128, 128)' };
                datasets.push({
                    label: `${countryNames[country] || country} - Inflation (%)`,
                    data: data.inflation,
                    borderColor: colors.inflation,
                    backgroundColor: rgbToRgba(colors.inflation, 0.1),
                    tension: 0.4,
                    fill: false,
                    yAxisID: 'y1',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    hidden: country !== 'DNK'
                });
            });

            // 1. Create/Ensure a wrapper for title and legend ABOVE the container
            const chartContainer = ctx.parentNode;
            let controlsWrapper = document.getElementById(canvasId + '-controls');
            if (!controlsWrapper) {
                controlsWrapper = document.createElement('div');
                controlsWrapper.id = canvasId + '-controls';
                controlsWrapper.style.marginBottom = '20px';
                chartContainer.parentNode.insertBefore(controlsWrapper, chartContainer);
            }
            controlsWrapper.innerHTML = ''; // Clear previous

            // 2. Add an HTML Title
            const htmlTitle = document.createElement('h4');
            htmlTitle.textContent = 'Ledighed og inflation i forskellige lande';
            htmlTitle.style.textAlign = 'center';
            htmlTitle.style.marginBottom = '15px';
            htmlTitle.style.fontWeight = 'bold';
            htmlTitle.style.fontFamily = 'Inter, sans-serif';
            controlsWrapper.appendChild(htmlTitle);

            // 3. Add an HTML Legend Container
            const legendContainer = document.createElement('div');
            legendContainer.id = canvasId + '-legend';
            controlsWrapper.appendChild(legendContainer);

            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    ...chartConfig,
                    maintainAspectRatio: false, // Allow it to fill the container height
                    plugins: {
                        ...chartConfig.plugins,
                        title: { display: false }, // Disable Chart.js title
                        legend: { display: false },
                        htmlLegend: { containerID: canvasId + '-legend' }
                    },
                    layout: {
                        padding: {
                            bottom: 50, // More space for rotated year labels
                            top: 10
                        }
                    },
                    scales: {
                        ...chartConfig.scales,
                        y: {
                            ...chartConfig.scales.y,
                            position: 'left',
                            title: { display: true, text: 'Ledighed (%)' },
                            ticks: {
                                ...chartConfig.scales.y.ticks,
                                callback: v => v.toFixed(1) + '%'
                            }
                        },
                        y1: {
                            type: 'linear',
                            position: 'right',
                            grid: { drawOnChartArea: false },
                            title: { display: true, text: 'Inflation (%)' },
                            ticks: { callback: v => v.toFixed(1) + '%' }
                        },
                        x: {
                            ...chartConfig.scales.x,
                            title: { display: true, text: 'År' }
                        }
                    }
                },
                plugins: [{
                    id: 'htmlLegend',
                    afterUpdate(chart, args, options) {
                        const container = document.getElementById(options.containerID);
                        if (!container) return;

                        let legendRoot = container.querySelector('div.custom-legend-grid');
                        if (!legendRoot) {
                            legendRoot = document.createElement('div');
                            legendRoot.className = 'custom-legend-grid';
                            legendRoot.style.display = 'grid';
                            legendRoot.style.gridTemplateColumns = `repeat(${countries.length}, 1fr)`;
                            legendRoot.style.gap = '15px 20px';
                            legendRoot.style.padding = '0 10px 15px 10px';
                            legendRoot.style.fontSize = '12px';
                            legendRoot.style.fontFamily = 'Inter, sans-serif';
                            container.appendChild(legendRoot);
                        }
                        legendRoot.innerHTML = '';

                        const numCountries = countries.length;
                        for (let i = 0; i < numCountries; i++) {
                            const col = document.createElement('div');
                            col.style.display = 'flex';
                            col.style.flexDirection = 'column';
                            col.style.gap = '6px';
                            legendRoot.appendChild(col);

                            [i, i + numCountries].forEach(idx => {
                                const dataset = chart.data.datasets[idx];
                                if (!dataset) return;

                                const itemEl = document.createElement('div');
                                itemEl.style.display = 'flex';
                                itemEl.style.alignItems = 'center';
                                itemEl.style.cursor = 'pointer';
                                itemEl.style.opacity = !chart.isDatasetVisible(idx) ? '0.4' : '1';
                                itemEl.style.textDecoration = !chart.isDatasetVisible(idx) ? 'line-through' : 'none';

                                itemEl.onclick = () => {
                                    chart.setDatasetVisibility(idx, !chart.isDatasetVisible(idx));
                                    chart.update();
                                };

                                const box = document.createElement('span');
                                box.style.display = 'inline-block';
                                box.style.width = '24px';
                                box.style.height = '12px';
                                box.style.marginRight = '8px';
                                box.style.backgroundColor = dataset.backgroundColor;
                                box.style.border = `2px solid ${dataset.borderColor}`;
                                box.style.flexShrink = '0';

                                if (idx >= numCountries) { // It's inflation
                                    box.style.borderStyle = 'dashed';
                                    itemEl.style.fontStyle = 'italic';
                                    itemEl.style.fontSize = '11px';
                                    itemEl.style.color = '#666';
                                } else {
                                    itemEl.style.fontWeight = '500';
                                }

                                const text = document.createElement('span');
                                text.textContent = dataset.label.split(' - ')[1]; // Just 'Ledighed (%)' or 'Inflation (%)'

                                // Add Country label at the top of the column if it's the first item
                                if (idx === i) {
                                    const countryLabel = document.createElement('div');
                                    countryLabel.textContent = countryNames[countries[i]];
                                    countryLabel.style.fontWeight = 'bold';
                                    countryLabel.style.marginBottom = '2px';
                                    col.appendChild(countryLabel);
                                }

                                itemEl.appendChild(box);
                                itemEl.appendChild(text);
                                col.appendChild(itemEl);
                            });
                        }
                    }
                }]
            });
        });
}

// Create Okun's Law Chart - Shows relationship between GDP growth and unemployment change
function createOkunsLawChart(canvasId, countries = ['DNK', 'DEU', 'SWE', 'NOR']) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Color scheme for countries
    const countryColors = {
        'DNK': 'rgb(255, 99, 132)',
        'DEU': 'rgb(54, 162, 235)',
        'SWE': 'rgb(255, 206, 86)',
        'NOR': 'rgb(75, 192, 192)',
        'USA': 'rgb(153, 102, 255)',
        'FRA': 'rgb(255, 159, 64)',
        'GBR': 'rgb(199, 199, 199)',
        'KOR': 'rgb(0, 71, 160)'
    };

    // Country names for display
    const countryNames = {
        'DNK': 'Danmark',
        'DEU': 'Tyskland',
        'SWE': 'Sverige',
        'NOR': 'Norge',
        'USA': 'USA',
        'FRA': 'Frankrig',
        'GBR': 'Storbritannien',
        'KOR': 'Sydkorea'
    };

    // Fetch GDP and unemployment data for all countries
    Promise.all([
        Promise.all(countries.map(country => fetchGDPData([country], 30))),
        Promise.all(countries.map(country => fetchUnemploymentInflationData(country, 30)))
    ]).then(([gdpDataArray, unemploymentDataArray]) => {
        // Process data to calculate GDP growth and unemployment change
        const datasets = [];

        countries.forEach((country, index) => {
            const gdpData = gdpDataArray[index];
            const unemploymentData = unemploymentDataArray[index];

            if (!gdpData || !gdpData.datasets || !gdpData.datasets[0] || !unemploymentData) {
                return;
            }

            const gdpLabels = gdpData.labels || [];
            const gdpValues = gdpData.datasets[0].data || [];
            const unemploymentLabels = unemploymentData.labels || [];
            const unemploymentValues = unemploymentData.unemployment || [];

            // Create maps for easier lookup
            const gdpMap = new Map();
            gdpLabels.forEach((year, idx) => {
                if (gdpValues[idx] !== null && gdpValues[idx] !== undefined && !isNaN(gdpValues[idx])) {
                    gdpMap.set(year, gdpValues[idx]);
                }
            });

            const unemploymentMap = new Map();
            unemploymentLabels.forEach((year, idx) => {
                if (unemploymentValues[idx] !== null && unemploymentValues[idx] !== undefined && !isNaN(unemploymentValues[idx])) {
                    unemploymentMap.set(year, unemploymentValues[idx]);
                }
            });

            // Get all years that have both GDP and unemployment data
            const allYears = Array.from(new Set([...gdpMap.keys(), ...unemploymentMap.keys()])).sort();

            // Calculate GDP growth rate (year-over-year percentage change)
            const gdpGrowth = [];
            const unemploymentChange = [];
            const validLabels = [];

            for (let i = 1; i < allYears.length; i++) {
                const currYear = allYears[i];
                const prevYear = allYears[i - 1];

                const prevGDP = gdpMap.get(prevYear);
                const currGDP = gdpMap.get(currYear);
                const prevUnemployment = unemploymentMap.get(prevYear);
                const currUnemployment = unemploymentMap.get(currYear);

                // Skip if data is missing
                if (prevGDP === undefined || currGDP === undefined ||
                    prevUnemployment === undefined || currUnemployment === undefined) {
                    continue;
                }

                // Calculate GDP growth rate (%)
                const gdpGrowthRate = ((currGDP - prevGDP) / prevGDP) * 100;

                // Calculate unemployment change (percentage points)
                const unemploymentDelta = currUnemployment - prevUnemployment;

                gdpGrowth.push(Number(gdpGrowthRate.toFixed(2)));
                unemploymentChange.push(Number(unemploymentDelta.toFixed(2)));
                validLabels.push(currYear);
            }

            if (gdpGrowth.length > 0) {
                const color = countryColors[country] || 'rgb(128, 128, 128)';
                const rgbMatch = color.match(/\d+/g);
                const rgbaColor = rgbMatch ? `rgba(${rgbMatch[0]}, ${rgbMatch[1]}, ${rgbMatch[2]}, 0.6)` : color;

                datasets.push({
                    label: countryNames[country] || country,
                    data: gdpGrowth.map((growth, idx) => ({
                        x: growth,
                        y: unemploymentChange[idx]
                    })),
                    backgroundColor: rgbaColor,
                    borderColor: color,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    showLine: false // Scatter plot
                });
            }
        });

        // Use labels from first dataset
        const chartLabels = datasets.length > 0 ? datasets[0].data.map((_, idx) => validLabels[idx] || '') : [];

        new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: datasets
            },
            options: {
                ...chartConfig,
                plugins: {
                    ...chartConfig.plugins,
                    title: {
                        display: true,
                        text: "Okun's lov - Sammenhæng mellem BNP-vækst og ledighedsændring",
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
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const point = context.raw;
                                const datasetLabel = context.dataset.label || '';
                                return `${datasetLabel}: BNP-vækst: ${point.x.toFixed(2)}%, Ledighedsændring: ${point.y > 0 ? '+' : ''}${point.y.toFixed(2)} pp`;
                            }
                        }
                    }
                },
                scales: {
                    ...chartConfig.scales,
                    x: {
                        ...chartConfig.scales.x,
                        title: {
                            display: true,
                            text: 'BNP-vækst (%)',
                            font: {
                                size: 12,
                                weight: 'bold',
                                family: 'Inter, sans-serif'
                            }
                        },
                        ticks: {
                            callback: function (value) {
                                return value.toFixed(1) + '%';
                            }
                        }
                    },
                    y: {
                        ...chartConfig.scales.y,
                        title: {
                            display: true,
                            text: 'Ændring i ledighed (procentpoint)',
                            font: {
                                size: 12,
                                weight: 'bold',
                                family: 'Inter, sans-serif'
                            }
                        },
                        ticks: {
                            callback: function (value) {
                                return (value > 0 ? '+' : '') + value.toFixed(1) + ' pp';
                            }
                        }
                    }
                }
            }
        });
    }).catch(error => {
        console.error('Error creating Okun\'s Law chart:', error);
        // Fallback: create chart with mock data
        createOkunsLawChartMock(ctx, countries);
    });
}

// Fallback function with mock data for Okun's Law
function createOkunsLawChartMock(ctx, countries) {
    const countryColors = {
        'DNK': 'rgb(255, 99, 132)',
        'DEU': 'rgb(54, 162, 235)',
        'SWE': 'rgb(255, 206, 86)',
        'NOR': 'rgb(75, 192, 192)'
    };

    const countryNames = {
        'DNK': 'Danmark',
        'DEU': 'Tyskland',
        'SWE': 'Sverige',
        'NOR': 'Norge'
    };

    // Generate mock data based on Okun's Law relationship
    // Typical relationship: 1% GDP growth above trend reduces unemployment by ~0.5 percentage points
    const datasets = countries.map((country, index) => {
        const points = [];
        // Generate points showing negative relationship
        for (let i = 0; i < 20; i++) {
            const gdpGrowth = -2 + (i * 0.4); // GDP growth from -2% to 6%
            // Okun's Law: unemployment change ≈ -0.5 * (GDP growth - trend growth)
            // Assuming trend growth of 2%
            const unemploymentChange = -0.5 * (gdpGrowth - 2) + (Math.random() - 0.5) * 0.3;
            points.push({
                x: Number(gdpGrowth.toFixed(2)),
                y: Number(unemploymentChange.toFixed(2))
            });
        }

        const color = countryColors[country] || 'rgb(128, 128, 128)';
        const rgbMatch = color.match(/\d+/g);
        const rgbaColor = rgbMatch ? `rgba(${rgbMatch[0]}, ${rgbMatch[1]}, ${rgbMatch[2]}, 0.6)` : color;

        return {
            label: countryNames[country] || country,
            data: points,
            backgroundColor: rgbaColor,
            borderColor: color,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            showLine: false
        };
    });

    new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: datasets
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: "Okun's lov - Sammenheng mellem BNP-vækst og ledighedsændring",
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
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const point = context.raw;
                            const datasetLabel = context.dataset.label || '';
                            return `${datasetLabel}: BNP-vækst: ${point.x.toFixed(2)}%, Ledighedsændring: ${point.y > 0 ? '+' : ''}${point.y.toFixed(2)} pp`;
                        }
                    }
                }
            },
            scales: {
                ...chartConfig.scales,
                x: {
                    ...chartConfig.scales.x,
                    title: {
                        display: true,
                        text: 'BNP-vækst (%)',
                        font: {
                            size: 12,
                            weight: 'bold',
                            family: 'Inter, sans-serif'
                        }
                    },
                    ticks: {
                        callback: function (value) {
                            return value.toFixed(1) + '%';
                        }
                    }
                },
                y: {
                    ...chartConfig.scales.y,
                    title: {
                        display: true,
                        text: 'Ændring i ledighed (procentpoint)',
                        font: {
                            size: 12,
                            weight: 'bold',
                            family: 'Inter, sans-serif'
                        }
                    },
                    ticks: {
                        callback: function (value) {
                            return (value > 0 ? '+' : '') + value.toFixed(1) + ' pp';
                        }
                    }
                }
            }
        }
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

// Create National Accounts Chart (Enhanced)
function createNationalAccountsChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    fetchNationalAccounts(20).then(data => {
        const chartCtx = ctx.getContext('2d');

        // Helper to create gradients
        const createGradient = (color) => {
            const gradient = chartCtx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, color.replace('rgb', 'rgba').replace(')', ', 0.3)'));
            gradient.addColorStop(1, color.replace('rgb', 'rgba').replace(')', ', 0.0)'));
            return gradient;
        };

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'BNP (mia. kr.)',
                        data: data.bnp,
                        borderColor: '#4bc0c0',
                        backgroundColor: createGradient('rgb(75, 192, 192)'),
                        tension: 0.4,
                        fill: true,
                        borderWidth: 3,
                        pointRadius: 2,
                        pointHoverRadius: 6,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Forbrug (mia. kr.)',
                        data: data.consumption,
                        borderColor: '#ffce56',
                        backgroundColor: createGradient('rgb(255, 206, 86)'),
                        tension: 0.4,
                        fill: true,
                        borderWidth: 2,
                        pointRadius: 2,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Eksport (mia. kr.)',
                        data: data.export,
                        borderColor: '#ff6384',
                        backgroundColor: createGradient('rgb(255, 99, 132)'),
                        tension: 0.4,
                        fill: true,
                        borderWidth: 2,
                        pointRadius: 2,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Import (mia. kr.)',
                        data: data.import,
                        borderColor: '#36a2eb',
                        backgroundColor: createGradient('rgb(54, 162, 235)'),
                        tension: 0.4,
                        fill: true,
                        borderWidth: 2,
                        pointRadius: 2,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Investering (mia. kr.)',
                        data: data.investment,
                        borderColor: '#9966ff',
                        backgroundColor: createGradient('rgb(153, 102, 255)'),
                        tension: 0.4,
                        fill: true,
                        borderWidth: 2,
                        pointRadius: 2,
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                ...chartConfig,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    ...chartConfig.plugins,
                    title: {
                        display: true,
                        text: 'Nationalregnskabets Udvikling (Realvækst)',
                        font: { size: 18, weight: 'bold', family: 'Inter, sans-serif' }
                    },
                    annotation: {
                        annotations: {
                            crisis2008: {
                                type: 'line',
                                xMin: '2008',
                                xMax: '2008',
                                borderColor: 'rgba(255, 99, 132, 0.5)',
                                borderWidth: 2,
                                borderDash: [6, 6],
                                label: {
                                    display: true,
                                    content: 'Finanskrise',
                                    position: 'start',
                                    backgroundColor: 'rgba(255, 99, 132, 0.8)',
                                    font: { size: 10 }
                                }
                            },
                            covid2020: {
                                type: 'line',
                                xMin: '2020',
                                xMax: '2020',
                                borderColor: 'rgba(54, 162, 235, 0.5)',
                                borderWidth: 2,
                                borderDash: [6, 6],
                                label: {
                                    display: true,
                                    content: 'COVID-19',
                                    position: 'start',
                                    backgroundColor: 'rgba(54, 162, 235, 0.8)',
                                    font: { size: 10 }
                                }
                            }
                        }
                    }
                },
                scales: {
                    ...chartConfig.scales,
                    y: {
                        ...chartConfig.scales.y,
                        beginAtZero: true,
                        title: { display: true, text: 'Milliarder kr.' }
                    }
                }
            }
        });
    });
}

// Create Advanced GDP Bubble Chart (GDP vs GDP per Capita)
function createGDPBubbleChart(canvasId, countries) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const countryNamesLocal = {
        'DNK': 'Danmark', 'DEU': 'Tyskland', 'SWE': 'Sverige', 'NOR': 'Norge', 'USA': 'USA',
        'JPN': 'Japan', 'CHN': 'Kina', 'IND': 'Indien', 'RUS': 'Rusland', 'GBR': 'Storbritannien',
        'TUR': 'Tyrkiet', 'BRA': 'Brasilien', 'ITA': 'Italien', 'ESP': 'Spanien', 'GRC': 'Grækenland', 'ARG': 'Argentina', 'KOR': 'Sydkorea'
    };

    // Colors for countries (same as in fetchGDPData)
    const colors = [
        { border: 'rgb(75, 192, 192)', background: 'rgba(75, 192, 192, 0.2)' },
        { border: 'rgb(255, 99, 132)', background: 'rgba(255, 99, 132, 0.2)' },
        { border: 'rgb(54, 162, 235)', background: 'rgba(54, 162, 235, 0.2)' },
        { border: 'rgb(255, 206, 86)', background: 'rgba(255, 206, 86, 0.2)' },
        { border: 'rgb(153, 102, 255)', background: 'rgba(153, 102, 255, 0.2)' },
        { border: 'rgb(199, 199, 199)', background: 'rgba(199, 199, 199, 0.2)' },
        { border: 'rgb(83, 102, 255)', background: 'rgba(83, 102, 255, 0.2)' },
        { border: 'rgb(255, 99, 255)', background: 'rgba(255, 99, 255, 0.2)' },
        { border: 'rgb(99, 255, 132)', background: 'rgba(99, 255, 132, 0.2)' }
    ];

    // Fetch both GDP and GDP per capita
    Promise.all([
        fetchGDPData(countries, 1), // Get most recent GDP
        fetchGDPPerCapitaData(countries, 1) // Get most recent GDP per Capita
    ]).then(([gdpData, gdpPerCapitaData]) => {
        // Ensure we have datasets
        if (!gdpData || !gdpData.datasets) gdpData = { datasets: [] };
        if (!gdpPerCapitaData || !gdpPerCapitaData.datasets) gdpPerCapitaData = { datasets: [] };

        const bubbleData = {
            datasets: countries.map((countryCode, index) => {
                const name = countryNamesLocal[countryCode] || countryCode;
                const gdpDataset = gdpData.datasets.find(ds => ds.label === name);
                const gdpPerCapitaDataset = gdpPerCapitaData.datasets.find(ds => ds.label === name);

                if (!gdpDataset || !gdpPerCapitaDataset) return null;
                if (!gdpDataset.data || gdpDataset.data.length === 0) return null;
                if (!gdpPerCapitaDataset.data || gdpPerCapitaDataset.data.length === 0) return null;

                const gdpValue = gdpDataset.data[gdpDataset.data.length - 1]; // Latest GDP in billions
                const gdpPerCapitaValue = gdpPerCapitaDataset.data[gdpPerCapitaDataset.data.length - 1]; // Latest GDP per Capita

                // Check for valid values
                if (gdpValue === null || gdpValue === undefined || isNaN(gdpValue)) return null;
                if (gdpPerCapitaValue === null || gdpPerCapitaValue === undefined || isNaN(gdpPerCapitaValue)) return null;

                // For bubble size, let's use GDP (scaled)
                const size = Math.sqrt(Math.abs(gdpValue)) * 0.3;

                return {
                    label: name,
                    data: [{
                        x: gdpValue,
                        y: gdpPerCapitaValue,
                        r: size
                    }],
                    backgroundColor: gdpDataset.backgroundColor || colors[index % colors.length].background,
                    borderColor: gdpDataset.borderColor || colors[index % colors.length].border,
                    borderWidth: 2
                };
            }).filter(d => d !== null && d.data && d.data.length > 0)
        };

        // If no data, show error message or use fallback
        if (bubbleData.datasets.length === 0) {
            console.error('No bubble chart data available');
            // Create a minimal chart with error message
            bubbleData.datasets = [{
                label: 'Ingen data tilgængelig',
                data: [{ x: 1, y: 1, r: 1 }],
                backgroundColor: 'rgba(200, 200, 200, 0.2)',
                borderColor: 'rgba(200, 200, 200, 1)',
                borderWidth: 2
            }];
        }

        new Chart(ctx, {
            type: 'bubble',
            data: bubbleData,
            options: {
                ...chartConfig,
                plugins: {
                    ...chartConfig.plugins,
                    title: {
                        display: true,
                        text: 'Velstand vs. Økonomisk Størrelse (Boblediagram)',
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
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                label += `BNP: ${context.raw.x.toFixed(0)} mia.USD, Velstand: ${context.raw.y.toLocaleString('da-DK')} USD / indb.`;
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'logarithmic',
                        title: {
                            display: true,
                            text: 'Samlet BNP (milliarder USD, log-skala)',
                            font: {
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            callback: function (value) {
                                return value.toLocaleString('da-DK');
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'BNP pr. indbygger (USD)',
                            font: {
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            callback: function (value) {
                                return value.toLocaleString('da-DK');
                            }
                        }
                    }
                }
            }
        });
    }).catch(error => {
        console.error('Error creating bubble chart:', error);
        // Create a fallback chart with cached data if available
        loadCachedChartData().then(cache => {
            if (cache && cache.gdp && cache.gdpPerCapita && cache.gdp.data && cache.gdpPerCapita.data) {
                const bubbleData = {
                    datasets: countries.map((countryCode, index) => {
                        const name = countryNamesLocal[countryCode] || countryCode;
                        const gdpData = cache.gdp.data[countryCode];
                        const gdpPerCapitaData = cache.gdpPerCapita.data[countryCode];

                        if (!gdpData || !gdpPerCapitaData || gdpData.length === 0 || gdpPerCapitaData.length === 0) {
                            return null;
                        }

                        const latestGDP = gdpData[gdpData.length - 1];
                        const latestGDPPerCapita = gdpPerCapitaData[gdpPerCapitaData.length - 1];

                        if (!latestGDP || !latestGDPPerCapita) return null;

                        const gdpValue = latestGDP.value / 1000000000; // Convert to billions
                        const gdpPerCapitaValue = latestGDPPerCapita.value;
                        const size = Math.sqrt(Math.abs(gdpValue)) * 0.3;

                        return {
                            label: name,
                            data: [{
                                x: gdpValue,
                                y: gdpPerCapitaValue,
                                r: size
                            }],
                            backgroundColor: colors[index % colors.length].background,
                            borderColor: colors[index % colors.length].border,
                            borderWidth: 2
                        };
                    }).filter(d => d !== null && d.data && d.data.length > 0)
                };

                if (bubbleData.datasets.length > 0) {
                    new Chart(ctx, {
                        type: 'bubble',
                        data: bubbleData,
                        options: {
                            ...chartConfig,
                            plugins: {
                                ...chartConfig.plugins,
                                title: {
                                    display: true,
                                    text: 'Velstand vs. Økonomisk Størrelse (Boblediagram)',
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
                                tooltip: {
                                    callbacks: {
                                        label: function (context) {
                                            let label = context.dataset.label || '';
                                            if (label) label += ': ';
                                            label += `BNP: ${context.raw.x.toFixed(0)} mia.USD, Velstand: ${context.raw.y.toLocaleString('da-DK')} USD / indb.`;
                                            return label;
                                        }
                                    }
                                }
                            },
                            scales: {
                                x: {
                                    type: 'logarithmic',
                                    title: {
                                        display: true,
                                        text: 'Samlet BNP (milliarder USD, log-skala)',
                                        font: {
                                            weight: 'bold'
                                        }
                                    },
                                    ticks: {
                                        callback: function (value) {
                                            return value.toLocaleString('da-DK');
                                        }
                                    }
                                },
                                y: {
                                    title: {
                                        display: true,
                                        text: 'BNP pr. indbygger (USD)',
                                        font: {
                                            weight: 'bold'
                                        }
                                    },
                                    ticks: {
                                        callback: function (value) {
                                            return value.toLocaleString('da-DK');
                                        }
                                    }
                                }
                            }
                        }
                    });
                }
            }
        });
    });
}

// Create Pie Chart for Supply and Use (Forsyningsbalance)
function createSupplyAndUsePieChart(canvasId, type = 'use') {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Latest data simulation (2024 ballpark figures in mia.kr.)
    const dataSet = type === 'use' ? {
        labels: ['Privat forbrug', 'Offentligt forbrug', 'Investeringer', 'Eksport'],
        data: [1200, 600, 600, 1500],
        colors: ['#4bc0c0', '#36a2eb', '#9966ff', '#ff6384'],
        title: 'Anvendelse af varer og tjenester (BNP + Import)'
    } : {
        labels: ['Produktion (BNP)', 'Import'],
        data: [2800, 1300],
        colors: ['#4bc0c0', '#36a2eb'],
        title: 'Tilgang af varer og tjenester'
    };

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: dataSet.labels,
            datasets: [{
                data: dataSet.data,
                backgroundColor: dataSet.colors,
                hoverOffset: 4
            }]
        },
        options: {
            ...chartConfig,
            scales: {},
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: dataSet.title,
                    font: {
                        size: 16,
                        weight: 'bold',
                        family: 'Inter, sans-serif'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${value} mia.kr. (${percentage} %)`;
                        }
                    }
                }
            }
        }
    });
}

// Create Pie Chart for BFI (Bruttofaktorindkomst)
function createBFIPieChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Løn til ansatte', 'Nettooverskud/Blandet indkomst', 'Forbrug af fast realkapital'],
            datasets: [{
                data: [59, 22, 19],
                backgroundColor: ['#4bc0c0', '#36a2eb', '#ffce56'],
                hoverOffset: 4
            }]
        },
        options: {
            ...chartConfig,
            scales: {},
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'Fordeling af Bruttofaktorindkomst (BFI)',
                    font: {
                        size: 16,
                        weight: 'bold',
                        family: 'Inter, sans-serif'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.label}: ${context.raw}% `;
                        }
                    }
                }
            }
        }
    });
}

// Create Pie Chart for Employment by Sector (Erhvervsfordeling)
function createEmploymentSectorPieChart(canvasId, country = 'DK') {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Data for different countries (percentage of employment by sector)
    const countryData = {
        'DK': {
            labels: ['Primære erhverv (landbrug, fiskeri)', 'Industri', 'Serviceerhverv', 'Offentlig sektor'],
            data: [2.6, 15, 51.4, 31],
            colors: ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3'],
            title: 'Erhvervsfordeling i Danmark (2024)',
            countryName: 'Danmark',
            note: 'Bemærk: Serviceerhverv og offentlig sektor er opdelt. Serviceerhverv inkluderer handel, transport, finans osv.'
        },
        'CN': {
            labels: ['Landbrug', 'Industri', 'Service', 'Offentlig sektor'],
            data: [22.2, 29.0, 34.8, 14.0],
            colors: ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3'],
            title: 'Erhvervsfordeling i Kina (2024)',
            countryName: 'Kina'
        },
        'IN': {
            labels: ['Landbrug', 'Industri', 'Service', 'Offentlig sektor'],
            data: [46.1, 11.4, 29.5, 13.0],
            colors: ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3'],
            title: 'Erhvervsfordeling i Indien (2023)',
            countryName: 'Indien'
        },
        'US': {
            labels: ['Landbrug', 'Industri', 'Service', 'Offentlig sektor'],
            data: [1.4, 19.1, 63.5, 16.0],
            colors: ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3'],
            title: 'Erhvervsfordeling i USA (2024)',
            countryName: 'USA'
        },
        'DE': {
            labels: ['Landbrug', 'Industri', 'Service', 'Offentlig sektor'],
            data: [1.3, 27.7, 57.0, 14.0],
            colors: ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3'],
            title: 'Erhvervsfordeling i Tyskland (2024)',
            countryName: 'Tyskland'
        },
        'BR': {
            labels: ['Landbrug', 'Industri', 'Service', 'Offentlig sektor'],
            data: [9.1, 20.7, 56.2, 14.0],
            colors: ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3'],
            title: 'Erhvervsfordeling i Brasilien (2024)',
            countryName: 'Brasilien'
        }
    };

    const data = countryData[country] || countryData['DK'];

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.data,
                backgroundColor: data.colors,
                hoverOffset: 4
            }]
        },
        options: {
            ...chartConfig,
            scales: {},
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: data.title,
                    font: {
                        size: 16,
                        weight: 'bold',
                        family: 'Inter, sans-serif'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${value}%`;
                        }
                    }
                }
            }
        }
    });
}

// Create Detailed Balance of Payments Components Chart (Stacked Bar)
function createBOPDetailedChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Data for 2023 (mia. kr.)
    const data = {
        labels: ['Betalingsbalancen 2023'],
        datasets: [
            {
                label: 'Varebalance',
                data: [178],
                backgroundColor: 'rgba(75, 192, 192, 0.8)',
            },
            {
                label: 'Tjenestebalance',
                data: [126],
                backgroundColor: 'rgba(54, 162, 235, 0.8)',
            },
            {
                label: 'Løn & Formue',
                data: [92],
                backgroundColor: 'rgba(153, 102, 255, 0.8)',
            },
            {
                label: 'Løbende overførsler',
                data: [-54],
                backgroundColor: 'rgba(255, 99, 132, 0.8)',
            }
        ]
    };

    new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            ...chartConfig,
            indexAxis: 'y', // Changed to 'y' for horizontal stacked bars
            scales: {
                x: {
                    stacked: true,
                    title: { display: true, text: 'Mia. kr.' }
                },
                y: { stacked: true }
            },
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'Sammensætning af overskuddet (Samlet: +342 mia. kr.)',
                    font: { size: 16, weight: 'bold' }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${context.raw} mia.kr.`;
                        }
                    }
                }
            }
        }
    });
}

// Create Human Development Index (HDI) Bar Chart
function createHDIChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // HDI data for various countries (2022/2023 data from UNDP)
    // HDI ranges from 0 to 1, where 1 is the highest human development
    // Selected diverse set of countries across different development levels
    const selectedCountries = [
        // Very High HDI (≥ 0.800)
        { country: 'Schweiz', value: 0.962 },
        { country: 'Norge', value: 0.961 },
        { country: 'Island', value: 0.959 },
        { country: 'Hongkong', value: 0.956 },
        { country: 'Danmark', value: 0.948 },
        { country: 'Sverige', value: 0.947 },
        { country: 'Irland', value: 0.945 },
        { country: 'Tyskland', value: 0.943 },
        { country: 'Nederlandene', value: 0.941 },
        { country: 'Finland', value: 0.940 },
        { country: 'Singapore', value: 0.939 },
        { country: 'Belgien', value: 0.937 },
        { country: 'New Zealand', value: 0.937 },
        { country: 'Canada', value: 0.935 },
        { country: 'Storbritannien', value: 0.929 },
        { country: 'Japan', value: 0.925 },
        { country: 'Sydkorea', value: 0.925 },
        { country: 'USA', value: 0.921 },
        { country: 'Spanien', value: 0.909 },
        { country: 'Frankrig', value: 0.903 },
        { country: 'Italien', value: 0.895 },
        { country: 'Grækenland', value: 0.887 },
        { country: 'Polen', value: 0.881 },
        { country: 'Portugal', value: 0.874 },
        // High HDI (0.700-0.799)
        { country: 'Chile', value: 0.855 },
        { country: 'Argentina', value: 0.849 },
        { country: 'Rumænien', value: 0.844 },
        { country: 'Rusland', value: 0.802 },
        { country: 'Brasilien', value: 0.754 },
        { country: 'Kina', value: 0.788 },
        { country: 'Colombia', value: 0.762 },
        { country: 'Thailand', value: 0.800 },
        { country: 'Mexiko', value: 0.789 },
        // Medium HDI (0.550-0.699)
        { country: 'Indien', value: 0.644 },
        { country: 'Filippinerne', value: 0.699 },
        { country: 'Vietnam', value: 0.726 },
        { country: 'Egypten', value: 0.731 },
        { country: 'Marokko', value: 0.683 },
        { country: 'Bangladesh', value: 0.661 },
        // Low HDI (< 0.550)
        { country: 'Kenya', value: 0.601 },
        { country: 'Pakistan', value: 0.540 },
        { country: 'Nigeria', value: 0.548 },
        { country: 'Zimbabwe', value: 0.593 },
        { country: 'Uganda', value: 0.525 },
        { country: 'Tanzania', value: 0.549 },
        { country: 'Afghanistan', value: 0.478 },
        { country: 'Niger', value: 0.394 }
    ].sort((a, b) => b.value - a.value); // Sort by HDI value descending

    // Color coding based on HDI level, with special marking for Denmark
    const getColor = (value, country) => {
        // Mark Denmark with a distinct red color
        if (country === 'Danmark') {
            return {
                backgroundColor: 'rgba(220, 53, 69, 0.9)',  // Red color for Denmark
                borderColor: 'rgba(220, 53, 69, 1)',
                borderWidth: 3  // Thicker border for Denmark
            };
        }
        // Regular color coding for other countries
        let bgColor, borderColor;
        if (value >= 0.800) {
            bgColor = 'rgba(46, 125, 50, 0.8)';      // Very High (Green)
            borderColor = 'rgba(46, 125, 50, 1)';
        } else if (value >= 0.700) {
            bgColor = 'rgba(76, 175, 80, 0.8)';      // High (Light Green)
            borderColor = 'rgba(76, 175, 80, 1)';
        } else if (value >= 0.550) {
            bgColor = 'rgba(255, 193, 7, 0.8)';      // Medium (Yellow)
            borderColor = 'rgba(255, 193, 7, 1)';
        } else {
            bgColor = 'rgba(244, 67, 54, 0.8)';      // Low (Red)
            borderColor = 'rgba(244, 67, 54, 1)';
        }
        return {
            backgroundColor: bgColor,
            borderColor: borderColor,
            borderWidth: 1
        };
    };

    const countries = selectedCountries.map(item => item.country);
    const values = selectedCountries.map(item => item.value);
    const colors = selectedCountries.map(item => getColor(item.value, item.country));

    const data = {
        labels: countries,
        datasets: [{
            label: 'Human Development Index (HDI)',
            data: values,
            backgroundColor: colors.map(c => c.backgroundColor),
            borderColor: colors.map(c => c.borderColor),
            borderWidth: colors.map(c => c.borderWidth)
        }]
    };

    new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            ...chartConfig,
            indexAxis: 'y', // Horizontal bars
            scales: {
                x: {
                    ...chartConfig.scales.x,
                    min: 0,
                    max: 1,
                    title: {
                        display: true,
                        text: 'Human Development Index (HDI)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        ...chartConfig.scales.x.ticks,
                        callback: function (value) {
                            return value.toFixed(3);
                        }
                    }
                },
                y: {
                    ...chartConfig.scales.y,
                    beginAtZero: false,
                    ticks: {
                        font: {
                            size: 8,  // Very small font for country names
                            family: 'Inter, sans-serif'
                        },
                        padding: 2,  // Reduce padding to fit more countries
                        color: '#333',
                        // Use labels directly from data.labels array
                        callback: function (value, index, ticks) {
                            // Chart.js with indexAxis: 'y' automatically maps labels
                            // Return the label from our data.labels array
                            if (data && data.labels && data.labels[index] !== undefined) {
                                return data.labels[index];
                            }
                            return '';
                        }
                    },
                    grid: {
                        display: false  // Hide grid lines on y-axis
                    }
                }
            },
            plugins: {
                ...chartConfig.plugins,
                legend: {
                    display: false
                },
                tooltip: {
                    ...chartConfig.plugins.tooltip,
                    callbacks: {
                        label: function (context) {
                            const value = context.raw;
                            let category = '';
                            if (value >= 0.800) category = ' (Meget høj)';
                            else if (value >= 0.700) category = ' (Høj)';
                            else if (value >= 0.550) category = ' (Medium)';
                            else category = ' (Lav)';
                            return `HDI: ${value.toFixed(3)}${category}`;
                        }
                    }
                }
            }
        }
    });
}

// Create GDP Per Capita Bar Chart (International Comparison)
function createGDPPerCapitaBarChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // GDP per capita data for various countries (2024/2023 data, USD)
    // Selected diverse set of countries across different income levels
    const selectedCountries = [
        // Very High Income (≥ $40,000)
        { country: 'Monaco', value: 256581 },
        { country: 'Liechtenstein', value: 210704 },
        { country: 'Luxembourg', value: 137517 },
        { country: 'Irland', value: 107316 },
        { country: 'Schweiz', value: 103670 },
        { country: 'Singapore', value: 90674 },
        { country: 'Norge', value: 86810 },
        { country: 'USA', value: 85810 },
        { country: 'Island', value: 82704 },
        { country: 'Qatar', value: 76276 },
        { country: 'Danmark', value: 71852 },
        { country: 'Nederlandene', value: 68219 },
        { country: 'Australia', value: 64407 },
        { country: 'Sverige', value: 57723 },
        { country: 'Tyskland', value: 55800 },
        { country: 'Canada', value: 54283 },
        { country: 'Belgien', value: 55955 },
        { country: 'Storbritannien', value: 49295 },
        { country: 'Frankrig', value: 47883 },
        { country: 'Japan', value: 33797 },
        { country: 'Sydkorea', value: 35197 },
        { country: 'Italien', value: 37206 },
        { country: 'Spanien', value: 31831 },
        { country: 'Grækenland', value: 23573 },
        { country: 'Portugal', value: 26301 },
        { country: 'Polen', value: 23006 },
        // High Income ($12,000-$40,000)
        { country: 'Chile', value: 15920 },
        { country: 'Rumænien', value: 16290 },
        { country: 'Rusland', value: 13007 },
        { country: 'Thailand', value: 7823 },
        { country: 'Argentina', value: 11582 },
        { country: 'Brasilien', value: 9144 },
        { country: 'Kina', value: 12940 },
        { country: 'Colombia', value: 6812 },
        { country: 'Mexiko', value: 11130 },
        { country: 'Sydafrika', value: 6745 },
        // Medium Income ($3,000-$12,000)
        { country: 'Filippinerne', value: 3861 },
        { country: 'Indien', value: 2533 },
        { country: 'Vietnam', value: 4423 },
        { country: 'Egypten', value: 4928 },
        { country: 'Marokko', value: 4158 },
        { country: 'Bangladesh', value: 2876 },
        { country: 'Indonesien', value: 5159 },
        // Low Income (< $3,000)
        { country: 'Kenya', value: 2276 },
        { country: 'Pakistan', value: 1586 },
        { country: 'Nigeria', value: 2468 },
        { country: 'Uganda', value: 1142 },
        { country: 'Tanzania', value: 1254 },
        { country: 'Ethiopien', value: 1295 },
        { country: 'Niger', value: 595 },
        { country: 'Malawi', value: 655 }
    ].sort((a, b) => b.value - a.value); // Sort by GDP per capita descending

    // Color coding based on income level, with special marking for Denmark
    const getColor = (value, country) => {
        // Mark Denmark with a distinct red color
        if (country === 'Danmark') {
            return {
                backgroundColor: 'rgba(220, 53, 69, 0.9)',  // Red color for Denmark
                borderColor: 'rgba(220, 53, 69, 1)',
                borderWidth: 3  // Thicker border for Denmark
            };
        }
        // Regular color coding for other countries
        let bgColor, borderColor;
        if (value >= 40000) {
            bgColor = 'rgba(46, 125, 50, 0.8)';      // Very High Income (Green)
            borderColor = 'rgba(46, 125, 50, 1)';
        } else if (value >= 12000) {
            bgColor = 'rgba(76, 175, 80, 0.8)';      // High Income (Light Green)
            borderColor = 'rgba(76, 175, 80, 1)';
        } else if (value >= 3000) {
            bgColor = 'rgba(255, 193, 7, 0.8)';      // Medium Income (Yellow)
            borderColor = 'rgba(255, 193, 7, 1)';
        } else {
            bgColor = 'rgba(244, 67, 54, 0.8)';      // Low Income (Red)
            borderColor = 'rgba(244, 67, 54, 1)';
        }
        return {
            backgroundColor: bgColor,
            borderColor: borderColor,
            borderWidth: 1
        };
    };

    const countries = selectedCountries.map(item => item.country);
    const values = selectedCountries.map(item => item.value);
    const colors = selectedCountries.map(item => getColor(item.value, item.country));

    // Format values for display
    const formatValue = (val) => {
        if (val >= 1000) {
            return (val / 1000).toFixed(1) + 'k';
        }
        return val.toFixed(0);
    };

    const data = {
        labels: countries,
        datasets: [{
            label: 'BNP pr. indbygger (USD)',
            data: values,
            backgroundColor: colors.map(c => c.backgroundColor),
            borderColor: colors.map(c => c.borderColor),
            borderWidth: colors.map(c => c.borderWidth)
        }]
    };

    new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            ...chartConfig,
            indexAxis: 'y', // Horizontal bars
            scales: {
                x: {
                    ...chartConfig.scales.x,
                    min: 0,
                    title: {
                        display: true,
                        text: 'BNP pr. indbygger (USD)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        ...chartConfig.scales.x.ticks,
                        callback: function (value) {
                            if (value >= 1000) {
                                return '$' + (value / 1000).toFixed(1) + 'k';
                            }
                            return '$' + value.toFixed(0);
                        }
                    }
                },
                y: {
                    ...chartConfig.scales.y,
                    beginAtZero: false,
                    ticks: {
                        font: {
                            size: 8,  // Very small font for country names
                            family: 'Inter, sans-serif'
                        },
                        padding: 2,  // Reduce padding to fit more countries
                        color: '#333',
                        callback: function (value, index, ticks) {
                            if (data && data.labels && data.labels[index] !== undefined) {
                                return data.labels[index];
                            }
                            return '';
                        }
                    },
                    grid: {
                        display: false  // Hide grid lines on y-axis
                    }
                }
            },
            plugins: {
                ...chartConfig.plugins,
                legend: {
                    display: false
                },
                tooltip: {
                    ...chartConfig.plugins.tooltip,
                    callbacks: {
                        label: function (context) {
                            const value = context.raw;
                            let category = '';
                            if (value >= 40000) category = ' (Meget høj indkomst)';
                            else if (value >= 12000) category = ' (Høj indkomst)';
                            else if (value >= 3000) category = ' (Medium indkomst)';
                            else category = ' (Lav indkomst)';
                            return `BNP pr. indbygger: $${value.toLocaleString('da-DK')}${category}`;
                        }
                    }
                }
            }
        }
    });
}

// Create Sankey Diagram for National Accounts (Supply and Use)
function createNationalAccountsSankey(canvasId) {

    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Robust check for Chart.js and Sankey plugin
    if (typeof Chart === 'undefined') {
        setTimeout(() => createNationalAccountsSankey(canvasId), 200);
        return;
    }

    // Attempt to detect Sankey controller in Chart.js v3/v4
    const isSankeyReady = Chart.registry && Chart.registry.getController ?
        Chart.registry.getController('sankey') :
        Chart.controllers && Chart.controllers.sankey;

    if (!isSankeyReady) {
        console.warn('Sankey controller not found, retrying...');
        setTimeout(() => createNationalAccountsSankey(canvasId), 200);
        return;
    }

    // Data for National Accounts Flow (Mia. kr. - 2024 Skøn)
    const data = [
        { from: 'Produktion (BNP)', to: 'Tilgang / Anvendelse', flow: 2850 },
        { from: 'Import', to: 'Tilgang / Anvendelse', flow: 1300 },
        { from: 'Tilgang / Anvendelse', to: 'Privat Forbrug', flow: 1250 },
        { from: 'Tilgang / Anvendelse', to: 'Offentligt Forbrug', flow: 650 },
        { from: 'Tilgang / Anvendelse', to: 'Investeringer', flow: 650 },
        { from: 'Tilgang / Anvendelse', to: 'Eksport', flow: 1600 }
    ];


    try {
        new Chart(ctx, {
            type: 'sankey',
            data: {
                datasets: [{
                    label: 'Nationalregnskab',
                    data: data,
                    colorFrom: (c) => {
                        const from = c.dataset.data[c.dataIndex].from;
                        if (from === 'Produktion (BNP)') return '#4bc0c0';
                        if (from === 'Import') return '#36a2eb';
                        return '#ff9f40'; // Tilgang / Anvendelse
                    },

                    colorTo: (c) => {
                        const to = c.dataset.data[c.dataIndex].to;
                        if (to === 'Privat Forbrug') return '#ffce56';
                        if (to === 'Offentligt Forbrug') return '#ff9f40';
                        if (to === 'Investeringer') return '#9966ff';
                        if (to === 'Eksport') return '#ff6384';
                        return '#dee2e6';
                    },
                    colorMode: 'gradient',
                    size: 'max',
                    nodeWidth: 40,
                    nodePadding: 30,
                    // Direct labels on nodes
                    font: {
                        family: 'Inter, sans-serif',
                        size: 14,
                        weight: 'bold'
                    },
                    padding: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Nationalregnskabets Kredsløb (Mia. kr.)',
                        font: { size: 18, weight: 'bold', family: 'Inter' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const item = context.dataset.data[context.dataIndex];
                                return `${item.from} → ${item.to}: ${item.flow} mia.kr.`;
                            }
                        }
                    }
                },
                layout: {
                    padding: 20
                }
            }
        });
    } catch (e) {
        console.error('Error creating Sankey chart:', e);
    }
}

function createSavingInvestmentSankey(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Robust check for Chart.js and Sankey plugin
    if (typeof Chart === 'undefined') {
        setTimeout(() => createSavingInvestmentSankey(canvasId), 200);
        return;
    }

    // Attempt to detect Sankey controller in Chart.js v3/v4
    const isSankeyReady = Chart.registry && Chart.registry.getController ?
        Chart.registry.getController('sankey') :
        Chart.controllers && Chart.controllers.sankey;

    if (!isSankeyReady) {
        console.warn('Sankey controller not found, retrying...');
        setTimeout(() => createSavingInvestmentSankey(canvasId), 200);
        return;
    }

    // Data for Saving and Investment Flow (Mia. kr. - Eksempel)
    // S = 750, I = 400, X - IM + RU = 350
    const data = [
        { from: 'Bruttoopsparing (S)', to: 'Finansiering', flow: 750 },
        { from: 'Finansiering', to: 'Investeringer (I)', flow: 400 },
        { from: 'Finansiering', to: 'Betalingsbalancens overskud (X - IM + RU)', flow: 350 }
    ];

    try {
        new Chart(ctx, {
            type: 'sankey',
            data: {
                datasets: [{
                    label: 'Opsparing og investering',
                    data: data,
                    colorFrom: (c) => {
                        const from = c.dataset.data[c.dataIndex].from;
                        if (from === 'Bruttoopsparing (S)') return '#4bc0c0';
                        return '#ff9f40'; // Finansiering
                    },
                    colorTo: (c) => {
                        const to = c.dataset.data[c.dataIndex].to;
                        if (to === 'Investeringer (I)') return '#9966ff';
                        if (to === 'Betalingsbalancens overskud (X - IM + RU)') return '#36a2eb';
                        return '#dee2e6';
                    },
                    colorMode: 'gradient',
                    size: 'max',
                    nodeWidth: 40,
                    nodePadding: 30,
                    font: {
                        family: 'Inter, sans-serif',
                        size: 14,
                        weight: 'bold'
                    },
                    padding: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Opsparing og investering (Mia. kr.)',
                        font: { size: 18, weight: 'bold', family: 'Inter' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const item = context.dataset.data[context.dataIndex];
                                return `${item.from} → ${item.to}: ${item.flow} mia.kr.`;
                            }
                        }
                    }
                },
                layout: {
                    padding: 20
                }
            }
        });
    } catch (e) {
        console.error('Error creating Saving Investment Sankey chart:', e);
    }
}

// Create Output Gap Chart showing the difference between actual and potential GDP
function createOutputGapChart(canvasId, countries = ['DNK', 'DEU', 'SWE', 'NOR']) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Color scheme for countries
    const countryColors = {
        'DNK': 'rgb(255, 99, 132)',
        'DEU': 'rgb(54, 162, 235)',
        'SWE': 'rgb(255, 206, 86)',
        'NOR': 'rgb(75, 192, 192)',
        'USA': 'rgb(153, 102, 255)',
        'FRA': 'rgb(255, 159, 64)',
        'GBR': 'rgb(199, 199, 199)'
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

    // Generate output gap data (simulated based on GDP and unemployment trends)
    // In production, this would come from official statistics
    function generateOutputGapData(country, years = 30) {
        const data = {
            labels: [],
            outputGap: []
        };

        const startYear = new Date().getFullYear() - years;
        let trend = 0; // Starting trend
        let cycle = 0; // Business cycle position

        for (let i = 0; i <= years; i++) {
            const year = startYear + i;
            data.labels.push(year);

            // Simulate business cycle with some randomness
            // Output gap oscillates around 0 with periods of positive and negative gaps
            cycle += (Math.random() - 0.5) * 0.3;
            cycle = Math.max(-2, Math.min(2, cycle)); // Keep cycle within bounds

            // Add some trend based on economic conditions
            trend += (Math.random() - 0.5) * 0.1;
            trend = Math.max(-1, Math.min(1, trend));

            // Simulate major economic events
            let eventImpact = 0;
            if (year >= 2008 && year <= 2009) {
                eventImpact = -3; // Financial crisis
            } else if (year >= 2020 && year <= 2021) {
                eventImpact = -2.5; // COVID-19
            } else if (year >= 2005 && year <= 2007) {
                eventImpact = 1.5; // Pre-crisis boom
            } else if (year >= 2015 && year <= 2019) {
                eventImpact = 0.5; // Recovery period
            }

            // Calculate output gap as percentage of potential GDP
            const outputGap = cycle + trend + eventImpact + (Math.random() - 0.5) * 0.5;
            data.outputGap.push(Number(outputGap.toFixed(2)));
        }

        return data;
    }

    // Create datasets for all countries
    const datasets = countries.map(country => {
        const data = generateOutputGapData(country, 30);
        const color = countryColors[country] || 'rgb(128, 128, 128)';
        const name = countryNames[country] || country;

        return {
            label: name,
            data: data.outputGap,
            borderColor: color,
            backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 5,
            borderWidth: 2
        };
    });

    const firstCountryData = generateOutputGapData(countries[0], 30);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: firstCountryData.labels,
            datasets: datasets
        },
        options: {
            ...chartConfig,
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'Outputgap over tid (% af potentielt BNP)',
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
                tooltip: {
                    ...chartConfig.plugins.tooltip,
                    callbacks: {
                        label: function (context) {
                            const value = context.parsed.y;
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += value.toFixed(2) + '%';
                            if (value > 0) {
                                label += ' (Positivt gap - overophedning)';
                            } else if (value < 0) {
                                label += ' (Negativt gap - ledighed)';
                            } else {
                                label += ' (Ingen gap)';
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
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
                },
                y: {
                    ...chartConfig.scales.y,
                    title: {
                        display: true,
                        text: 'Outputgap (% af potentielt BNP)',
                        font: {
                            size: 12,
                            weight: 'bold',
                            family: 'Inter, sans-serif'
                        }
                    },
                    ticks: {
                        ...chartConfig.scales.y.ticks,
                        callback: function (value) {
                            return value.toFixed(1) + '%';
                        }
                    }
                }
            },
            elements: {
                point: {
                    radius: 0,
                    hoverRadius: 5
                }
            }
        }
    });
}

// Create Expansionary Business Cycle Policy Flowchart with vis-network
function createExpansionaryPolicyFlowchart(containerId) {
    const container = document.getElementById(containerId);
    if (!container || typeof vis === 'undefined') {
        setTimeout(() => createExpansionaryPolicyFlowchart(containerId), 200);
        return;
    }

    container.style.height = "120px";
    container.style.width = "100%";
    container.innerHTML = "";

    // Get container width for dynamic positioning
    let containerWidth = container.offsetWidth;
    if (!containerWidth || containerWidth < 800) {
        const parent = container.parentElement;
        containerWidth = parent ? Math.min(parent.offsetWidth - 40, 1200) : 1000;
    }
    containerWidth = Math.max(containerWidth, 800);

    const nodeInfo = {
        'negativt': 'Negativt outputgab (Ledighed)\nNår faktisk BNP er lavere end potentielt BNP, er der ledighed og uudnyttede ressourcer i økonomien. Dette sker typisk under recessioner.',
        'ekspansiv': 'Ekspansiv konjunkturpolitik\nRegeringen og centralbanken bruger ekspansiv politik (f.eks. lavere renter, højere offentlige udgifter) for at stimulere økonomien.',
        'efterspørgsel': 'Samlet efterspørgsel stiger\nDen ekspansive politik fører til, at både privat forbrug (Cp) og investeringer (I) stiger, hvilket øger den samlede efterspørgsel.',
        'resultat': 'Nationalindkomst stiger og outputgab mindskes\nStigende efterspørgsel fører til højere produktion, hvilket øger nationalindkomsten og reducerer outputgapet.'
    };

    const nodes = new vis.DataSet([
        {
            id: 'negativt',
            label: 'Negativt outputgab\n(Ledighed)',
            x: containerWidth * 0.15,
            y: 60,
            fixed: true,
            shape: 'box',
            color: { background: '#ffffff', border: '#374151', borderWidth: 2 },
            font: { size: 14, face: 'Inter, sans-serif', color: '#1f2937', multi: true, align: 'center' },
            widthConstraint: { maximum: 140 },
            title: nodeInfo['negativt']
        },
        {
            id: 'ekspansiv',
            label: 'Ekspansiv\nkonjunkturpolitik',
            x: containerWidth * 0.35,
            y: 60,
            fixed: true,
            shape: 'box',
            color: { background: '#ffffff', border: '#15803d', borderWidth: 2 },
            font: { size: 14, face: 'Inter, sans-serif', color: '#15803d', multi: true, align: 'center' },
            widthConstraint: { maximum: 160 },
            title: nodeInfo['ekspansiv']
        },
        {
            id: 'efterspørgsel',
            label: 'Samlet efterspørgsel\nstiger',
            x: containerWidth * 0.55,
            y: 60,
            fixed: true,
            shape: 'box',
            color: { background: '#ffffff', border: '#374151', borderWidth: 2 },
            font: { size: 14, face: 'Inter, sans-serif', color: '#1f2937', multi: true, align: 'center' },
            widthConstraint: { maximum: 160 },
            title: nodeInfo['efterspørgsel']
        },
        {
            id: 'resultat',
            label: 'Nationalindkomst stiger\nog outputgab mindskes',
            x: containerWidth * 0.75,
            y: 60,
            fixed: true,
            shape: 'box',
            color: { background: '#ffffff', border: '#15803d', borderWidth: 2 },
            font: { size: 13, face: 'Inter, sans-serif', color: '#15803d', multi: true, align: 'center' },
            widthConstraint: { maximum: 180 },
            title: nodeInfo['resultat']
        }
    ]);

    const edges = new vis.DataSet([
        { from: 'negativt', to: 'ekspansiv', arrows: 'to', color: { color: '#22c55e' }, smooth: false },
        { from: 'ekspansiv', to: 'efterspørgsel', arrows: 'to', color: { color: '#22c55e' }, smooth: false },
        { from: 'efterspørgsel', to: 'resultat', arrows: 'to', color: { color: '#22c55e' }, smooth: false }
    ]);

    const data = { nodes: nodes, edges: edges };
    const options = {
        nodes: {
            shape: 'box',
            margin: 8,
            font: {
                size: 14,
                face: 'Inter, sans-serif',
                multi: true,
                align: 'center'
            },
            shadow: { enabled: false },
            borderWidth: 2,
            shapeProperties: {
                borderRadius: 0
            }
        },
        edges: {
            arrows: { to: { enabled: true, scaleFactor: 1.2 } },
            color: { color: '#22c55e' },
            width: 3,
            smooth: false
        },
        physics: false,
        interaction: {
            dragNodes: false,
            zoomView: false,
            dragView: false,
            hover: true,
            selectable: false,
            tooltipDelay: 100
        }
    };

    const network = new vis.Network(container, data, options);

    // Create custom tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'expansionary-flowchart-tooltip';
    tooltip.style.cssText = `
        position: absolute;
        display: none;
        background: #ffffff;
        border: 2px solid #3b82f6;
        border-radius: 0;
        padding: 2px 6px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        font-family: 'Inter, sans-serif';
        font-size: 10px;
        color: #0f172a;
        max-width: 220px;
        z-index: 10000;
        pointer-events: none;
        white-space: pre-line;
        line-height: 1.1;
        margin: 0;
    `;
    document.body.appendChild(tooltip);

    let currentHoveredNode = null;

    network.on("hoverNode", function (params) {
        if (params.node) {
            currentHoveredNode = params.node;
            const node = nodes.get(params.node);
            if (node && node.title) {
                container.style.cursor = 'pointer';
                tooltip.textContent = node.title;
                tooltip.style.display = 'block';
            }
        }
    });

    network.on("blurNode", function (params) {
        currentHoveredNode = null;
        container.style.cursor = 'default';
        tooltip.style.display = 'none';
    });

    const updateTooltipPosition = function (e) {
        if (currentHoveredNode && tooltip.style.display === 'block') {
            const mouseX = e.clientX;
            const mouseY = e.clientY;

            tooltip.style.left = (mouseX + 15) + 'px';
            tooltip.style.top = (mouseY + 15) + 'px';

            requestAnimationFrame(() => {
                const tooltipRect = tooltip.getBoundingClientRect();
                if (tooltipRect.right > window.innerWidth) {
                    tooltip.style.left = (mouseX - tooltipRect.width - 15) + 'px';
                }
                if (tooltipRect.bottom > window.innerHeight) {
                    tooltip.style.top = (mouseY - tooltipRect.height - 15) + 'px';
                }
                if (tooltipRect.left < 0) {
                    tooltip.style.left = '15px';
                }
                if (tooltipRect.top < 0) {
                    tooltip.style.top = '15px';
                }
            });
        }
    };

    container.addEventListener('mousemove', updateTooltipPosition);

    // Fit the network to the container
    network.on("stabilizationEnd", function () {
        network.fit();
    });
}

// Create Contractionary Business Cycle Policy Flowchart with vis-network
function createContractionaryPolicyFlowchart(containerId) {
    const container = document.getElementById(containerId);
    if (!container || typeof vis === 'undefined') {
        setTimeout(() => createContractionaryPolicyFlowchart(containerId), 200);
        return;
    }

    container.style.height = "120px";
    container.style.width = "100%";
    container.innerHTML = "";

    // Get container width for dynamic positioning
    let containerWidth = container.offsetWidth;
    if (!containerWidth || containerWidth < 800) {
        const parent = container.parentElement;
        containerWidth = parent ? Math.min(parent.offsetWidth - 40, 1200) : 1000;
    }
    containerWidth = Math.max(containerWidth, 800);

    const nodeInfo = {
        'positivt': 'Positivt outputgab (Overophedning)\nNår faktisk BNP er højere end potentielt BNP, kører økonomien for hurtigt. Dette kan føre til inflation og overophedning.',
        'kontraktiv': 'Kontraktiv konjunkturpolitik\nRegeringen og centralbanken bruger kontraktiv politik (f.eks. højere renter, lavere offentlige udgifter) for at dæmpe økonomien.',
        'efterspørgsel': 'Samlet efterspørgsel falder\nDen kontraktive politik fører til, at både privat forbrug (Cp) og investeringer (I) falder, hvilket reducerer den samlede efterspørgsel.',
        'resultat': 'Nationalindkomst falder og outputgab mindskes\nFaldende efterspørgsel fører til lavere produktion, hvilket reducerer nationalindkomsten og outputgapet.'
    };

    const nodes = new vis.DataSet([
        {
            id: 'positivt',
            label: 'Positivt outputgab\n(Overophedning)',
            x: containerWidth * 0.15,
            y: 60,
            fixed: true,
            shape: 'box',
            color: { background: '#ffffff', border: '#374151', borderWidth: 2 },
            font: { size: 14, face: 'Inter, sans-serif', color: '#1f2937', multi: true, align: 'center' },
            widthConstraint: { maximum: 140 },
            title: nodeInfo['positivt']
        },
        {
            id: 'kontraktiv',
            label: 'Kontraktiv\nkonjunkturpolitik',
            x: containerWidth * 0.35,
            y: 60,
            fixed: true,
            shape: 'box',
            color: { background: '#ffffff', border: '#15803d', borderWidth: 2 },
            font: { size: 14, face: 'Inter, sans-serif', color: '#15803d', multi: true, align: 'center' },
            widthConstraint: { maximum: 160 },
            title: nodeInfo['kontraktiv']
        },
        {
            id: 'efterspørgsel',
            label: 'Samlet efterspørgsel\nfalder',
            x: containerWidth * 0.55,
            y: 60,
            fixed: true,
            shape: 'box',
            color: { background: '#ffffff', border: '#374151', borderWidth: 2 },
            font: { size: 14, face: 'Inter, sans-serif', color: '#1f2937', multi: true, align: 'center' },
            widthConstraint: { maximum: 160 },
            title: nodeInfo['efterspørgsel']
        },
        {
            id: 'resultat',
            label: 'Nationalindkomst falder\nog outputgab mindskes',
            x: containerWidth * 0.75,
            y: 60,
            fixed: true,
            shape: 'box',
            color: { background: '#ffffff', border: '#15803d', borderWidth: 2 },
            font: { size: 13, face: 'Inter, sans-serif', color: '#15803d', multi: true, align: 'center' },
            widthConstraint: { maximum: 180 },
            title: nodeInfo['resultat']
        }
    ]);

    const edges = new vis.DataSet([
        { from: 'positivt', to: 'kontraktiv', arrows: 'to', color: { color: '#22c55e' }, smooth: false },
        { from: 'kontraktiv', to: 'efterspørgsel', arrows: 'to', color: { color: '#22c55e' }, smooth: false },
        { from: 'efterspørgsel', to: 'resultat', arrows: 'to', color: { color: '#22c55e' }, smooth: false }
    ]);

    const data = { nodes: nodes, edges: edges };
    const options = {
        nodes: {
            shape: 'box',
            margin: 8,
            font: {
                size: 14,
                face: 'Inter, sans-serif',
                multi: true,
                align: 'center'
            },
            shadow: { enabled: false },
            borderWidth: 2,
            shapeProperties: {
                borderRadius: 0
            }
        },
        edges: {
            arrows: { to: { enabled: true, scaleFactor: 1.2 } },
            color: { color: '#22c55e' },
            width: 3,
            smooth: false
        },
        physics: false,
        interaction: {
            dragNodes: false,
            zoomView: false,
            dragView: false,
            hover: true,
            selectable: false,
            tooltipDelay: 100
        }
    };

    const network = new vis.Network(container, data, options);

    // Create custom tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'contractionary-flowchart-tooltip';
    tooltip.style.cssText = `
        position: absolute;
        display: none;
        background: #ffffff;
        border: 2px solid #3b82f6;
        border-radius: 0;
        padding: 2px 6px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        font-family: 'Inter, sans-serif';
        font-size: 10px;
        color: #0f172a;
        max-width: 220px;
        z-index: 10000;
        pointer-events: none;
        white-space: pre-line;
        line-height: 1.1;
        margin: 0;
    `;
    document.body.appendChild(tooltip);

    let currentHoveredNode = null;

    network.on("hoverNode", function (params) {
        if (params.node) {
            currentHoveredNode = params.node;
            const node = nodes.get(params.node);
            if (node && node.title) {
                container.style.cursor = 'pointer';
                tooltip.textContent = node.title;
                tooltip.style.display = 'block';
            }
        }
    });

    network.on("blurNode", function (params) {
        currentHoveredNode = null;
        container.style.cursor = 'default';
        tooltip.style.display = 'none';
    });

    const updateTooltipPosition = function (e) {
        if (currentHoveredNode && tooltip.style.display === 'block') {
            const mouseX = e.clientX;
            const mouseY = e.clientY;

            tooltip.style.left = (mouseX + 15) + 'px';
            tooltip.style.top = (mouseY + 15) + 'px';

            requestAnimationFrame(() => {
                const tooltipRect = tooltip.getBoundingClientRect();
                if (tooltipRect.right > window.innerWidth) {
                    tooltip.style.left = (mouseX - tooltipRect.width - 15) + 'px';
                }
                if (tooltipRect.bottom > window.innerHeight) {
                    tooltip.style.top = (mouseY - tooltipRect.height - 15) + 'px';
                }
                if (tooltipRect.left < 0) {
                    tooltip.style.left = '15px';
                }
                if (tooltipRect.top < 0) {
                    tooltip.style.top = '15px';
                }
            });
        }
    };

    container.addEventListener('mousemove', updateTooltipPosition);

    // Fit the network to the container
    network.on("stabilizationEnd", function () {
        network.fit();
    });
}

// Create AD-AS (SESU) Model Chart
function createADASChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Simulated data for AD-AS model
    const priceLevels = [80, 90, 100, 110, 120, 130, 140];
    const adData = [2800, 2600, 2400, 2200, 2000, 1800, 1600]; // Aggregate Demand (negatively sloped)
    const asShortData = [1800, 2000, 2200, 2400, 2600, 2800, 3000]; // Short-run Aggregate Supply (positively sloped)
    const asLongData = [2400, 2400, 2400, 2400, 2400, 2400, 2400]; // Long-run Aggregate Supply (vertical)

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: priceLevels.map(p => p.toString()),
            datasets: [{
                label: 'Samlet Efterspørgsel (SE/AD)',
                data: adData,
                borderColor: '#36a2eb',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                borderWidth: 3,
                tension: 0.3,
                fill: false
            }, {
                label: 'Samlet Udbud kort sigt (SU/AS kort)',
                data: asShortData,
                borderColor: '#ff6384',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                borderWidth: 3,
                tension: 0.3,
                fill: false
            }, {
                label: 'Samlet Udbud lang sigt (SU/AS lang)',
                data: asLongData,
                borderColor: '#4bc0c0',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                borderWidth: 3,
                borderDash: [5, 5],
                fill: false
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'AD-AS Modellen (SESU-modellen)',
                    font: { size: 16, weight: 'bold', family: 'Inter, sans-serif' }
                },
                tooltip: {
                    ...chartConfig.plugins.tooltip,
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${context.parsed.y} mia. kr. (Prisniveau: ${context.label})`;
                        }
                    }
                }
            },
            scales: {
                ...chartConfig.scales,
                x: {
                    ...chartConfig.scales.x,
                    title: {
                        display: true,
                        text: 'Prisniveau (Index, 100 = basis)',
                        font: { size: 12, weight: 'bold' }
                    }
                },
                y: {
                    ...chartConfig.scales.y,
                    title: {
                        display: true,
                        text: 'BNP (mia. kr.)',
                        font: { size: 12, weight: 'bold' }
                    }
                }
            }
        }
    });
}

// Create Keynesian Aggregate Demand Components Chart
function createKeynesianADChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Simulated data showing components of aggregate demand
    const income = [0, 500, 1000, 1500, 2000, 2500, 3000];
    const consumption = income.map(y => 200 + 0.75 * y); // C = C0 + c*Y
    const investment = Array(7).fill(300); // I = constant
    const government = Array(7).fill(400); // G = constant
    const netExport = income.map(y => 200 - 0.1 * y); // X - IM
    const aggregateDemand = income.map((y, i) => consumption[i] + investment[i] + government[i] + netExport[i]);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: income.map(y => y.toString()),
            datasets: [{
                label: 'Privat Forbrug (C)',
                data: consumption,
                borderColor: '#4bc0c0',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                borderWidth: 2
            }, {
                label: 'Investering (I)',
                data: investment,
                borderColor: '#9966ff',
                backgroundColor: 'rgba(153, 102, 255, 0.1)',
                borderWidth: 2
            }, {
                label: 'Offentlige Udgifter (G)',
                data: government,
                borderColor: '#ff6384',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                borderWidth: 2
            }, {
                label: 'Nettoeksport (X-IM)',
                data: netExport,
                borderColor: '#ffce56',
                backgroundColor: 'rgba(255, 206, 86, 0.1)',
                borderWidth: 2
            }, {
                label: 'Samlet Efterspørgsel (SE = C+I+G+X-IM)',
                data: aggregateDemand,
                borderColor: '#36a2eb',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                borderWidth: 3,
                tension: 0.3
            }, {
                label: '45° linje (Y = SE)',
                data: income,
                borderColor: '#cccccc',
                backgroundColor: 'rgba(204, 204, 204, 0.1)',
                borderWidth: 2,
                borderDash: [5, 5]
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'Keynes-modellen: Samlet Efterspørgsel',
                    font: { size: 16, weight: 'bold', family: 'Inter, sans-serif' }
                }
            },
            scales: {
                ...chartConfig.scales,
                x: {
                    ...chartConfig.scales.x,
                    title: {
                        display: true,
                        text: 'Nationalindkomst (Y) - mia. kr.',
                        font: { size: 12, weight: 'bold' }
                    }
                },
                y: {
                    ...chartConfig.scales.y,
                    title: {
                        display: true,
                        text: 'Efterspørgsel (SE) - mia. kr.',
                        font: { size: 12, weight: 'bold' }
                    }
                }
            }
        }
    });
}

// Create Basic Keynes Model Chart (No intervention)
function createKeynesBasicChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const income = [0, 500, 1000, 1500, 2000, 2500];
    const se = income.map(y => 600 + 0.6 * y); // SE = 600 + 0.6Y -> Y = 1500

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: income,
            datasets: [{
                label: 'Samlet efterspørgsel (SE)',
                data: se,
                borderColor: '#ef4444',
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0
            }, {
                label: 'SE = Y (45°-linjen)',
                data: income,
                borderColor: '#94a3b8',
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0
            }, {
                label: 'Ligevægt',
                data: [{ x: 1500, y: 1500 }],
                type: 'scatter',
                backgroundColor: '#fbbf24',
                borderColor: '#fbbf24',
                pointRadius: 12,
                pointHoverRadius: 14,
                showLine: false
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'Keynes-modellen: Ligevægt på varemarkedet',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: 0,
                    max: 2500,
                    title: { display: true, text: 'Nationalindkomst (Y)' }
                },
                y: {
                    min: 0,
                    max: 2500,
                    title: { display: true, text: 'Samlet efterspørgsel (SE)' }
                }
            }
        },
        plugins: [{
            id: 'pointLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                chart.data.datasets.forEach((dataset, i) => {
                    if (dataset.label === 'Ligevægt') {
                        const meta = chart.getDatasetMeta(i);
                        meta.data.forEach((element) => {
                            const { x, y } = element.getProps(['x', 'y'], true);
                            ctx.save();
                            ctx.fillStyle = 'white';
                            ctx.font = 'bold 12px Inter';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText('0', x, y);
                            ctx.restore();
                        });
                    }
                });
            }
        }]
    });
}

// Create Keynes Fiscal Policy Chart (Shift)
function createKeynesFPChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const income = [0, 500, 1000, 1500, 2000, 2500, 3000];
    const se_orig = income.map(y => 800 + 0.5 * y); // SE = 800 + 0.5Y -> Y = 1600
    const se_new = income.map(y => 400 + 0.5 * y);  // SE = 400 + 0.5Y -> Y = 800

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: income,
            datasets: [{
                label: 'SE (Original)',
                data: se_orig,
                borderColor: '#ef4444',
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0
            }, {
                label: 'SE_Ny (Kontraktiv)',
                data: se_new,
                borderColor: '#ef4444',
                backgroundColor: 'transparent',
                borderWidth: 3,
                borderDash: [5, 5],
                pointRadius: 0
            }, {
                label: 'SE = Y',
                data: income,
                borderColor: '#94a3b8',
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0
            }, {
                label: 'Ligevægt 0',
                data: [{ x: 1600, y: 1600 }],
                type: 'scatter',
                backgroundColor: '#fbbf24', // Yellow/Gold
                borderColor: '#fbbf24',
                pointRadius: 12,
                pointHoverRadius: 14,
                showLine: false
            }, {
                label: 'Ligevægt 1',
                data: [{ x: 800, y: 800 }],
                type: 'scatter',
                backgroundColor: '#3b82f6', // Blue for new equilibrium
                borderColor: '#3b82f6',
                pointRadius: 12,
                pointHoverRadius: 14,
                showLine: false
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'Keynes model – Kontraktiv Finanspolitik',
                    font: { size: 16, weight: 'bold' }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            if (context.dataset.label.includes('Ligevægt')) {
                                return context.dataset.label + ': Y = ' + context.parsed.x + ', SE = ' + context.parsed.y;
                            }
                            return context.dataset.label + ': ' + context.parsed.y;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: 0,
                    max: 2500,
                    title: { display: true, text: 'Nationalindkomst (Y)' }
                },
                y: {
                    min: 0,
                    max: 2500,
                    title: { display: true, text: 'Samlet efterspørgsel (SE)' }
                }
            }
        },
        plugins: [{
            id: 'pointLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                chart.data.datasets.forEach((dataset, i) => {
                    if (dataset.label.includes('Ligevægt')) {
                        const meta = chart.getDatasetMeta(i);
                        meta.data.forEach((element) => {
                            const { x, y } = element.getProps(['x', 'y'], true);
                            ctx.save();
                            ctx.fillStyle = 'white';
                            ctx.font = 'bold 12px Inter';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            const number = dataset.label.includes('0') ? '0' : '1';
                            ctx.fillText(number, x, y);
                            ctx.restore();
                        });
                    }
                });
            }
        }]
    });
}

// Create Keynes Multiplier Chart (Slope Change)
function createKeynesMultiplierChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const income = [0, 500, 1000, 1500, 2000, 2500, 3000];
    const se_orig = income.map(y => 600 + 0.6 * y); // SE = 600 + 0.6Y -> Y = 1500
    const se_new = income.map(y => 600 + 0.4 * y);  // SE = 600 + 0.4Y -> Y = 1000

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: income,
            datasets: [{
                label: 'SE (Original)',
                data: se_orig,
                borderColor: '#ef4444',
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0
            }, {
                label: 'SE_Multiplikator lavere',
                data: se_new,
                borderColor: '#ef4444',
                backgroundColor: 'transparent',
                borderWidth: 3,
                borderDash: [5, 5],
                pointRadius: 0
            }, {
                label: 'SE = Y',
                data: income,
                borderColor: '#94a3b8',
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0
            }, {
                label: 'Ligevægt 0',
                data: [{ x: 1500, y: 1500 }],
                type: 'scatter',
                backgroundColor: '#fbbf24', // Yellow/Gold
                borderColor: '#fbbf24',
                pointRadius: 12,
                pointHoverRadius: 14,
                showLine: false
            }, {
                label: 'Ligevægt 1',
                data: [{ x: 1000, y: 1000 }],
                type: 'scatter',
                backgroundColor: '#3b82f6', // Blue
                borderColor: '#3b82f6',
                pointRadius: 12,
                pointHoverRadius: 14,
                showLine: false
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'Keynes model – Kontraktiv Finanspolitik (Lavere multiplikator)',
                    font: { size: 16, weight: 'bold' }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            if (context.dataset.label.includes('Ligevægt')) {
                                return context.dataset.label + ': Y = ' + context.parsed.x + ', SE = ' + context.parsed.y;
                            }
                            return context.dataset.label + ': ' + context.parsed.y;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: 0,
                    max: 2500,
                    title: { display: true, text: 'Nationalindkomst (Y)' }
                },
                y: {
                    min: 0,
                    max: 2500,
                    title: { display: true, text: 'Samlet efterspørgsel (SE)' }
                }
            }
        },
        plugins: [{
            id: 'pointLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                chart.data.datasets.forEach((dataset, i) => {
                    if (dataset.label.includes('Ligevægt')) {
                        const meta = chart.getDatasetMeta(i);
                        meta.data.forEach((element) => {
                            const { x, y } = element.getProps(['x', 'y'], true);
                            ctx.save();
                            ctx.fillStyle = 'white';
                            ctx.font = 'bold 12px Inter';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            const number = dataset.label.includes('0') ? '0' : '1';
                            ctx.fillText(number, x, y);
                            ctx.restore();
                        });
                    }
                });
            }
        }]
    });
}

// Create Public Balance Chart (T-G-R)
function createPublicBalanceChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const income = [0, 500, 1000, 1500, 2000, 2500];
    // Public Balance = T - G - R where T = t*Y, G and R are exogenous
    const saldo_orig = income.map(y => 0.4 * y - 800); // T=0.4Y, G+R=800
    const saldo_new = income.map(y => 0.4 * y - 600);  // Contractionary (lower G)

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: income,
            datasets: [{
                label: 'Offentlig Saldo (Før)',
                data: saldo_orig,
                borderColor: '#ef4444',
                borderWidth: 3,
                pointRadius: 0
            }, {
                label: 'Offentlig Saldo (Kontraktiv)',
                data: saldo_new,
                borderColor: '#ef4444',
                borderDash: [5, 5],
                borderWidth: 3,
                pointRadius: 0
            }, {
                label: 'Ligevægt 0',
                data: [{ x: 1600, y: -160 }],
                type: 'scatter',
                backgroundColor: '#fbbf24',
                pointRadius: 12,
                showLine: false
            }, {
                label: 'Ligevægt 1',
                data: [{ x: 800, y: -280 }],
                type: 'scatter',
                backgroundColor: '#3b82f6',
                pointRadius: 12,
                showLine: false
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: { display: true, text: 'Offentlig saldo (T-G-R)', font: { size: 16 } }
            },
            scales: {
                x: { type: 'linear', min: 0, max: 2500, title: { display: true, text: 'Nationalindkomst (Y)' } },
                y: { title: { display: true, text: 'Saldo (Underskud/Overskud)' } }
            }
        },
        plugins: [{
            id: 'pointLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                chart.data.datasets.forEach((dataset) => {
                    if (dataset.label.includes('Ligevægt')) {
                        const meta = chart.getDatasetMeta(chart.data.datasets.indexOf(dataset));
                        meta.data.forEach((element) => {
                            const { x, y } = element.getProps(['x', 'y'], true);
                            ctx.save();
                            ctx.fillStyle = 'white';
                            ctx.font = 'bold 12px Inter';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(dataset.label.includes('0') ? '0' : '1', x, y);
                            ctx.restore();
                        });
                    }
                });
            }
        }]
    });
}

// Create Employment Chart (L)
function createEmploymentChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const income = [0, 500, 1000, 1500, 2000, 2500];
    const employment = income.map(y => 0.8 * y); // L(Y) line

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: income,
            datasets: [{
                label: 'Beskæftigelse L(Y)',
                data: employment,
                borderColor: '#3b82f6',
                borderWidth: 3,
                pointRadius: 0
            }, {
                label: 'Ligevægt 0',
                data: [{ x: 1600, y: 1280 }],
                type: 'scatter',
                backgroundColor: '#fbbf24',
                pointRadius: 12,
                showLine: false
            }, {
                label: 'Ligevægt 1',
                data: [{ x: 800, y: 640 }],
                type: 'scatter',
                backgroundColor: '#3b82f6',
                pointRadius: 12,
                showLine: false
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: { display: true, text: 'Beskæftigelse (L) og nationalindkomst (Y)', font: { size: 16 } }
            },
            scales: {
                x: { type: 'linear', min: 0, max: 2500, title: { display: true, text: 'Nationalindkomst (Y)' } },
                y: { title: { display: true, text: 'Beskæftigelse (L)' } }
            }
        },
        plugins: [{
            id: 'pointLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                chart.data.datasets.forEach((dataset) => {
                    if (dataset.label.includes('Ligevægt')) {
                        const meta = chart.getDatasetMeta(chart.data.datasets.indexOf(dataset));
                        meta.data.forEach((element) => {
                            const { x, y } = element.getProps(['x', 'y'], true);
                            ctx.save();
                            ctx.fillStyle = 'white';
                            ctx.font = 'bold 12px Inter';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(dataset.label.includes('0') ? '0' : '1', x, y);
                            ctx.restore();
                        });
                    }
                });
            }
        }]
    });
}

// Create Balance of Payments Chart (BB)
function createBalanceOfPaymentsChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const income = [0, 500, 1000, 1500, 2000, 2500];
    // BB = X - IM, where IM = m*Y
    const bb = income.map(y => 400 - 0.3 * y); // X=400, IM=0.3Y

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: income,
            datasets: [{
                label: 'Betalingsbalance (X-IM)',
                data: bb,
                borderColor: '#ef4444',
                borderWidth: 3,
                pointRadius: 0
            }, {
                label: 'Ligevægt 0',
                data: [{ x: 1600, y: -80 }],
                type: 'scatter',
                backgroundColor: '#fbbf24',
                pointRadius: 12,
                showLine: false
            }, {
                label: 'Ligevægt 1',
                data: [{ x: 800, y: 160 }],
                type: 'scatter',
                backgroundColor: '#3b82f6',
                pointRadius: 12,
                showLine: false
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: { display: true, text: 'Betalingsbalance (BB)', font: { size: 16 } }
            },
            scales: {
                x: { type: 'linear', min: 0, max: 2500, title: { display: true, text: 'Nationalindkomst (Y)' } },
                y: { title: { display: true, text: 'Saldo (Underskud/Overskud)' } }
            }
        },
        plugins: [{
            id: 'pointLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                chart.data.datasets.forEach((dataset) => {
                    if (dataset.label.includes('Ligevægt')) {
                        const meta = chart.getDatasetMeta(chart.data.datasets.indexOf(dataset));
                        meta.data.forEach((element) => {
                            const { x, y } = element.getProps(['x', 'y'], true);
                            ctx.save();
                            ctx.fillStyle = 'white';
                            ctx.font = 'bold 12px Inter';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(dataset.label.includes('0') ? '0' : '1', x, y);
                            ctx.restore();
                        });
                    }
                });
            }
        }]
    });
}

// Create Multiplier Effect Chart
function createMultiplierChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Data for runder (cumulative effect)
    const labels = ['Start', 'Runde 1', 'Runde 2', 'Runde 3', 'Runde 4', 'Total'];
    const data = [100, 160, 196, 218, 231, 250]; // c = 0.6, Multiplier = 2.5

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Nationalindkomst (Y)',
                data: data,
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: { display: true, text: 'Multiplikatoreffekt over tid', font: { size: 16 } }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Værdi' } }
            }
        }
    });
}

// Create Keynes Expansive Chart (Higher Multiplier)
function createKeynesExpansiveChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const income = [0, 500, 1000, 1500, 2000, 2500];
    const se_orig = income.map(y => 600 + 0.4 * y); // Y = 1000
    const se_new = income.map(y => 600 + 0.6 * y);  // Y = 1500 (Steeper)

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: income,
            datasets: [{
                label: 'SE (Før)',
                data: se_orig,
                borderColor: '#ef4444',
                borderWidth: 3,
                pointRadius: 0
            }, {
                label: 'SE (Ekspansiv - Højere multiplikator)',
                data: se_new,
                borderColor: '#ef4444',
                borderDash: [5, 5],
                borderWidth: 3,
                pointRadius: 0
            }, {
                label: 'SE = Y',
                data: income,
                borderColor: '#94a3b8',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0
            }, {
                label: 'Ligevægt 0',
                data: [{ x: 1000, y: 1000 }],
                type: 'scatter',
                backgroundColor: '#fbbf24',
                pointRadius: 12,
                showLine: false
            }, {
                label: 'Ligevægt 1',
                data: [{ x: 1500, y: 1500 }],
                type: 'scatter',
                backgroundColor: '#3b82f6',
                pointRadius: 12,
                showLine: false
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: { display: true, text: 'Keynes model - Ekspansiv Finanspolitik', font: { size: 16 } }
            },
            scales: {
                x: { type: 'linear', min: 0, max: 2500, title: { display: true, text: 'Nationalindkomst (Y)' } },
                y: { min: 0, max: 2500, title: { display: true, text: 'Samlet efterspørgsel (SE)' } }
            }
        },
        plugins: [{
            id: 'pointLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                chart.data.datasets.forEach((dataset) => {
                    if (dataset.label.includes('Ligevægt')) {
                        const meta = chart.getDatasetMeta(chart.data.datasets.indexOf(dataset));
                        meta.data.forEach((element) => {
                            const { x, y } = element.getProps(['x', 'y'], true);
                            ctx.save();
                            ctx.fillStyle = 'white';
                            ctx.font = 'bold 12px Inter';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(dataset.label.includes('0') ? '0' : '1', x, y);
                            ctx.restore();
                        });
                    }
                });
            }
        }]
    });
}

// Create Public Balance Expansive Chart
function createPublicBalanceExpansiveChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const income = [0, 500, 1000, 1500, 2000, 2500];
    const saldo_orig = income.map(y => 0.4 * y - 600); // G+R = 600
    const saldo_new = income.map(y => 0.4 * y - 800);  // Expansionary (Higher G)

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: income,
            datasets: [{
                label: 'Offentlig Saldo (Før)',
                data: saldo_orig,
                borderColor: '#ef4444',
                borderWidth: 3,
                pointRadius: 0
            }, {
                label: 'Offentlig Saldo (Ekspansiv)',
                data: saldo_new,
                borderColor: '#ef4444',
                borderDash: [5, 5],
                borderWidth: 3,
                pointRadius: 0
            }, {
                label: 'Ligevægt 0',
                data: [{ x: 800, y: -280 }],
                type: 'scatter',
                backgroundColor: '#fbbf24',
                pointRadius: 12,
                showLine: false
            }, {
                label: 'Ligevægt 1',
                data: [{ x: 1600, y: -160 }],
                type: 'scatter',
                backgroundColor: '#3b82f6',
                pointRadius: 12,
                showLine: false
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: { display: true, text: 'Offentlig saldo (T-G-R) ved ekspansiv politik', font: { size: 16 } }
            },
            scales: {
                x: { type: 'linear', min: 0, max: 2500, title: { display: true, text: 'Nationalindkomst (Y)' } },
                y: { title: { display: true, text: 'Saldo (Underskud/Overskud)' } }
            }
        },
        plugins: [{
            id: 'pointLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                chart.data.datasets.forEach((dataset) => {
                    if (dataset.label.includes('Ligevægt')) {
                        const meta = chart.getDatasetMeta(chart.data.datasets.indexOf(dataset));
                        meta.data.forEach((element) => {
                            const { x, y } = element.getProps(['x', 'y'], true);
                            ctx.save();
                            ctx.fillStyle = 'white';
                            ctx.font = 'bold 12px Inter';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(dataset.label.includes('0') ? '1' : '2', x, y); // Numeric labels as shown in image (0->1->2)
                            // Wait, image shows 0 as start on higher line, then drops to 1, then moves to 2.
                            // My simple model just moves 0->1. I'll label them 0 and 1 for consistency with others.
                            ctx.restore();
                        });
                    }
                });
            }
        }]
    });
}

// Create Employment Expansive Chart
function createEmploymentExpansiveChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const income = [0, 500, 1000, 1500, 2000, 2500];
    const employment = income.map(y => 0.8 * y);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: income,
            datasets: [{
                label: 'Beskæftigelse L(Y)',
                data: employment,
                borderColor: '#3b82f6',
                borderWidth: 3,
                pointRadius: 0
            }, {
                label: 'Ligevægt 0',
                data: [{ x: 800, y: 640 }],
                type: 'scatter',
                backgroundColor: '#fbbf24',
                pointRadius: 12,
                showLine: false
            }, {
                label: 'Ligevægt 1',
                data: [{ x: 1600, y: 1280 }],
                type: 'scatter',
                backgroundColor: '#3b82f6',
                pointRadius: 12,
                showLine: false
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: { display: true, text: 'Beskæftigelse (L) stiger ved ekspansiv politik', font: { size: 16 } }
            },
            scales: {
                x: { type: 'linear', min: 0, max: 2500, title: { display: true, text: 'Nationalindkomst (Y)' } },
                y: { title: { display: true, text: 'Beskæftigelse (L)' } }
            }
        },
        plugins: [{
            id: 'pointLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                chart.data.datasets.forEach((dataset) => {
                    if (dataset.label.includes('Ligevægt')) {
                        const meta = chart.getDatasetMeta(chart.data.datasets.indexOf(dataset));
                        meta.data.forEach((element) => {
                            const { x, y } = element.getProps(['x', 'y'], true);
                            ctx.save();
                            ctx.fillStyle = 'white';
                            ctx.font = 'bold 12px Inter';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(dataset.label.includes('0') ? '0' : '1', x, y);
                            ctx.restore();
                        });
                    }
                });
            }
        }]
    });
}

// Create Balance of Payments Expansive Chart
function createBalanceOfPaymentsExpansiveChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const income = [0, 500, 1000, 1500, 2000, 2500];
    const bb = income.map(y => 400 - 0.3 * y);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: income,
            datasets: [{
                label: 'Betalingsbalance (X-IM)',
                data: bb,
                borderColor: '#ef4444',
                borderWidth: 3,
                pointRadius: 0
            }, {
                label: 'Ligevægt 0',
                data: [{ x: 800, y: 160 }],
                type: 'scatter',
                backgroundColor: '#fbbf24',
                pointRadius: 12,
                showLine: false
            }, {
                label: 'Ligevægt 1',
                data: [{ x: 1600, y: -80 }],
                type: 'scatter',
                backgroundColor: '#3b82f6',
                pointRadius: 12,
                showLine: false
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: { display: true, text: 'Betalingsbalance forværres ved ekspansiv politik', font: { size: 16 } }
            },
            scales: {
                x: { type: 'linear', min: 0, max: 2500, title: { display: true, text: 'Nationalindkomst (Y)' } },
                y: { title: { display: true, text: 'Saldo (Underskud/Overskud)' } }
            }
        },
        plugins: [{
            id: 'pointLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                chart.data.datasets.forEach((dataset) => {
                    if (dataset.label.includes('Ligevægt')) {
                        const meta = chart.getDatasetMeta(chart.data.datasets.indexOf(dataset));
                        meta.data.forEach((element) => {
                            const { x, y } = element.getProps(['x', 'y'], true);
                            ctx.save();
                            ctx.fillStyle = 'white';
                            ctx.font = 'bold 12px Inter';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(dataset.label.includes('0') ? '0' : '1', x, y);
                            ctx.restore();
                        });
                    }
                });
            }
        }]
    });
}
function createMultiplierChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Showing multiplier effect rounds
    const rounds = ['Initial', 'Runde 1', 'Runde 2', 'Runde 3', 'Runde 4', 'Runde 5', 'Total'];
    const cumulativeEffect = [100, 175, 231, 273, 305, 329, 400]; // Multiplier = 4, c = 0.75

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: rounds,
            datasets: [{
                label: 'Kumuleret effekt (mia. kr.)',
                data: cumulativeEffect,
                backgroundColor: '#36a2eb',
                borderColor: '#2563eb',
                borderWidth: 2
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'Multiplikatoreffekten',
                    font: { size: 16, weight: 'bold', family: 'Inter, sans-serif' }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `Kumuleret effekt: ${context.parsed.y} mia. kr.`;
                        }
                    }
                }
            },
            scales: {
                ...chartConfig.scales,
                y: {
                    ...chartConfig.scales.y,
                    title: {
                        display: true,
                        text: 'Kumuleret effekt (mia. kr.)',
                        font: { size: 12, weight: 'bold' }
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

// Create Phillips Curve Chart
function createPhillipsCurveChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Phillips curve data: inverse relationship between unemployment and inflation
    // Data points matching the image: unemployment decreases from left to right, inflation increases
    const unemployment = [10, 9, 8, 7, 6, 5, 4, 3, 2];
    const inflation = [0.2, 0.5, 1.0, 1.5, 2.0, 2.7, 3.5, 4.3, 4.9];

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: unemployment.map(u => u.toString() + '%'),
            datasets: [{
                label: 'Phillips-kurven',
                data: inflation,
                borderColor: '#ff6384',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'Phillips-kurven: Sammenhængen mellem ledighed og inflation',
                    font: { size: 16, weight: 'bold', family: 'Inter, sans-serif' }
                }
            },
            scales: {
                ...chartConfig.scales,
                x: {
                    ...chartConfig.scales.x,
                    title: {
                        display: true,
                        text: 'Ledighed (%)',
                        font: { size: 12, weight: 'bold' }
                    },
                    reverse: true // Reverse x-axis to show unemployment decreasing from left to right
                },
                y: {
                    ...chartConfig.scales.y,
                    title: {
                        display: true,
                        text: 'Inflation (%)',
                        font: { size: 12, weight: 'bold' }
                    }
                }
            }
        }
    });
}

// Create Money Supply Chart
function createMoneySupplyChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Simulated money supply data (M1, M2, M3)
    const years = ['2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024'];
    const m1 = [1000, 1050, 1100, 1150, 1200, 1250, 1350, 1400, 1450, 1500, 1550];
    const m2 = [1800, 1900, 2000, 2100, 2200, 2300, 2500, 2600, 2700, 2800, 2900];
    const m3 = [2200, 2300, 2400, 2500, 2600, 2700, 2900, 3000, 3100, 3200, 3300];

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'M1 (Kontanter + lønkonti)',
                data: m1,
                borderColor: '#4bc0c0',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                borderWidth: 2
            }, {
                label: 'M2 (M1 + opsparingskonti)',
                data: m2,
                borderColor: '#36a2eb',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                borderWidth: 2
            }, {
                label: 'M3 (M2 + langfristede indlån)',
                data: m3,
                borderColor: '#9966ff',
                backgroundColor: 'rgba(153, 102, 255, 0.1)',
                borderWidth: 2
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'Udvikling i pengemængde (M1, M2, M3)',
                    font: { size: 16, weight: 'bold', family: 'Inter, sans-serif' }
                }
            },
            scales: {
                ...chartConfig.scales,
                y: {
                    ...chartConfig.scales.y,
                    title: {
                        display: true,
                        text: 'Pengemængde (mia. kr.)',
                        font: { size: 12, weight: 'bold' }
                    }
                }
            }
        }
    });
}

// Create Risk Premium Chart
function createRiskPremiumChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const loanTypes = ['Statslån', 'Boliglån', 'Virksomhedslån', 'Forbrugslån'];
    const riskFreeRate = 2; // Base rate
    const riskPremiums = [0, 1.5, 3, 8]; // Risk premiums
    const totalRates = riskPremiums.map(p => riskFreeRate + p);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: loanTypes,
            datasets: [{
                label: 'Risikofri rente',
                data: Array(4).fill(riskFreeRate),
                backgroundColor: '#4bc0c0',
                borderColor: '#14b8a6',
                borderWidth: 2
            }, {
                label: 'Risikopræmie',
                data: riskPremiums,
                backgroundColor: '#ff6384',
                borderColor: '#ef4444',
                borderWidth: 2
            }, {
                label: 'Total rente',
                data: totalRates,
                backgroundColor: '#9966ff',
                borderColor: '#7c3aed',
                borderWidth: 2,
                type: 'line',
                borderDash: [5, 5],
                pointRadius: 6
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'Risikopræmie for forskellige låntyper',
                    font: { size: 16, weight: 'bold', family: 'Inter, sans-serif' }
                }
            },
            scales: {
                ...chartConfig.scales,
                y: {
                    ...chartConfig.scales.y,
                    title: {
                        display: true,
                        text: 'Rente (%)',
                        font: { size: 12, weight: 'bold' }
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

// Create Real vs Nominal Interest Rate Chart
function createRealNominalRateChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const years = ['2020', '2021', '2022', '2023', '2024'];
    const nominalRates = [0.5, 0.3, 2.5, 3.0, 3.5];
    const inflationRates = [0.4, 1.9, 7.7, 3.4, 2.0];
    const realRates = nominalRates.map((nom, i) => nom - inflationRates[i]);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'Nominel rente',
                data: nominalRates,
                borderColor: '#36a2eb',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                borderWidth: 3,
                pointRadius: 6
            }, {
                label: 'Inflation',
                data: inflationRates,
                borderColor: '#ff6384',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                borderWidth: 3,
                pointRadius: 6
            }, {
                label: 'Realrente (Nominel - Inflation)',
                data: realRates,
                borderColor: '#4bc0c0',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                borderWidth: 3,
                pointRadius: 6,
                borderDash: [5, 5]
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'Nominel rente vs. Realrente',
                    font: { size: 16, weight: 'bold', family: 'Inter, sans-serif' }
                }
            },
            scales: {
                ...chartConfig.scales,
                y: {
                    ...chartConfig.scales.y,
                    title: {
                        display: true,
                        text: 'Rente/Inflation (%)',
                        font: { size: 12, weight: 'bold' }
                    }
                }
            }
        }
    });
}

// Create Policy Effectiveness Chart
function createPolicyEffectivenessChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const policies = ['Ekspansiv\nFinanspolitik', 'Kontraktiv\nFinanspolitik', 'Ekspansiv\nPengepolitik', 'Kontraktiv\nPengepolitik'];
    const bnpEffect = [3, -2, 2, -1.5];
    const inflationEffect = [1, -1.5, 0.5, -1];
    const unemploymentEffect = [-1.5, 1, -1, 0.8];

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: policies,
            datasets: [{
                label: 'BNP-effekt (%)',
                data: bnpEffect,
                backgroundColor: '#4bc0c0',
                borderColor: '#14b8a6',
                borderWidth: 2
            }, {
                label: 'Inflationseffekt (%)',
                data: inflationEffect,
                backgroundColor: '#ff6384',
                borderColor: '#ef4444',
                borderWidth: 2
            }, {
                label: 'Ledighedseffekt (%)',
                data: unemploymentEffect,
                backgroundColor: '#ffce56',
                borderColor: '#f59e0b',
                borderWidth: 2
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'Effekt af økonomisk politik',
                    font: { size: 16, weight: 'bold', family: 'Inter, sans-serif' }
                }
            },
            scales: {
                ...chartConfig.scales,
                y: {
                    ...chartConfig.scales.y,
                    title: {
                        display: true,
                        text: 'Effekt (%)',
                        font: { size: 12, weight: 'bold' }
                    }
                }
            }
        }
    });
}

// Create Fiscal Policy Multiplier Chart
function createFiscalPolicyMultiplierChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const rounds = ['Initial', 'Runde 1', 'Runde 2', 'Runde 3', 'Runde 4', 'Total'];
    const governmentSpending = [100, 0, 0, 0, 0, 0];
    const consumption = [0, 75, 56, 42, 32, 205];
    const totalEffect = [100, 175, 231, 273, 305, 305];

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: rounds,
            datasets: [{
                label: 'Offentlige udgifter',
                data: governmentSpending,
                backgroundColor: '#36a2eb',
                borderColor: '#2563eb',
                borderWidth: 2
            }, {
                label: 'Forbrug (multiplikatoreffekt)',
                data: consumption,
                backgroundColor: '#4bc0c0',
                borderColor: '#14b8a6',
                borderWidth: 2
            }, {
                label: 'Total effekt',
                data: totalEffect,
                backgroundColor: '#ff6384',
                borderColor: '#ef4444',
                borderWidth: 2,
                type: 'line',
                pointRadius: 6
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'Finanspolitisk multiplikatoreffekt',
                    font: { size: 16, weight: 'bold', family: 'Inter, sans-serif' }
                }
            },
            scales: {
                ...chartConfig.scales,
                y: {
                    ...chartConfig.scales.y,
                    title: {
                        display: true,
                        text: 'Effekt (mia. kr.)',
                        font: { size: 12, weight: 'bold' }
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

// Create Monetary Policy Transmission Chart
function createMonetaryPolicyTransmissionChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const quarters = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8'];
    const interestRate = [3.5, 2.5, 2.0, 1.5, 1.5, 1.5, 1.5, 1.5];
    const investment = [100, 102, 105, 108, 110, 112, 113, 114];
    const consumption = [100, 101, 103, 105, 106, 107, 108, 108];
    const bnp = [100, 101.5, 104, 106.5, 108, 109.5, 110.5, 111];

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: quarters,
            datasets: [{
                label: 'Rente (%)',
                data: interestRate,
                borderColor: '#ff6384',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                borderWidth: 3,
                yAxisID: 'y',
                pointRadius: 6
            }, {
                label: 'Investering (index)',
                data: investment,
                borderColor: '#36a2eb',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                borderWidth: 2,
                yAxisID: 'y1',
                pointRadius: 4
            }, {
                label: 'Forbrug (index)',
                data: consumption,
                borderColor: '#4bc0c0',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                borderWidth: 2,
                yAxisID: 'y1',
                pointRadius: 4
            }, {
                label: 'BNP (index)',
                data: bnp,
                borderColor: '#9966ff',
                backgroundColor: 'rgba(153, 102, 255, 0.1)',
                borderWidth: 3,
                yAxisID: 'y1',
                pointRadius: 6,
                borderDash: [5, 5]
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'Pengepolitisk transmission - Ekspansiv pengepolitik',
                    font: { size: 16, weight: 'bold', family: 'Inter, sans-serif' }
                }
            },
            scales: {
                x: {
                    ...chartConfig.scales.x,
                    title: {
                        display: true,
                        text: 'Kvartal',
                        font: { size: 12, weight: 'bold' }
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Rente (%)',
                        font: { size: 12, weight: 'bold' }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Index (100 = start)',
                        font: { size: 12, weight: 'bold' }
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// Create Fiscal vs Monetary Policy Comparison Chart
function createFiscalMonetaryComparisonChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const timePeriods = ['0', '1', '2', '3', '4', '5', '6', '7', '8'];
    const fiscalPolicyBNP = [100, 103, 105, 106, 106.5, 106.8, 107, 107, 107];
    const monetaryPolicyBNP = [100, 100.5, 101.5, 102.5, 103.5, 104, 104.5, 104.8, 105];

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: timePeriods,
            datasets: [{
                label: 'Finanspolitik (FP) - BNP',
                data: fiscalPolicyBNP,
                borderColor: '#36a2eb',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                borderWidth: 3,
                pointRadius: 6,
                tension: 0.3
            }, {
                label: 'Pengepolitik (PP) - BNP',
                data: monetaryPolicyBNP,
                borderColor: '#ff6384',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                borderWidth: 3,
                pointRadius: 6,
                tension: 0.3
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'Sammenligning: Finanspolitik vs. Pengepolitik',
                    font: { size: 16, weight: 'bold', family: 'Inter, sans-serif' }
                },
                subtitle: {
                    display: true,
                    text: 'BNP-effekt over tid efter ekspansiv politik',
                    font: { size: 12, style: 'italic' }
                }
            },
            scales: {
                ...chartConfig.scales,
                x: {
                    ...chartConfig.scales.x,
                    title: {
                        display: true,
                        text: 'Kvartal efter politikændring',
                        font: { size: 12, weight: 'bold' }
                    }
                },
                y: {
                    ...chartConfig.scales.y,
                    title: {
                        display: true,
                        text: 'BNP (index, 100 = start)',
                        font: { size: 12, weight: 'bold' }
                    }
                }
            }
        }
    });
}

// Create Policy Lag Chart
function createPolicyLagChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const months = ['0', '3', '6', '9', '12', '15', '18', '21', '24'];
    const recognitionLag = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const decisionLag = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const implementationLag = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const effectLag = [0, 0, 0, 0, 0, 0, 0, 0, 0];

    // Recognition lag: 0-3 months
    recognitionLag[0] = 100; recognitionLag[1] = 100;
    // Decision lag: 3-6 months
    decisionLag[1] = 100; decisionLag[2] = 100;
    // Implementation lag: 6-12 months
    implementationLag[2] = 100; implementationLag[3] = 100; implementationLag[4] = 100;
    // Effect lag: 12-24 months
    for (let i = 4; i < 9; i++) {
        effectLag[i] = 100 - (i - 4) * 10;
    }

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Genkendelseslag',
                data: recognitionLag,
                borderColor: '#ff6384',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                borderWidth: 2,
                fill: true
            }, {
                label: 'Beslutningslag',
                data: decisionLag,
                borderColor: '#ffce56',
                backgroundColor: 'rgba(255, 206, 86, 0.1)',
                borderWidth: 2,
                fill: true
            }, {
                label: 'Implementeringslag',
                data: implementationLag,
                borderColor: '#4bc0c0',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                borderWidth: 2,
                fill: true
            }, {
                label: 'Effektlag',
                data: effectLag,
                borderColor: '#9966ff',
                backgroundColor: 'rgba(153, 102, 255, 0.1)',
                borderWidth: 3,
                fill: true
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'Politiklags - Tidsforsinkelser i økonomisk politik',
                    font: { size: 16, weight: 'bold', family: 'Inter, sans-serif' }
                }
            },
            scales: {
                ...chartConfig.scales,
                x: {
                    ...chartConfig.scales.x,
                    title: {
                        display: true,
                        text: 'Måneder',
                        font: { size: 12, weight: 'bold' }
                    }
                },
                y: {
                    ...chartConfig.scales.y,
                    title: {
                        display: true,
                        text: 'Intensitet',
                        font: { size: 12, weight: 'bold' }
                    },
                    max: 100
                }
            }
        }
    });
}

// Chart Observer to trigger animations when visible
const chartObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const element = entry.target;
            const chartType = element.dataset.chartType;
            const chartData = element.dataset.chartData;

            if (!element.dataset.initialized) {
                element.dataset.initialized = 'true';

                // Initialize based on type
                switch (chartType) {
                    case 'national-accounts':
                        createNationalAccountsChart(element.id);
                        break;
                    case 'economic-circuit':
                        createEconomicCircuitVis(element.id);
                        break;
                    case 'economic-circuit-svg':
                        createEconomicCircuit(element.id);
                        break;
                    case 'economic-circuit-d3':
                        createEconomicCircuitD3(element.id);
                        break;
                    case 'economic-circuit-cytoscape':
                        createEconomicCircuitCytoscape(element.id);
                        break;
                    case 'economic-circuit-vis':
                        createEconomicCircuitVis(element.id);
                        break;
                    case 'expansionary-policy-flowchart':
                        createExpansionaryPolicyFlowchart(element.id);
                        break;
                    case 'contractionary-policy-flowchart':
                        createContractionaryPolicyFlowchart(element.id);
                        break;

                    case 'supply-pie':
                        createSupplyAndUsePieChart(element.id, 'supply');
                        break;
                    case 'use-pie':
                        createSupplyAndUsePieChart(element.id, 'use');
                        break;
                    case 'bfi-pie':
                        createBFIPieChart(element.id);
                        break;
                    case 'employment-sector-pie':
                        const countryCode = element.dataset.chartData || 'DK';
                        createEmploymentSectorPieChart(element.id, countryCode);
                        break;
                    case 'bop-detailed':
                        createBOPDetailedChart(element.id);
                        break;
                    case 'hdi-bar':
                        createHDIChart(element.id);
                        break;
                    case 'gdp-per-capita-bar':
                        createGDPPerCapitaBarChart(element.id);
                        break;
                    case 'national-sankey':
                        createNationalAccountsSankey(element.id);
                        break;
                    case 'saving-investment-sankey':
                        createSavingInvestmentSankey(element.id);
                        break;
                    case 'output-gap':
                        const outputGapCountries = element.dataset.chartData ?
                            element.dataset.chartData.split(',') : ['DNK', 'DEU', 'SWE', 'NOR'];
                        createOutputGapChart(element.id, outputGapCountries);
                        break;
                    case 'exchange-rate':
                        createExchangeRateChart(element.id);
                        break;
                    case 'interest-rate':
                        createInterestRateChart(element.id, chartData || 'DK');
                        break;
                    case 'adas-model':
                    case 'sesu-model':
                        createADASChart(element.id);
                        break;
                    case 'keynes-basic':
                        createKeynesBasicChart(element.id);
                        break;
                    case 'keynes-fp':
                        createKeynesFPChart(element.id);
                        break;
                    case 'keynes-multiplier':
                        createKeynesMultiplierChart(element.id);
                        break;
                    case 'public-balance':
                        createPublicBalanceChart(element.id);
                        break;
                    case 'employment-y':
                        createEmploymentChart(element.id);
                        break;
                    case 'balance-of-payments':
                        createBalanceOfPaymentsChart(element.id);
                        break;
                    case 'keynes-expansive':
                        createKeynesExpansiveChart(element.id);
                        break;
                    case 'public-balance-expansive':
                        createPublicBalanceExpansiveChart(element.id);
                        break;
                    case 'employment-expansive':
                        createEmploymentExpansiveChart(element.id);
                        break;
                    case 'balance-of-payments-expansive':
                        createBalanceOfPaymentsExpansiveChart(element.id);
                        break;
                    case 'multiplier':
                        createMultiplierChart(element.id);
                        break;
                    case 'phillips-curve':
                        createPhillipsCurveChart(element.id);
                        break;
                    case 'money-supply':
                        createMoneySupplyChart(element.id);
                        break;
                    case 'risk-premium':
                        createRiskPremiumChart(element.id);
                        break;
                    case 'real-nominal-rate':
                        createRealNominalRateChart(element.id);
                        break;
                    case 'policy-effectiveness':
                        createPolicyEffectivenessChart(element.id);
                        break;
                    case 'fiscal-multiplier':
                        createFiscalPolicyMultiplierChart(element.id);
                        break;
                    case 'monetary-transmission':
                        createMonetaryPolicyTransmissionChart(element.id);
                        break;
                    case 'fiscal-monetary-comparison':
                        createFiscalMonetaryComparisonChart(element.id);
                        break;
                    case 'policy-lag':
                        createPolicyLagChart(element.id);
                        break;
                    case 'gdp-per-capita':
                        // Assuming standard countries for now
                        fetchGDPPerCapitaData().then(data => {
                            new Chart(element, { type: 'line', data: data, options: chartConfig });
                        });
                        break;
                }
            }
        }
    });
}, { threshold: 0.1 });

// Initialize all charts when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    // Initialize Mermaid
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true,
                curve: 'basis'
            }
        });
    }

    const charts = document.querySelectorAll('[data-chart-type]');
    charts.forEach(canvas => {
        chartObserver.observe(canvas);
    });

    // Also observe divs (not just canvas elements)
    const chartDivs = document.querySelectorAll('[data-chart-type]');
    chartDivs.forEach(div => {
        chartObserver.observe(div);
    });
});
