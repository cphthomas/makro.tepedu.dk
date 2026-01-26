// Chart.js API Integration for Economic Data
// Handles fetching data from various APIs and creating animated charts

// API Configuration
// Historical Economic Shocks for more realistic mock data
const ECONOMIC_SHOCKS = {
    2008: { gdpM: 0.98, unempO: 0.5, inflO: -0.5 },
    2009: { gdpM: 0.95, unempO: 1.5, inflO: -1.0 },
    2010: { gdpM: 1.03, unempO: -0.3, inflO: 0.5 },
    2020: { gdpM: 0.94, unempO: 1.2, inflO: -1.0 },
    2021: { gdpM: 1.06, unempO: -0.7, inflO: 2.5 },
    2022: { gdpM: 1.03, unempO: -0.4, inflO: 5.0 },
    2023: { gdpM: 1.01, unempO: 0.1, inflO: -2.0 }
};

// Caching utilities for LocalStorage
const API_CACHE_PREFIX = 'makro_api_cache_';
const API_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // Cache for 1 week

function getCachedData(key) {
    try {
        const cached = localStorage.getItem(API_CACHE_PREFIX + key);
        if (cached) {
            const { timestamp, data } = JSON.parse(cached);
            if (Date.now() - timestamp < API_CACHE_DURATION) {
                return data;
            }
        }
    } catch (e) { }
    return null;
}

function setCachedData(key, data) {
    try {
        localStorage.setItem(API_CACHE_PREFIX + key, JSON.stringify({
            timestamp: Date.now(),
            data: data
        }));
    } catch (e) { }
}

function getAnyCachedData(key) {
    try {
        const cached = localStorage.getItem(API_CACHE_PREFIX + key);
        if (cached) {
            const { data } = JSON.parse(cached);
            return data;
        }
    } catch (e) { }
    return null;
}

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
            gdpPerCapita: 'NY.GDP.PCAP.CD',
            gdpGrowth: 'NY.GDP.MKTP.KD.ZG', // GDP growth (annual %)
            unemployment: 'SL.UEM.TOTL.ZS',   // Unemployment, total (% of total labor force) (modeled ILO estimate)
            inflation: 'FP.CPI.TOTL.ZG',     // Inflation, consumer prices (annual %)
            bop: 'BN.CAB.XOKA.CD'            // Current account balance (BoP, current US$)
        }
    },
    // Danmarks Statistik StatBank API
    statbank: {
        baseUrl: 'https://api.statbank.dk/v1/data',
        tables: {
            interestRates: 'DNRENTA', // Annual interest rates
            inflation: 'PRIS111', // Consumer Price Index
            jobVacancies: 'LSK03' // Ledige stillinger (sæsonkorrigeret)
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
async function fetchExchangeRates(days = 365, currencies = ['EUR', 'USD']) {
    const cacheKey = `exchange_rates_${days}_${currencies.join('_')}`;
    try {
        const response = await fetch(API_CONFIG.exchangeRate.baseUrl);
        if (!response.ok) throw new Error('API response not ok');
        const data = await response.json();

        // Get current rates for all requested currencies
        const rates = {};
        currencies.forEach(currency => {
            if (data.rates[currency]) {
                rates[currency] = 1 / data.rates[currency]; // DKK per currency unit
            }
        });

        const historical = generateHistoricalExchangeRates(rates, days, currencies);
        setCachedData(cacheKey, historical);
        return historical;
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        const cached = getAnyCachedData(cacheKey);
        if (cached) {
            console.log('Using cached exchange rates (backup)');
            return cached;
        }
        return generateMockExchangeRates(days, currencies);
    }
}

// Generate historical exchange rate data (simulated)
function generateHistoricalExchangeRates(currentRates, days, currencies) {
    const data = {
        labels: []
    };

    // Initialize arrays for each currency
    currencies.forEach(currency => {
        data[currency] = [];
    });

    const today = new Date();

    // Initialize rates
    const rates = {};
    const bounds = {
        EUR: { min: 7.43, max: 7.47 }, // Very stable due to fixed exchange rate policy
        USD: { min: 6.0, max: 7.5 },
        GBP: { min: 8.0, max: 10.0 },
        JPY: { min: 0.04, max: 0.06 },
        CNY: { min: 0.9, max: 1.1 },
        RUB: { min: 0.06, max: 0.12 }
    };

    currencies.forEach(currency => {
        rates[currency] = currentRates[currency] || (bounds[currency].min + bounds[currency].max) / 2;
    });

    // Generate data backwards from today
    for (let i = days; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        currencies.forEach(currency => {
            // EUR has very little variation due to fixed exchange rate
            const variationRange = currency === 'EUR' ? 0.001 : 0.02;
            const variation = (Math.random() - 0.5) * variationRange;

            rates[currency] *= (1 + variation);

            // Keep rates within reasonable bounds
            if (bounds[currency]) {
                rates[currency] = Math.max(bounds[currency].min, Math.min(bounds[currency].max, rates[currency]));
            }
        });

        if (i % 7 === 0) { // Weekly data points
            data.labels.push(date.toLocaleDateString('da-DK', { month: 'short', day: 'numeric' }));
            currencies.forEach(currency => {
                data[currency].push(Number(rates[currency].toFixed(4)));
            });
        }
    }

    return data;
}

// Generate mock exchange rates if API fails
function generateMockExchangeRates(days, currencies = ['EUR', 'USD']) {
    const data = {
        labels: []
    };

    currencies.forEach(currency => {
        data[currency] = [];
    });

    const today = new Date();

    const defaultRates = {
        EUR: 7.4537,
        USD: 6.85,
        GBP: 9.0,
        JPY: 0.05,
        CNY: 1.0,
        RUB: 0.08
    };

    const rates = {};
    currencies.forEach(currency => {
        rates[currency] = defaultRates[currency] || 1.0;
    });

    for (let i = days; i >= 0; i -= 7) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        currencies.forEach(currency => {
            const variationRange = currency === 'EUR' ? 0.002 : 0.05;
            rates[currency] += (Math.random() - 0.5) * variationRange;
        });

        data.labels.push(date.toLocaleDateString('da-DK', { month: 'short', day: 'numeric' }));
        currencies.forEach(currency => {
            data[currency].push(Number(rates[currency].toFixed(4)));
        });
    }

    return data;
}

// Parse DNRENTD CSV into date -> { diskonto, destr }; return { labels, rates, ratesDESTR } aligned by date
function parseInterestRatesCsv(csv) {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return null;
    const byDate = {};
    const instrumentCol = 0, tidCol = 3, indholdCol = 4;
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(';');
        const instrument = (parts[instrumentCol] || '').toLowerCase();
        const tid = parts[tidCol];
        const indhold = parts[indholdCol];
        if (!tid || indhold === undefined) continue;
        const rate = parseFloat(String(indhold).replace(',', '.'));
        if (Number.isNaN(rate)) continue;
        if (!byDate[tid]) byDate[tid] = { diskonto: null, destr: null };
        if (instrument.indexOf('diskonto') !== -1) byDate[tid].diskonto = Number(rate.toFixed(2));
        if (instrument.indexOf('destr') !== -1 && instrument.indexOf('referencerente') !== -1) byDate[tid].destr = Number(rate.toFixed(2));
    }
    const dates = Object.keys(byDate).sort();
    const labels = [];
    const rates = [];
    const ratesDESTR = [];
    for (const tid of dates) {
        const match = tid.match(/^(\d{4})M(\d{2})D(\d{2})$/);
        const y = match ? parseInt(match[1], 10) : 0;
        const mo = match ? parseInt(match[2], 10) - 1 : 0;
        const day = match ? parseInt(match[3], 10) : 1;
        const date = match ? new Date(y, mo, day) : new Date(tid);
        labels.push(date.toLocaleDateString('da-DK', { month: 'short', day: 'numeric', year: 'numeric' }));
        rates.push(byDate[tid].diskonto);
        ratesDESTR.push(byDate[tid].destr);
    }
    return { labels, rates, ratesDESTR, hasDESTR: ratesDESTR.some(v => v != null) };
}

// Fetch interest rates from Danmarks Nationalbank (StatBank API: DNRENTD = diskonto + DESTR referencerente)
async function fetchInterestRatesFromStatBank(country = 'DK', approximateDays = 3650) {
    if (country !== 'DK') return null;
    const cacheKey = `interest_rates_statbank_dk_${approximateDays}_v2`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
    try {
        const nObs = Math.min(approximateDays, 2600);
        const response = await fetch('https://api.statbank.dk/v1/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                table: 'DNRENTD',
                format: 'CSV',
                lang: 'da',
                variables: [
                    { code: 'INSTRUMENT', values: ['ODKNAA', 'DESNAA'] },
                    { code: 'LAND', values: ['DK'] },
                    { code: 'OPGOER', values: ['E'] },
                    { code: 'Tid', values: [`(-n+${nObs})`] }
                ]
            })
        });
        if (!response.ok) throw new Error(`StatBank API: ${response.status}`);
        const csv = await response.text();
        const parsed = parseInterestRatesCsv(csv);
        if (!parsed || parsed.labels.length === 0) throw new Error('Ingen data');
        const data = {
            labels: parsed.labels,
            rates: parsed.rates,
            ratesDESTR: parsed.hasDESTR ? parsed.ratesDESTR : undefined,
            source: 'statbank',
            seriesName: 'Diskonto'
        };
        setCachedData(cacheKey, data);
        return data;
    } catch (error) {
        console.warn('StatBank rente (DNRENTD) ikke tilgængelig:', error.message);
        return null;
    }
}

// Fetch interest rates: real data (diskonto + DESTR) for DK, derefter backup fra fil, ellers simuleret
async function fetchInterestRates(country = 'DK', days = 365) {
    const cacheKey = `interest_rates_${country}_${days}`;
    if (country === 'DK' && days >= 365) {
        const statbankData = await fetchInterestRatesFromStatBank(country, days);
        if (statbankData) {
            setCachedData(cacheKey, statbankData);
            return statbankData;
        }
        const backup = await loadInterestRatesBackup();
        if (backup) {
            setCachedData(cacheKey, backup);
            return backup;
        }
    }
    try {
        const data = generateInterestRates(country, days);
        setCachedData(cacheKey, data);
        return data;
    } catch (error) {
        console.error('Error fetching interest rates:', error);
        const cached = getAnyCachedData(cacheKey);
        if (cached) return cached;
        const backup = await loadInterestRatesBackup();
        if (backup) return backup;
        return generateInterestRates(country, days);
    }
}

async function loadInterestRatesBackup() {
    try {
        const cache = await loadCachedChartData();
        const backup = cache && cache.interestRatesBackup;
        if (backup && backup.labels && Array.isArray(backup.rates)) return backup;
    } catch (e) { }
    try {
        const r = await fetch('interest-rates-backup.json');
        if (r.ok) {
            const backup = await r.json();
            if (backup && backup.labels && Array.isArray(backup.rates)) return backup;
        }
    } catch (e) { }
    return null;
}

// Fetch Money Supply Data
async function fetchMoneySupplyData() {
    const cacheKey = 'money_supply_dk';
    try {
        // Simulated API fetch for money supply
        await new Promise(resolve => setTimeout(resolve, 100));

        const years = ['2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024'];
        const m1 = [1000, 1050, 1100, 1150, 1200, 1250, 1350, 1400, 1450, 1500, 1550];
        const m2 = [1800, 1900, 2000, 2100, 2200, 2300, 2500, 2600, 2700, 2800, 2900];
        const m3 = [2200, 2300, 2400, 2500, 2600, 2700, 2900, 3000, 3100, 3200, 3300];

        const data = { labels: years, m1, m2, m3 };
        setCachedData(cacheKey, data);
        return data;
    } catch (error) {
        console.error('Error fetching money supply data:', error);
        const cached = getAnyCachedData(cacheKey);
        if (cached) return cached;
        // Fallback to defaults
        return {
            labels: ['2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024'],
            m1: [1000, 1050, 1100, 1150, 1200, 1250, 1350, 1400, 1450, 1500, 1550],
            m2: [1800, 1900, 2000, 2100, 2200, 2300, 2500, 2600, 2700, 2800, 2900],
            m3: [2200, 2300, 2400, 2500, 2600, 2700, 2900, 3000, 3100, 3200, 3300]
        };
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
        const localStorageKey = `gdp_${countries.join('_')}_${years}`;

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

        // Try local storage if not using static cache
        if (!useCachedData) {
            const localCached = getAnyCachedData(localStorageKey);
            if (localCached) {
                results = localCached;
                useCachedData = true;
            }
        }

        // If not using cached data, fetch from API
        if (!useCachedData) {
            const promises = countries.map(async (countryCode) => {
                const url = `${API_CONFIG.worldBank.baseUrl}/${countryCode}/indicator/${API_CONFIG.worldBank.indicators.gdp}?date=${startYear}:${endYear}&format=json`;

                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error('API response not ok');
                    const data = await response.json();

                    if (data && data[1]) {
                        return {
                            country: countryCode,
                            data: data[1].reverse() // Most recent last
                        };
                    }
                } catch (error) {
                    console.error(`Error fetching GDP for ${countryCode}:`, error);
                }

                return null;
            });

            results = await Promise.all(promises);
            // Save to local storage if we got data
            if (results.some(r => r !== null)) {
                setCachedData(localStorageKey, results);
            }
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
        let currentGDP = baseGDP[country] || 500;
        const countryData = [];

        // Initial value based on years back
        const growthRate = 1.02;
        currentGDP = currentGDP / Math.pow(growthRate, years);

        data.labels.forEach((yearStr) => {
            const year = parseInt(yearStr);
            // Simulate growth
            let yearGrowth = 1.02; // 2% annual growth

            // Apply shock if exists (using the shared ECONOMIC_SHOCKS from elsewhere in file)
            // Note: ECONOMIC_SHOCKS is defined near line 1865
            if (typeof ECONOMIC_SHOCKS !== 'undefined' && ECONOMIC_SHOCKS[year]) {
                yearGrowth = yearGrowth * ECONOMIC_SHOCKS[year].gdpM;
            }

            currentGDP = currentGDP * yearGrowth * (1 + (Math.random() - 0.5) * 0.02);
            countryData.push(Number(currentGDP.toFixed(2)));
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
        // Fetch Current Account Balance for Denmark from World Bank (in USD)
        // Indicator BN.CAB.XOKA.CD is more reliable than LCU in the API
        const results = await fetchWorldBankData(API_CONFIG.worldBank.indicators.bop, ['DNK'], years);

        if (results && results[0] && results[0].data) {
            const bopData = results[0].data;
            const labels = Object.keys(bopData).sort();

            // Hardcoded exchange rate for historical consistency (~7.0 DKK per USD)
            const USD_DKK_RATE = 7.0;

            return {
                labels: labels,
                currentAccount: labels.map(y => Number((bopData[y] * USD_DKK_RATE / 1000000000).toFixed(1))), // Convert to billions DKK
                overall: labels.map(y => Number((bopData[y] * USD_DKK_RATE / 1000000000 * 1.05).toFixed(1))) // Simulated overall balance
            };
        }
        return generateBalanceOfPayments(years);
    } catch (error) {
        console.error('Error fetching real balance of payments:', error);
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

        <div id="circuit-tooltip" style="position: absolute; display: none; background: #ffffff; border: 2px solid #14b8a6; padding: 10px; border-radius: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); z-index: 1000; max-width: 220px; font-size: 12px; pointer-events: none;"></div>
    </div>

    <style>
        .circuit-node:hover rect { stroke: #14b8a6; stroke-width: 2px; cursor: pointer; }
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
            borderRadius: 0, // Hårde hjørner - ingen runde hjørner
            font: {
                size: 16,
                face: "'Open Sans', sans-serif",
                color: '#0f172a',
                multi: false
            },
            color: {
                background: '#ffffff',
                border: '#e2e8f0',
                borderWidth: 1,
                highlight: {
                    background: '#f0f9ff',
                    border: '#14b8a6',
                    borderWidth: 2
                },
                hover: {
                    background: '#f8fafc',
                    border: '#14b8a6'
                }
            },
            shadow: { enabled: true, size: 8, x: 0, y: 2 },
            widthConstraint: { maximum: 160 },
            heightConstraint: { maximum: 85 },
            shapeProperties: {
                borderRadius: 0  // Force hårde hjørner
            }
        },
        edges: {
            arrows: { to: { enabled: true, scaleFactor: 0.8 } },
            font: {
                size: 13,
                align: 'middle',
                face: "'Open Sans', sans-serif",
                color: '#1e293b',
                multi: false
            },
            smooth: { type: 'straight' },
            color: { highlight: '#14b8a6' }
        },
        physics: false,
        interaction: {
            dragNodes: false,
            zoomView: false,  // Disabled zoom
            dragView: false,  // Disabled pan
            selectConnectedEdges: false,
            hover: true,
            tooltipDelay: 0,
            hideEdgesOnDrag: false,
            hideEdgesOnZoom: false,
            selectable: false,  // Disable selection to prevent black box
            tooltip: false  // Disable vis.js default tooltip - we use custom one
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
                canvas.style.fontFamily = "'Open Sans', sans-serif";
            }
            
            // Force remove border-radius from all nodes
            const nodeElements = container.querySelectorAll('.vis-network .vis-node');
            nodeElements.forEach(node => {
                if (node.style) {
                    node.style.borderRadius = '0';
                }
            });

        // Add CSS to prevent black selection
        if (!document.getElementById('vis-network-font-fix')) {
            const style = document.createElement('style');
            style.id = 'vis-network-font-fix';
            style.textContent = `
                #${containerId} canvas {
                    font-family: 'Open Sans', sans-serif !important;
                }
                .vis-network .vis-node.vis-selected {
                    background-color: #f0f9ff !important;
                    border-color: #14b8a6 !important;
                    color: #0f172a !important;
                }
                .vis-network .vis-node {
                    border-radius: 0 !important;
                }
                #${containerId} .vis-network .vis-node {
                    border-radius: 0 !important;
                }
                .vis-network .vis-node .vis-label {
                    font-family: 'Open Sans', sans-serif !important;
                }
                .vis-tooltip {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                }
                /* Force hårde hjørner på alle vis.js noder */
                .vis-network .vis-node,
                .vis-network .vis-node div,
                .vis-network .vis-node rect {
                    border-radius: 0 !important;
                    -webkit-border-radius: 0 !important;
                    -moz-border-radius: 0 !important;
                }
                /* Force hvid baggrund på tooltip */
                #economic-circuit-tooltip {
                    background: #ffffff !important;
                    background-color: #ffffff !important;
                }
            `;
            document.head.appendChild(style);
        }
    });

    // Create custom tooltip element with modern styling
    const tooltip = document.createElement('div');
    tooltip.id = 'economic-circuit-tooltip';
    tooltip.style.cssText = `
        position: fixed;
        display: none;
        visibility: hidden;
        opacity: 0;
        background: #ffffff !important;
        background-color: #ffffff !important;
        border: 2px solid #14b8a6 !important;
        border-radius: 0 !important;
        padding: 14px 16px;
        box-shadow: 0 10px 25px rgba(20, 184, 166, 0.15), 0 4px 10px rgba(0,0,0,0.1);
        font-family: 'Open Sans', sans-serif !important;
        font-size: 13px;
        color: #0f172a;
        max-width: 280px;
        z-index: 99999 !important;
        pointer-events: none;
        white-space: pre-line;
        line-height: 1.5;
        transition: opacity 0.1s ease;
    `;

    // Remove gradient styling - not needed with turkis border
    if (!document.getElementById('economic-circuit-tooltip-style')) {
        const style = document.createElement('style');
        style.id = 'economic-circuit-tooltip-style';
        style.textContent = `
            #economic-circuit-tooltip {
                font-weight: 500;
                background: #ffffff !important;
                border: 2px solid #14b8a6 !important;
            }
            /* Hide vis.js default tooltip */
            .vis-tooltip {
                display: none !important;
                visibility: hidden !important;
            }
            /* Ensure our custom tooltip is visible */
            #economic-circuit-tooltip[style*="display: block"] {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                background: #ffffff !important;
                background-color: #ffffff !important;
            }
            #economic-circuit-tooltip {
                position: fixed !important;
                z-index: 99999 !important;
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
                tooltip.style.background = '#ffffff';
                tooltip.style.border = '2px solid #14b8a6';
                tooltip.style.borderRadius = '0';
                tooltip.style.visibility = 'visible';
                tooltip.style.opacity = '1';
                
                // Set initial position based on mouse or node position
                const canvas = container.querySelector('canvas');
                if (canvas) {
                    const rect = canvas.getBoundingClientRect();
                    const nodePos = network.getPositions([params.node]);
                    if (nodePos[params.node]) {
                        const x = rect.left + nodePos[params.node].x + 100;
                        const y = rect.top + nodePos[params.node].y - 50;
                        tooltip.style.left = x + 'px';
                        tooltip.style.top = y + 'px';
                    }
                }
            }
        }
    });

    network.on("blurNode", function (params) {
        currentHoveredNode = null;
        container.style.cursor = 'default';
        tooltip.style.display = 'none';
        tooltip.style.visibility = 'hidden';
        tooltip.style.opacity = '0';
    });

    // Track mouse position for tooltip
    const updateTooltipPosition = function (e) {
        if (currentHoveredNode && tooltip.style.display === 'block') {
            const mouseX = e.clientX;
            const mouseY = e.clientY;

            tooltip.style.left = (mouseX + 15) + 'px';
            tooltip.style.top = (mouseY + 15) + 'px';
            tooltip.style.visibility = 'visible';
            tooltip.style.opacity = '1';

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

    // Add mouse move listener to container and window
    container.addEventListener('mousemove', updateTooltipPosition);
    window.addEventListener('mousemove', updateTooltipPosition);

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

    const currencies = ['EUR', 'USD', 'GBP', 'JPY', 'CNY', 'RUB'];
    const colors = {
        EUR: 'rgb(75, 192, 192)',
        USD: 'rgb(255, 99, 132)',
        GBP: 'rgb(153, 102, 255)',
        JPY: 'rgb(255, 159, 64)',
        CNY: 'rgb(54, 162, 235)',
        RUB: 'rgb(255, 206, 86)'
    };

    fetchExchangeRates(730, currencies).then(data => {
        const datasets = currencies.map(currency => ({
            label: `DKK/${currency}`,
            data: data[currency],
            borderColor: colors[currency],
            backgroundColor: colors[currency].replace('rgb', 'rgba').replace(')', ', 0.2)'),
            tension: 0.4,
            fill: false,
            borderWidth: 2
        }));

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: datasets
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

// Create EUR/DKK Fixed Exchange Rate Band Chart
function createEuroBandChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    fetchExchangeRates(3650, ['EUR']).then(data => {
        // Fixed exchange rate bands
        const centralRate = 7.46038;  // Central rate since 1999
        const upperBand = centralRate * 1.0225;  // +2.25% band
        const lowerBand = centralRate * 0.9775;  // -2.25% band

        // Create band data
        const upperBandData = data.labels.map(() => upperBand);
        const lowerBandData = data.labels.map(() => lowerBand);
        const centralRateData = data.labels.map(() => centralRate);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'DKK/EUR Kurs',
                        data: data.EUR,
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        tension: 0.4,
                        fill: false,
                        borderWidth: 3,
                        pointRadius: 0
                    },
                    {
                        label: 'Centralkurs (7,46038)',
                        data: centralRateData,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        borderDash: [5, 5],
                        tension: 0,
                        fill: false,
                        borderWidth: 2,
                        pointRadius: 0
                    },
                    {
                        label: 'Øvre bånd (+2,25%)',
                        data: upperBandData,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        borderDash: [10, 5],
                        tension: 0,
                        fill: '+1',
                        borderWidth: 2,
                        pointRadius: 0
                    },
                    {
                        label: 'Nedre bånd (-2,25%)',
                        data: lowerBandData,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        borderDash: [10, 5],
                        tension: 0,
                        fill: false,
                        borderWidth: 2,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                ...chartConfig,
                plugins: {
                    ...chartConfig.plugins,
                    title: {
                        display: true,
                        text: 'Danmarks fastkurspolitik: DKK/EUR med interventionsbånd',
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
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(5) + ' DKK';
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    ...chartConfig.scales,
                    y: {
                        ...chartConfig.scales.y,
                        min: 7.28,
                        max: 7.64,
                        ticks: {
                            ...chartConfig.scales.y.ticks,
                            stepSize: 0.05,
                            callback: function (value) {
                                return value.toFixed(2) + ' DKK';
                            }
                        },
                        title: {
                            display: true,
                            text: 'Valutakurs (DKK per EUR)',
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

    fetchInterestRates(country, 3650).then(data => {
        const allRates = data.rates.concat((data.ratesDESTR || []).filter(v => v != null));
        const minRate = allRates.length ? Math.min(...allRates) : 0;
        const maxRate = allRates.length ? Math.max(...allRates) : 1;
        const chartTitle = (data.source === 'statbank')
            ? 'Diskonto og DESTR (referencerente)'
            : (country === 'DK' ? 'Udvikling i danske renter' : 'Udvikling i ECB renter');
        const datasets = [
            {
                label: 'Diskonto (%)',
                data: data.rates,
                borderColor: 'rgb(54, 162, 235)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                tension: 0.4,
                fill: false,
                borderWidth: 2
            }
        ];
        if (data.ratesDESTR && data.ratesDESTR.some(v => v != null)) {
            datasets.push({
                label: 'DESTR / referencerente (%)',
                data: data.ratesDESTR,
                borderColor: 'rgb(220, 120, 50)',
                backgroundColor: 'rgba(220, 120, 50, 0.15)',
                tension: 0.4,
                fill: false,
                borderWidth: 2,
                spanGaps: true
            });
        } else if (data.seriesName) {
            datasets[0].label = data.seriesName + ' (%)';
        } else if (country !== 'DK') {
            datasets[0].label = 'ECB renter (%)';
        }
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: datasets
            },
            options: {
                ...chartConfig,
                plugins: {
                    ...chartConfig.plugins,
                    title: {
                        display: true,
                        text: chartTitle,
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
        const localStorageKey = `gdp_pc_${countries.join('_')}_${years}`;

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

        // Try local storage if not using static cache
        if (!useCachedData) {
            const localCached = getAnyCachedData(localStorageKey);
            if (localCached) {
                results = localCached;
                useCachedData = true;
            }
        }

        // If cached data not available or incomplete, try API
        if (!useCachedData) {
            const promises = countries.map(async (countryCode) => {
                const url = `${API_CONFIG.worldBank.baseUrl}/${countryCode}/indicator/${API_CONFIG.worldBank.indicators.gdpPerCapita}?date=${startYear}:${endYear}&format=json`;

                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error('API response not ok');
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
            // Save to local storage if we got data
            if (results.some(r => r !== null)) {
                setCachedData(localStorageKey, results);
            }
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

// Fetch any indicator from World Bank for multiple countries
async function fetchWorldBankData(indicator, countries, years = 30) {
    const endYear = new Date().getFullYear();
    const startYear = endYear - years;
    const cacheKey = `${indicator}_${countries.join('_')}_${years}`;

    // Try LocalStorage cache first
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    const promises = countries.map(async (countryCode) => {
        const url = `https://api.worldbank.org/v2/country/${countryCode}/indicator/${indicator}?date=${startYear}:${endYear}&format=json`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data && data[1]) {
                const result = {};
                data[1].forEach(item => {
                    if (item.date && item.value !== null) {
                        result[item.date] = item.value;
                    }
                });
                return { country: countryCode, data: result };
            }
        } catch (error) {
            console.error(`Error fetching ${indicator} for ${countryCode}:`, error);
        }
        return { country: countryCode, data: {} };
    });

    const finalResult = await Promise.all(promises);

    // Only cache if we actually got some data
    const hasData = finalResult.some(r => Object.keys(r.data).length > 0);
    if (hasData) {
        setCachedData(cacheKey, finalResult);
    }

    return finalResult;
}

// Fetch unemployment and inflation data
async function fetchUnemploymentInflationData(country = 'DNK', years = 40) {
    try {
        // Fetch both unemployment and inflation from World Bank
        const [unempResults, inflResults] = await Promise.all([
            fetchWorldBankData(API_CONFIG.worldBank.indicators.unemployment, [country], years),
            fetchWorldBankData(API_CONFIG.worldBank.indicators.inflation, [country], years)
        ]);

        const unempData = unempResults[0]?.data || {};
        const inflData = inflResults[0]?.data || {};

        // Get unified list of years
        const allYears = Array.from(new Set([...Object.keys(unempData), ...Object.keys(inflData)])).sort();

        if (allYears.length === 0) throw new Error('No data found');

        return {
            labels: allYears,
            unemployment: allYears.map(y => unempData[y] !== undefined ? Number(unempData[y].toFixed(1)) : null),
            inflation: allYears.map(y => inflData[y] !== undefined ? Number(inflData[y].toFixed(1)) : null)
        };
    } catch (error) {
        console.error('Error fetching real unemployment/inflation data:', error);
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
        // Base trend
        if (year < 1990) {
            unemployment += (Math.random() - 0.5) * 0.2;
            inflation = baseValues.inflationBase + 2.0 + (Math.random() - 0.5) * 1.0;
        } else if (year < 2000) {
            unemployment += (Math.random() - 0.4) * 0.1; // Slight downward trend
            inflation = baseValues.inflationBase + 0.5 + (Math.random() - 0.5) * 0.5;
        } else if (year < 2010) {
            unemployment += (Math.random() - 0.5) * 0.1;
            inflation = baseValues.inflationBase + (Math.random() - 0.5) * 0.3;
        } else {
            unemployment += (Math.random() - 0.5) * 0.1;
            inflation = baseValues.inflationBase + (Math.random() - 0.5) * 0.2;
        }

        // Apply historical shocks if they exist
        const shock = ECONOMIC_SHOCKS[year];
        if (shock) {
            unemployment += shock.unempO;
            inflation += shock.inflO;
        }

        // Clamp values to realistic ranges
        unemployment = Math.max(2.0, Math.min(12.0, unemployment));
        inflation = Math.max(-1.0, Math.min(12.0, inflation));

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
                            bottom: 10, // Reduced space
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

// Create Phillips Curve Chart with real API data
function createAPIPhillipsCurveChart(canvasId, countries = ['DNK', 'USA']) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

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

    const countryColors = {
        'DNK': 'rgb(255, 99, 132)',
        'USA': 'rgb(54, 162, 235)',
        'DEU': 'rgb(75, 192, 192)',
        'SWE': 'rgb(255, 206, 86)'
    };

    Promise.all(countries.map(country => fetchUnemploymentInflationData(country, 40)))
        .then(dataArray => {
            const datasets = [];

            countries.forEach((countryCode, index) => {
                const data = dataArray[index];
                const points = [];

                data.labels.forEach((year, i) => {
                    if (data.unemployment[i] !== null && data.inflation[i] !== null) {
                        points.push({
                            x: data.unemployment[i],
                            y: data.inflation[i],
                            year: year
                        });
                    }
                });

                if (points.length > 0) {
                    const color = countryColors[countryCode] || `hsl(${index * 137.5}, 70%, 50%)`;
                    datasets.push({
                        label: countryNames[countryCode] || countryCode,
                        data: points,
                        backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.6)'),
                        borderColor: color,
                        borderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        showLine: false
                    });
                }
            });

            new Chart(ctx, {
                type: 'scatter',
                data: { datasets },
                options: {
                    ...chartConfig,
                    plugins: {
                        ...chartConfig.plugins,
                        title: {
                            display: true,
                            text: 'Phillips-kurven: Faktiske data for inflation og ledighed',
                            font: { size: 16, weight: 'bold', family: 'Inter, sans-serif' },
                            padding: { top: 10, bottom: 20 }
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    const point = context.raw;
                                    const datasetLabel = context.dataset.label || '';
                                    return `${datasetLabel} (${point.year}): Ledighed: ${point.x.toFixed(1)}%, Inflation: ${point.y.toFixed(1)}%`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: { display: true, text: 'Ledighed (%)', font: { weight: 'bold' } },
                            ticks: { callback: v => v.toFixed(1) + '%' }
                        },
                        y: {
                            title: { display: true, text: 'Inflation (%)', font: { weight: 'bold' } },
                            ticks: { callback: v => v.toFixed(1) + '%' }
                        }
                    }
                }
            });
        }).catch(error => {
            console.error('Error creating API Phillips Curve chart:', error);
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

    // Fetch real data from World Bank
    Promise.all([
        fetchWorldBankData(API_CONFIG.worldBank.indicators.gdpGrowth, countries, 30),
        fetchWorldBankData(API_CONFIG.worldBank.indicators.unemployment, countries, 31) // Fetch one extra year for change calculation
    ]).then(([gdpGrowthArray, unemploymentArray]) => {
        // Process data to calculate GDP growth and unemployment change
        const datasets = [];

        countries.forEach((countryCode) => {
            const countryGdp = gdpGrowthArray.find(d => d.country === countryCode);
            const countryUnemp = unemploymentArray.find(d => d.country === countryCode);

            if (!countryGdp || !countryUnemp) return;

            const gdpData = countryGdp.data;
            const unempData = countryUnemp.data;

            const points = [];
            const years = Object.keys(gdpData).sort();

            years.forEach(year => {
                const prevYear = (parseInt(year) - 1).toString();
                if (unempData[year] !== undefined && unempData[prevYear] !== undefined) {
                    const growthVal = gdpData[year];
                    const unempChange = unempData[year] - unempData[prevYear];

                    points.push({
                        x: Number(growthVal.toFixed(2)),
                        y: Number(unempChange.toFixed(2)),
                        year: year
                    });
                }
            });

            if (points.length > 0) {
                const color = countryColors[countryCode] || 'rgb(128, 128, 128)';
                const rgbMatch = color.match(/\d+/g);
                const rgbaColor = rgbMatch ? `rgba(${rgbMatch[0]}, ${rgbMatch[1]}, ${rgbMatch[2]}, 0.6)` : color;

                datasets.push({
                    label: countryNames[countryCode] || countryCode,
                    data: points,
                    backgroundColor: rgbaColor,
                    borderColor: color,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    showLine: false
                });
            }
        });

        new Chart(ctx, {
            type: 'scatter',
            data: { datasets },
            options: {
                ...chartConfig,
                plugins: {
                    ...chartConfig.plugins,
                    title: {
                        display: true,
                        text: "Okun's lov - Sammenhæng mellem BNP-vækst og ledighedsændring",
                        font: { size: 16, weight: 'bold', family: 'Inter, sans-serif' },
                        padding: { top: 10, bottom: 20 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const point = context.raw;
                                const datasetLabel = context.dataset.label || '';
                                return `${datasetLabel} (${point.year}): Vækst: ${point.x.toFixed(2)}%, Δ Ledighed: ${point.y > 0 ? '+' : ''}${point.y.toFixed(2)} pp`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'BNP-vækst (%)', font: { weight: 'bold' } },
                        ticks: { callback: v => v.toFixed(1) + '%' }
                    },
                    y: {
                        title: { display: true, text: 'Ændring i ledighed (pp)', font: { weight: 'bold' } },
                        ticks: { callback: v => (v > 0 ? '+' : '') + v.toFixed(1) + ' pp' }
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

    // Generate mock data based on Okun's Law relationship and historical shocks
    const datasets = countries.map((country, index) => {
        const points = [];
        const endYear = new Date().getFullYear();
        const startYear = endYear - 30;

        for (let year = startYear; year <= endYear; year++) {
            // Base growth around 2%
            let gdpGrowth = 0.02 + (Math.random() - 0.5) * 0.03;

            // Apply historical shocks
            if (typeof ECONOMIC_SHOCKS !== 'undefined' && ECONOMIC_SHOCKS[year]) {
                // Adjust growth based on shock multiplier
                gdpGrowth = 0.02 * ECONOMIC_SHOCKS[year].gdpM - 0.02; // Create a dip
                if (year === 2009) gdpGrowth = -0.04 + (Math.random() * 0.02);
                if (year === 2020) gdpGrowth = -0.03 + (Math.random() * 0.02);
                if (year === 2021) gdpGrowth = 0.05 + (Math.random() * 0.02);
            }

            // Okun's Law: Unemployment change is negatively correlated with GDP growth
            // Relationship: Change in Unemp = -0.4 * (GDP Growth - 2.0%)
            const gdpGrowthPct = gdpGrowth * 100;
            const trendGrowth = 2.0;
            const unemploymentChange = -0.4 * (gdpGrowthPct - trendGrowth) + (Math.random() - 0.5) * 0.8;

            points.push({
                x: Number(gdpGrowthPct.toFixed(2)),
                y: Number(unemploymentChange.toFixed(2)),
                year: year
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
                            const yearStr = point.year ? ` (${point.year})` : '';
                            return `${datasetLabel}${yearStr}: BNP-vækst: ${point.x.toFixed(2)}%, Ledighedsændring: ${point.y > 0 ? '+' : ''}${point.y.toFixed(2)} pp`;
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

// Create Donut Chart for Wage-Price Spiral (Løn-pris-spiralen)
function createWagePriceSpiralChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Create a donut chart showing the circular spiral with 3 segments
    // Each segment represents one step in the cycle
    const labels = ['Højere priser', 'Højere lønkrav', 'Højere omkostninger'];
    const data = [33.33, 33.33, 33.34]; // Equal segments for the cycle (3 parts)
    // Use colors that flow into each other to show the spiral
    const colors = ['#ff6384', '#ff9f40', '#4bc0c0'];

    const chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 4,
                borderColor: '#ffffff',
                hoverOffset: 12
            }]
        },
        options: {
            ...chartConfig,
            cutout: '50%', // Make it a donut with larger segments
            rotation: -90, // Start from top
            circumference: 360,
            scales: {},
            plugins: {
                ...chartConfig.plugins,
                legend: {
                    display: false // Hide legend since text will be in segments
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return context.label;
                        }
                    }
                }
            }
        },
        plugins: [{
            id: 'spiralLabelsAndArrows',
            afterDraw: (chart) => {
                const { ctx, chartArea: { left, top, width, height } } = chart;
                const centerX = left + width / 2;
                const centerY = top + height / 2;
                const outerRadius = Math.min(width, height) / 2 * 0.9;
                const innerRadius = Math.min(width, height) / 2 * 0.5;
                const textRadius = (outerRadius + innerRadius) / 2; // Position text in middle of segment
                
                ctx.save();
                
                // Draw text labels in each segment
                const segments = chart.data.datasets[0].data.length;
                const angleStep = (2 * Math.PI) / segments;
                
                chart.data.labels.forEach((label, index) => {
                    // Calculate angle for center of segment
                    const segmentCenterAngle = -Math.PI / 2 + (index * angleStep) + (angleStep / 2);
                    
                    // Position text in center of segment
                    const textX = centerX + Math.cos(segmentCenterAngle) * textRadius;
                    const textY = centerY + Math.sin(segmentCenterAngle) * textRadius;
                    
                    // Draw text with shadow for readability
                    ctx.font = 'bold 16px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    // Text shadow
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                    ctx.fillText(label, textX + 2, textY + 2);
                    
                    // Text
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(label, textX, textY);
                });
                
                ctx.restore();
            }
        }]
    });
}

// Create Pie Chart for Employment by Sector (Erhvervsfordeling)
function createEmploymentSectorPieChart(canvasId, country = 'DK') {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Data for different countries (percentage of employment by sector)
    const countryData = {
        'DK': {
            labels: ['Primære erhverv', 'Industri', 'Service', 'Offentlig sektor'],
            data: [2.6, 15, 51.4, 31],
            colors: ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3'],
            title: 'Erhvervsfordeling i Danmark (2024)',
            countryName: 'Danmark',
            note: 'Bemærk: Service og offentlig sektor er opdelt. Service inkluderer handel, transport, finans osv.'
        },
        'CN': {
            labels: ['Primære erhverv', 'Industri', 'Service', 'Offentlig sektor'],
            data: [22.2, 29.0, 34.8, 14.0],
            colors: ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3'],
            title: 'Erhvervsfordeling i Kina (2024)',
            countryName: 'Kina'
        },
        'IN': {
            labels: ['Primære erhverv', 'Industri', 'Service', 'Offentlig sektor'],
            data: [46.1, 11.4, 29.5, 13.0],
            colors: ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3'],
            title: 'Erhvervsfordeling i Indien (2023)',
            countryName: 'Indien'
        },
        'US': {
            labels: ['Primære erhverv', 'Industri', 'Service', 'Offentlig sektor'],
            data: [1.4, 19.1, 63.5, 16.0],
            colors: ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3'],
            title: 'Erhvervsfordeling i USA (2024)',
            countryName: 'USA'
        },
        'DE': {
            labels: ['Primære erhverv', 'Industri', 'Service', 'Offentlig sektor'],
            data: [1.3, 27.7, 57.0, 14.0],
            colors: ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3'],
            title: 'Erhvervsfordeling i Tyskland (2024)',
            countryName: 'Tyskland'
        },
        'BR': {
            labels: ['Primære erhverv', 'Industri', 'Service', 'Offentlig sektor'],
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
        { country: 'Holland', value: 0.941 },
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
        { country: 'Holland', value: 68219 },
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

// Create SE-SU Model Chart with Negative Output Gap
function createSESUNegativeOutputGapChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Data points for the curves
    const nationalIncome = [0, 500, 1000, 1500, 2000, 2500, 3000];

    // SE (Aggregate Demand) - downward sloping red line
    // π = 8 - 0.002Y (example function)
    const seData = nationalIncome.map(y => 8 - 0.002 * y);

    // SUKORT (Short-run Aggregate Supply) - upward sloping blue line
    // π = 2 + 0.002Y (example function)
    const sukortData = nationalIncome.map(y => 2 + 0.002 * y);

    // SULANG (Long-run Aggregate Supply) - vertical grey line at Y = 2000
    const sulangY = 2000;
    const sulangData = Array(nationalIncome.length).fill(null);
    sulangData[4] = 0; // Start point
    sulangData[5] = 10; // End point

    // Equilibrium point (intersection of SE and SUKORT)
    // Solve: 8 - 0.002Y = 2 + 0.002Y => 6 = 0.004Y => Y = 1500
    const eqY = 1500;
    const eqPi = 8 - 0.002 * eqY; // π = 5

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: nationalIncome,
            datasets: [{
                label: 'SE',
                data: seData.map((pi, i) => ({ x: nationalIncome[i], y: pi })),
                borderColor: '#ef4444', // Red
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                tension: 0
            }, {
                label: 'SUKORT',
                data: sukortData.map((pi, i) => ({ x: nationalIncome[i], y: pi })),
                borderColor: '#3b82f6', // Blue
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                tension: 0
            }, {
                label: 'SULANG',
                data: [{ x: sulangY, y: 0 }, { x: sulangY, y: 10 }],
                borderColor: '#6b7280', // Grey
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                tension: 0
            }, {
                label: 'Ligevægt 0',
                data: [{ x: eqY, y: eqPi }],
                type: 'scatter',
                backgroundColor: '#fbbf24', // Yellow/Gold
                borderColor: '#fbbf24',
                pointRadius: 10,
                pointHoverRadius: 12,
                showLine: false
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'SE/SU model – Negativt output gab',
                    font: { size: 16, weight: 'bold', family: 'Inter, sans-serif' }
                },
                legend: {
                    ...chartConfig.plugins.legend,
                    display: false // Disable default legend - we'll use custom HTML legend
                },
                tooltip: {
                    ...chartConfig.plugins.tooltip,
                    callbacks: {
                        label: function (context) {
                            if (context.dataset.label.includes('Ligevægt')) {
                                return context.dataset.label;
                            }
                            let label = context.dataset.label;
                            if (label === 'SUKORT') label = 'SU\u2096\u2092\u1d63\u209c';
                            if (label === 'SULANG') label = 'SU\u2097\u2090\u2099\u1d4d';
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: 0,
                    max: 3000,
                    title: {
                        display: true,
                        text: 'Nationalindkomst (Y)',
                        font: { size: 12, weight: 'bold' }
                    },
                    ticks: {
                        display: false
                    }
                },
                y: {
                    min: 0,
                    max: 10,
                    title: {
                        display: true,
                        text: 'Inflation (π)',
                        font: { size: 12, weight: 'bold' }
                    },
                    ticks: {
                        display: false
                    }
                }
            }
        },
        plugins: [{
            id: 'pointLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                const y0 = eqY;
                const yStar = sulangY;
                const pi0 = eqPi;

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
                            ctx.fillText('0', x, y);
                            ctx.restore();
                        });
                    }
                });

                // Add Y₀, Y* and π₀ labels
                const xScale = chart.scales.x;
                const yScale = chart.scales.y;

                ctx.save();
                ctx.fillStyle = '#1f2937';
                ctx.font = 'bold 11px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';

                // Y₀ label on x-axis
                const y0X = xScale.getPixelForValue(y0);
                ctx.fillText('Y₀', y0X, yScale.bottom + 5);

                // Y* label on x-axis
                const yStarX = xScale.getPixelForValue(yStar);
                ctx.fillText('Y*', yStarX, yScale.bottom + 5);

                // π₀ label on y-axis
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                const pi0Y = yScale.getPixelForValue(pi0);
                ctx.fillText('π₀', xScale.left - 5, pi0Y);

                ctx.restore();
            }
        }, {
            id: 'curveLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                ctx.save();
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 14px Inter';
                ctx.fillText('SE', chart.scales.x.getPixelForValue(2800), chart.scales.y.getPixelForValue(2.4));

                ctx.fillStyle = '#3b82f6';
                // Helper function to draw text with subscript
                const drawTextWithSubscript = (text, subscript, x, y, color, fontSize = 14) => {
                    ctx.fillStyle = color;
                    ctx.font = `bold ${fontSize}px Inter`;
                    ctx.fillText(text, x, y);
                    const textWidth = ctx.measureText(text).width;
                    ctx.font = `bold ${fontSize * 0.7}px Inter`;
                    ctx.fillText(subscript, x + textWidth, y + fontSize * 0.3);
                };

                drawTextWithSubscript('SU', 'KORT', chart.scales.x.getPixelForValue(2800), chart.scales.y.getPixelForValue(7.6), '#3b82f6');
                drawTextWithSubscript('SU', 'LANG', chart.scales.x.getPixelForValue(sulangY + 50), chart.scales.y.getPixelForValue(9), '#6b7280');
                ctx.restore();
            }
        }]
    });
}

// Create SE-SU Model Chart with No Output Gap
function createSESUNoOutputGapChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const nationalIncome = [0, 500, 1000, 1500, 2000, 2500, 3000];

    // SE (Aggregate Demand) - downward sloping red line
    const seData = nationalIncome.map(y => 8 - 0.002 * y);

    // SUKORT (Short-run Aggregate Supply) - upward sloping blue line
    const sukortData = nationalIncome.map(y => 2 + 0.002 * y);

    // SULANG (Long-run Aggregate Supply) - vertical grey line at Y = 2000
    const sulangY = 2000;

    // Equilibrium point - aligned with SULANG (no output gap)
    // Solve: 8 - 0.002Y = 2 + 0.002Y => Y = 1500, but we want Y = 2000
    // Adjust SE: π = 10 - 0.002Y, then 10 - 0.002Y = 2 + 0.002Y => Y = 2000, π = 6
    const eqY = 2000;
    const eqPi = 6;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: nationalIncome,
            datasets: [{
                label: 'SE',
                data: nationalIncome.map(y => ({ x: y, y: 10 - 0.002 * y })),
                borderColor: '#ef4444', // Red
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                tension: 0
            }, {
                label: 'SUKORT',
                data: sukortData.map((pi, i) => ({ x: nationalIncome[i], y: pi })),
                borderColor: '#3b82f6', // Blue
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                tension: 0
            }, {
                label: 'SULANG',
                data: [{ x: sulangY, y: 0 }, { x: sulangY, y: 10 }],
                borderColor: '#6b7280', // Grey
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                tension: 0
            }, {
                label: 'Ligevægt 0',
                data: [{ x: eqY, y: eqPi }],
                type: 'scatter',
                backgroundColor: '#fbbf24', // Yellow/Gold
                borderColor: '#fbbf24',
                pointRadius: 10,
                pointHoverRadius: 12,
                showLine: false
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'SE/SU model kort og lang sigt (intet outputgab)',
                    font: { size: 16, weight: 'bold', family: 'Inter, sans-serif' }
                },
                tooltip: {
                    ...chartConfig.plugins.tooltip,
                    callbacks: {
                        label: function (context) {
                            if (context.dataset.label.includes('Ligevægt')) {
                                return context.dataset.label;
                            }
                            return context.dataset.label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: 0,
                    max: 3000,
                    title: {
                        display: true,
                        text: 'Nationalindkomst (Y)',
                        font: { size: 12, weight: 'bold' }
                    },
                    ticks: {
                        display: false
                    }
                },
                y: {
                    min: 0,
                    max: 10,
                    title: {
                        display: true,
                        text: 'Inflation (π)',
                        font: { size: 12, weight: 'bold' }
                    },
                    ticks: {
                        display: false
                    }
                }
            }
        },
        plugins: [{
            id: 'htmlLegend',
            afterUpdate(chart, args, options) {
                const legendContainer = chart.canvas.parentElement.querySelector('.chart-legend');
                if (!legendContainer) return;

                legendContainer.innerHTML = '';
                const ul = document.createElement('ul');
                ul.style.cssText = 'list-style: none; display: flex; flex-wrap: wrap; justify-content: center; padding: 0; margin: 10px 0;';

                chart.data.datasets.forEach((dataset, i) => {
                    if (dataset.label && !dataset.label.includes('Ligevægt')) {
                        const li = document.createElement('li');
                        li.style.cssText = 'display: flex; align-items: center; margin: 5px 15px;';

                        const colorBox = document.createElement('span');
                        colorBox.style.cssText = `width: 20px; height: 3px; background-color: ${dataset.borderColor || '#000'}; margin-right: 8px; border: none;`;

                        const labelText = document.createElement('span');
                        labelText.style.cssText = 'font-family: Inter, sans-serif; font-size: 12px;';

                        let labelHtml = dataset.label;
                        if (labelHtml === 'SUKORT') {
                            labelHtml = 'SU<sub>KORT</sub>';
                        } else if (labelHtml === 'SULANG') {
                            labelHtml = 'SU<sub>LANG</sub>';
                        }
                        labelText.innerHTML = labelHtml;

                        li.appendChild(colorBox);
                        li.appendChild(labelText);
                        ul.appendChild(li);
                    }
                });

                // Add Ligevægt points
                chart.data.datasets.forEach((dataset, i) => {
                    if (dataset.label && dataset.label.includes('Ligevægt')) {
                        const li = document.createElement('li');
                        li.style.cssText = 'display: flex; align-items: center; margin: 5px 15px;';

                        const colorBox = document.createElement('span');
                        colorBox.style.cssText = `width: 20px; height: 20px; background-color: ${dataset.backgroundColor || '#fbbf24'}; margin-right: 8px; border: 2px solid ${dataset.borderColor || '#fbbf24'}; border-radius: 50%;`;

                        const labelText = document.createElement('span');
                        labelText.style.cssText = 'font-family: Inter, sans-serif; font-size: 12px;';
                        labelText.textContent = dataset.label;

                        li.appendChild(colorBox);
                        li.appendChild(labelText);
                        ul.appendChild(li);
                    }
                });

                legendContainer.appendChild(ul);
            }
        }, {
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
                            ctx.fillText('0', x, y);
                            ctx.restore();
                        });
                    }
                });
            }
        }, {
            id: 'curveLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                ctx.save();
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 14px Inter';
                ctx.fillText('SE', chart.scales.x.getPixelForValue(2800), chart.scales.y.getPixelForValue(4.4));

                ctx.fillStyle = '#3b82f6';
                // Helper function to draw text with subscript
                const drawTextWithSubscript = (text, subscript, x, y, color, fontSize = 14) => {
                    ctx.fillStyle = color;
                    ctx.font = `bold ${fontSize}px Inter`;
                    ctx.fillText(text, x, y);
                    const textWidth = ctx.measureText(text).width;
                    ctx.font = `bold ${fontSize * 0.7}px Inter`;
                    ctx.fillText(subscript, x + textWidth, y + fontSize * 0.3);
                };

                drawTextWithSubscript('SU', 'KORT', chart.scales.x.getPixelForValue(2800), chart.scales.y.getPixelForValue(7.6), '#3b82f6');
                drawTextWithSubscript('SU', 'LANG', chart.scales.x.getPixelForValue(sulangY + 50), chart.scales.y.getPixelForValue(9), '#6b7280');
                ctx.restore();
            }
        }]
    });
}

// Create SE-SU Model Chart - Short Run When SE Increases (Expansionary Monetary Policy)
function createSESUSEIncreaseChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const nationalIncome = [0, 500, 1000, 1500, 2000, 2500, 3000];

    // Initial SE (Aggregate Demand) - downward sloping red line
    const seInitialData = nationalIncome.map(y => ({ x: y, y: 8 - 0.002 * y }));

    // New SE (Aggregate Demand shifted right) - downward sloping dashed red line
    const seNewData = nationalIncome.map(y => ({ x: y, y: 10 - 0.002 * y }));

    // SUKORT (Short-run Aggregate Supply) - upward sloping blue line
    const sukortData = nationalIncome.map(y => ({ x: y, y: 2 + 0.002 * y }));

    // Initial equilibrium (intersection of SE and SUKORT)
    // Solve: 8 - 0.002Y = 2 + 0.002Y => Y = 1500, π = 5
    const eq0Y = 1500;
    const eq0Pi = 5;

    // New equilibrium (intersection of SEny and SUKORT)
    // Solve: 10 - 0.002Y = 2 + 0.002Y => Y = 2000, π = 6
    const eq1Y = 2000;
    const eq1Pi = 6;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: nationalIncome,
            datasets: [{
                label: 'SE',
                data: seInitialData,
                borderColor: '#ef4444', // Red
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                tension: 0
            }, {
                label: 'SENy',
                data: seNewData,
                borderColor: '#ef4444', // Red
                backgroundColor: 'transparent',
                borderWidth: 3,
                borderDash: [5, 5],
                pointRadius: 0,
                tension: 0
            }, {
                label: 'SUKORT',
                data: sukortData,
                borderColor: '#3b82f6', // Blue
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                tension: 0
            }, {
                label: 'Ligevægt 0',
                data: [{ x: eq0Y, y: eq0Pi }],
                type: 'scatter',
                backgroundColor: '#fbbf24', // Yellow/Gold
                borderColor: '#fbbf24',
                pointRadius: 10,
                pointHoverRadius: 12,
                showLine: false
            }, {
                label: 'Ligevægt 1',
                data: [{ x: eq1Y, y: eq1Pi }],
                type: 'scatter',
                backgroundColor: '#3b82f6', // Blue
                borderColor: '#3b82f6',
                pointRadius: 10,
                pointHoverRadius: 12,
                showLine: false
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'SE/SU model kort sigt når SE stiger',
                    font: { size: 16, weight: 'bold', family: 'Inter, sans-serif' }
                },
                legend: {
                    ...chartConfig.plugins.legend,
                    display: false // Disable default legend - we'll use custom HTML legend
                },
                tooltip: {
                    ...chartConfig.plugins.tooltip,
                    callbacks: {
                        label: function (context) {
                            if (context.dataset.label.includes('Ligevægt')) {
                                return context.dataset.label;
                            }
                            let label = context.dataset.label;
                            if (label === 'SENy') label = 'SE\u2099\u1d67';
                            if (label === 'SUKORT') label = 'SU\u2096\u2092\u1d63\u209c';
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: 0,
                    max: 3000,
                    title: {
                        display: true,
                        text: 'Nationalindkomst (Y)',
                        font: { size: 12, weight: 'bold' }
                    },
                    ticks: {
                        display: false
                    }
                },
                y: {
                    min: 0,
                    max: 10,
                    title: {
                        display: true,
                        text: 'Inflation (π)',
                        font: { size: 12, weight: 'bold' }
                    },
                    ticks: {
                        display: false
                    }
                }
            }
        },
        plugins: [{
            id: 'pointLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                const y0 = eq0Y;
                const y1 = eq1Y;
                const pi0 = eq0Pi;
                const pi1 = eq1Pi;

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
                            const num = dataset.label.includes('0') ? '0' : '1';
                            ctx.fillText(num, x, y);
                            ctx.restore();
                        });
                    }
                });

                // Add Y₀, Y₁, π₀ and π₁ labels
                const xScale = chart.scales.x;
                const yScale = chart.scales.y;

                ctx.save();
                ctx.fillStyle = '#1f2937';
                ctx.font = 'bold 11px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';

                // Y₀ and Y₁ labels on x-axis
                const y0X = xScale.getPixelForValue(y0);
                ctx.fillText('Y₀', y0X, yScale.bottom + 5);

                const y1X = xScale.getPixelForValue(y1);
                ctx.fillText('Y₁', y1X, yScale.bottom + 5);

                // π₀ and π₁ labels on y-axis
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                const pi0Y = yScale.getPixelForValue(pi0);
                ctx.fillText('π₀', xScale.left - 5, pi0Y);

                const pi1Y = yScale.getPixelForValue(pi1);
                ctx.fillText('π₁', xScale.left - 5, pi1Y);

                ctx.restore();
            }
        }, {
            id: 'curveLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                ctx.save();
                // Helper function to draw text with subscript
                const drawTextWithSubscript = (text, subscript, x, y, color, fontSize = 14) => {
                    ctx.fillStyle = color;
                    ctx.font = `bold ${fontSize}px Inter`;
                    ctx.fillText(text, x, y);
                    const textWidth = ctx.measureText(text).width;
                    ctx.font = `bold ${fontSize * 0.7}px Inter`;
                    ctx.fillText(subscript, x + textWidth, y + fontSize * 0.3);
                };

                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 14px Inter';
                ctx.fillText('SE', chart.scales.x.getPixelForValue(2800), chart.scales.y.getPixelForValue(2.4));
                drawTextWithSubscript('SE', 'Ny', chart.scales.x.getPixelForValue(2800), chart.scales.y.getPixelForValue(4.4), '#ef4444');

                ctx.fillStyle = '#3b82f6';
                drawTextWithSubscript('SU', 'KORT', chart.scales.x.getPixelForValue(2800), chart.scales.y.getPixelForValue(7.6), '#3b82f6');
                ctx.restore();
            }
        }]
    });
}

// Create SE-SU Model Chart - Expansionary Fiscal Policy Effect
function createSESUExpansiveFPChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const nationalIncome = [0, 500, 1000, 1500, 2000, 2500, 3000];

    // Initial SE
    const seInitialData = nationalIncome.map(y => ({ x: y, y: 8 - 0.002 * y }));

    // New SE (shifted right due to expansionary FP)
    const seNewData = nationalIncome.map(y => ({ x: y, y: 10 - 0.002 * y }));

    // SUKORT
    const sukortData = nationalIncome.map(y => ({ x: y, y: 2 + 0.002 * y }));

    const eq0Y = 1500;
    const eq0Pi = 5;
    const eq1Y = 2000;
    const eq1Pi = 6;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: nationalIncome,
            datasets: [{
                label: 'SE',
                data: seInitialData,
                borderColor: '#ef4444',
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                tension: 0
            }, {
                label: 'SENy (Ekspansiv FP)',
                data: seNewData,
                borderColor: '#ef4444',
                backgroundColor: 'transparent',
                borderWidth: 3,
                borderDash: [5, 5],
                pointRadius: 0,
                tension: 0
            }, {
                label: 'SUKORT',
                data: sukortData,
                borderColor: '#3b82f6',
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                tension: 0
            }, {
                label: 'Ligevægt 0',
                data: [{ x: eq0Y, y: eq0Pi }],
                type: 'scatter',
                backgroundColor: '#fbbf24',
                borderColor: '#fbbf24',
                pointRadius: 10,
                pointHoverRadius: 12,
                showLine: false
            }, {
                label: 'Ligevægt 1',
                data: [{ x: eq1Y, y: eq1Pi }],
                type: 'scatter',
                backgroundColor: '#3b82f6', // Blue
                borderColor: '#3b82f6',
                pointRadius: 10,
                pointHoverRadius: 12,
                showLine: false
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'SE/SU model – Ekspansiv finanspolitik',
                    font: { size: 16, weight: 'bold', family: 'Inter, sans-serif' }
                },
                legend: {
                    ...chartConfig.plugins.legend,
                    display: false // Disable default legend - we'll use custom HTML legend
                },
                tooltip: {
                    ...chartConfig.plugins.tooltip,
                    callbacks: {
                        label: function (context) {
                            if (context.dataset.label.includes('Ligevægt')) {
                                return context.dataset.label;
                            }
                            let label = context.dataset.label;
                            if (label && label.includes('SENy')) label = label.replace('SENy', 'SE\u2099\u1d67');
                            if (label === 'SUKORT') label = 'SU\u2096\u2092\u1d63\u209c';
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: 0,
                    max: 3000,
                    title: {
                        display: true,
                        text: 'Nationalindkomst (Y)',
                        font: { size: 12, weight: 'bold' }
                    },
                    ticks: {
                        display: false
                    }
                },
                y: {
                    min: 0,
                    max: 10,
                    title: {
                        display: true,
                        text: 'Inflation (π)',
                        font: { size: 12, weight: 'bold' }
                    },
                    ticks: {
                        display: false
                    }
                }
            }
        },
        plugins: [{
            id: 'htmlLegend',
            afterUpdate(chart, args, options) {
                const legendContainer = chart.canvas.parentElement.querySelector('.chart-legend');
                if (!legendContainer) return;

                legendContainer.innerHTML = '';
                const ul = document.createElement('ul');
                ul.style.cssText = 'list-style: none; display: flex; flex-wrap: wrap; justify-content: center; padding: 0; margin: 10px 0;';

                chart.data.datasets.forEach((dataset, i) => {
                    if (dataset.label && !dataset.label.includes('Ligevægt')) {
                        const li = document.createElement('li');
                        li.style.cssText = 'display: flex; align-items: center; margin: 5px 15px;';

                        const colorBox = document.createElement('span');
                        const isDashed = dataset.borderDash && dataset.borderDash.length > 0;
                        colorBox.style.cssText = `width: 20px; height: 3px; background-color: ${dataset.borderColor || '#000'}; margin-right: 8px; border: none; ${isDashed ? 'background-image: repeating-linear-gradient(to right, ' + (dataset.borderColor || '#000') + ' 0px, ' + (dataset.borderColor || '#000') + ' 4px, transparent 4px, transparent 8px);' : ''}`;

                        const labelText = document.createElement('span');
                        labelText.style.cssText = 'font-family: Inter, sans-serif; font-size: 12px;';

                        let labelHtml = dataset.label;
                        if (labelHtml === 'SENy') {
                            labelHtml = 'SE<sub>Ny</sub>';
                        } else if (labelHtml && labelHtml.includes('SENy')) {
                            labelHtml = labelHtml.replace('SENy', 'SE<sub>Ny</sub>');
                        } else if (labelHtml === 'SUKORT') {
                            labelHtml = 'SU<sub>KORT</sub>';
                        }
                        labelText.innerHTML = labelHtml;

                        li.appendChild(colorBox);
                        li.appendChild(labelText);
                        ul.appendChild(li);
                    }
                });

                // Add Ligevægt points
                chart.data.datasets.forEach((dataset, i) => {
                    if (dataset.label && dataset.label.includes('Ligevægt')) {
                        const li = document.createElement('li');
                        li.style.cssText = 'display: flex; align-items: center; margin: 5px 15px;';

                        const colorBox = document.createElement('span');
                        colorBox.style.cssText = `width: 20px; height: 20px; background-color: ${dataset.backgroundColor || '#fbbf24'}; margin-right: 8px; border: 2px solid ${dataset.borderColor || '#fbbf24'}; border-radius: 50%;`;

                        const labelText = document.createElement('span');
                        labelText.style.cssText = 'font-family: Inter, sans-serif; font-size: 12px;';
                        labelText.textContent = dataset.label;

                        li.appendChild(colorBox);
                        li.appendChild(labelText);
                        ul.appendChild(li);
                    }
                });

                legendContainer.appendChild(ul);
            }
        }, {
            id: 'pointLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                const y0 = eq0Y;
                const y1 = eq1Y;
                const pi0 = eq0Pi;
                const pi1 = eq1Pi;

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
                            const num = dataset.label.includes('0') ? '0' : '1';
                            ctx.fillText(num, x, y);
                            ctx.restore();
                        });
                    }
                });

                // Add Y₀, Y₁, π₀ and π₁ labels
                const xScale = chart.scales.x;
                const yScale = chart.scales.y;

                ctx.save();
                ctx.fillStyle = '#1f2937';
                ctx.font = 'bold 11px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';

                // Y₀ and Y₁ labels on x-axis
                const y0X = xScale.getPixelForValue(y0);
                ctx.fillText('Y₀', y0X, yScale.bottom + 5);

                const y1X = xScale.getPixelForValue(y1);
                ctx.fillText('Y₁', y1X, yScale.bottom + 5);

                // π₀ and π₁ labels on y-axis
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                const pi0Y = yScale.getPixelForValue(pi0);
                ctx.fillText('π₀', xScale.left - 5, pi0Y);

                const pi1Y = yScale.getPixelForValue(pi1);
                ctx.fillText('π₁', xScale.left - 5, pi1Y);

                ctx.restore();
            }
        }, {
            id: 'curveLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                ctx.save();
                // Helper function to draw text with subscript
                const drawTextWithSubscript = (text, subscript, x, y, color, fontSize = 14) => {
                    ctx.fillStyle = color;
                    ctx.font = `bold ${fontSize}px Inter`;
                    ctx.fillText(text, x, y);
                    const textWidth = ctx.measureText(text).width;
                    ctx.font = `bold ${fontSize * 0.7}px Inter`;
                    ctx.fillText(subscript, x + textWidth, y + fontSize * 0.3);
                };

                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 14px Inter';
                ctx.fillText('SE', chart.scales.x.getPixelForValue(2800), chart.scales.y.getPixelForValue(2.4));
                drawTextWithSubscript('SE', 'Ny', chart.scales.x.getPixelForValue(2800), chart.scales.y.getPixelForValue(4.4), '#ef4444');

                ctx.fillStyle = '#3b82f6';
                drawTextWithSubscript('SU', 'KORT', chart.scales.x.getPixelForValue(2800), chart.scales.y.getPixelForValue(7.6), '#3b82f6');
                ctx.restore();
            }
        }]
    });
}

// Create SE-SU Model Chart - Strukturpolitik: No Output Gap (with policy lists)
function createSESUStrukturpolitikNoGapChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const nationalIncome = [0, 500, 1000, 1500, 2000, 2500, 3000];

    // SE (Aggregate Demand) - downward sloping red line
    const seData = nationalIncome.map(y => 10 - 0.002 * y);

    // SUKORT (Short-run Aggregate Supply) - upward sloping blue line
    const sukortData = nationalIncome.map(y => 2 + 0.002 * y);

    // SULANG (Long-run Aggregate Supply) - vertical grey line at Y = 2000
    const sulangY = 2000;

    // Equilibrium point - aligned with SULANG (no output gap)
    const eqY = 2000;
    const eqPi = 6;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: nationalIncome,
            datasets: [{
                label: 'SE',
                data: nationalIncome.map(y => ({ x: y, y: 10 - 0.002 * y })),
                borderColor: '#ef4444', // Red
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                tension: 0
            }, {
                label: 'SUKORT',
                data: sukortData.map((pi, i) => ({ x: nationalIncome[i], y: pi })),
                borderColor: '#3b82f6', // Blue
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                tension: 0
            }, {
                label: 'SULANG',
                data: [{ x: sulangY, y: 0 }, { x: sulangY, y: 10 }],
                borderColor: '#6b7280', // Grey
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                tension: 0
            }, {
                label: 'Ligevægt 0',
                data: [{ x: eqY, y: eqPi }],
                type: 'scatter',
                backgroundColor: '#fbbf24', // Yellow/Gold
                borderColor: '#fbbf24',
                pointRadius: 10,
                pointHoverRadius: 12,
                showLine: false
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'SE/SU model kort og lang sigt (intet outputgab)',
                    font: { size: 16, weight: 'bold', family: 'Inter, sans-serif' }
                },
                tooltip: {
                    ...chartConfig.plugins.tooltip,
                    callbacks: {
                        label: function (context) {
                            if (context.dataset.label.includes('Ligevægt')) {
                                return context.dataset.label;
                            }
                            return context.dataset.label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: 0,
                    max: 3000,
                    title: {
                        display: true,
                        text: 'Nationalindkomst (Y)',
                        font: { size: 12, weight: 'bold' }
                    },
                    ticks: {
                        callback: function (value) {
                            if (value === eqY) return 'Y₀';
                            return '';
                        },
                        font: { size: 11 }
                    }
                },
                y: {
                    min: 0,
                    max: 10,
                    title: {
                        display: true,
                        text: 'Inflation (π)',
                        font: { size: 12, weight: 'bold' }
                    },
                    ticks: {
                        callback: function (value) {
                            if (value === eqPi) return 'π₀';
                            return '';
                        },
                        font: { size: 11 }
                    }
                }
            }
        },
        plugins: [{
            id: 'htmlLegend',
            afterUpdate(chart, args, options) {
                const legendContainer = chart.canvas.parentElement.querySelector('.chart-legend');
                if (!legendContainer) return;

                legendContainer.innerHTML = '';
                const ul = document.createElement('ul');
                ul.style.cssText = 'list-style: none; display: flex; flex-wrap: wrap; justify-content: center; padding: 0; margin: 10px 0;';

                chart.data.datasets.forEach((dataset, i) => {
                    if (dataset.label && !dataset.label.includes('Ligevægt')) {
                        const li = document.createElement('li');
                        li.style.cssText = 'display: flex; align-items: center; margin: 5px 15px;';

                        const colorBox = document.createElement('span');
                        colorBox.style.cssText = `width: 20px; height: 3px; background-color: ${dataset.borderColor || '#000'}; margin-right: 8px; border: none;`;

                        const labelText = document.createElement('span');
                        labelText.style.cssText = 'font-family: Inter, sans-serif; font-size: 12px;';

                        let labelHtml = dataset.label;
                        if (labelHtml === 'SUKORT') {
                            labelHtml = 'SU<sub>KORT</sub>';
                        } else if (labelHtml === 'SULANG') {
                            labelHtml = 'SU<sub>LANG</sub>';
                        }
                        labelText.innerHTML = labelHtml;

                        li.appendChild(colorBox);
                        li.appendChild(labelText);
                        ul.appendChild(li);
                    }
                });

                chart.data.datasets.forEach((dataset, i) => {
                    if (dataset.label && dataset.label.includes('Ligevægt')) {
                        const li = document.createElement('li');
                        li.style.cssText = 'display: flex; align-items: center; margin: 5px 15px;';

                        const colorBox = document.createElement('span');
                        colorBox.style.cssText = `width: 20px; height: 20px; background-color: ${dataset.backgroundColor || '#fbbf24'}; margin-right: 8px; border: 2px solid ${dataset.borderColor || '#fbbf24'}; border-radius: 50%;`;

                        const labelText = document.createElement('span');
                        labelText.style.cssText = 'font-family: Inter, sans-serif; font-size: 12px;';
                        labelText.textContent = dataset.label;

                        li.appendChild(colorBox);
                        li.appendChild(labelText);
                        ul.appendChild(li);
                    }
                });

                legendContainer.appendChild(ul);
            }
        }, {
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
                            ctx.fillText('0', x, y);
                            ctx.restore();
                        });
                    }
                });
            }
        }, {
            id: 'curveLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                ctx.save();
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 14px Inter';
                ctx.fillText('SE', chart.scales.x.getPixelForValue(2800), chart.scales.y.getPixelForValue(4.4));

                ctx.fillStyle = '#3b82f6';
                const drawTextWithSubscript = (text, subscript, x, y, color, fontSize = 14) => {
                    ctx.fillStyle = color;
                    ctx.font = `bold ${fontSize}px Inter`;
                    ctx.fillText(text, x, y);
                    const textWidth = ctx.measureText(text).width;
                    ctx.font = `bold ${fontSize * 0.7}px Inter`;
                    ctx.fillText(subscript, x + textWidth, y + fontSize * 0.3);
                };

                drawTextWithSubscript('SU', 'KORT', chart.scales.x.getPixelForValue(2800), chart.scales.y.getPixelForValue(7.6), '#3b82f6');
                drawTextWithSubscript('SU', 'LANG', chart.scales.x.getPixelForValue(sulangY + 50), chart.scales.y.getPixelForValue(9), '#6b7280');
                ctx.restore();
            }
        }]
    });
}

// Create SE-SU Model Chart - Strukturpolitik: When SULang Increases
function createSESUStrukturpolitikSULangShiftChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const nationalIncome = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500];

    // SE (Aggregate Demand) - downward sloping red line (unchanged)
    const seData = nationalIncome.map(y => 10 - 0.002 * y);

    // Initial SULANG (Long-run Aggregate Supply) - vertical grey line at Y = 2000
    const sulangInitialY = 2000;

    // New SULANG (shifted right due to growth policy) - vertical grey dashed line at Y = 2500
    const sulangNewY = 2500;

    // New equilibrium (intersection of SE and new SULANG)
    // SE: π = 10 - 0.002 * Y, at Y = 2500: π = 10 - 0.002 * 2500 = 5
    const eq1Y = 2500;
    const eq1Pi = 5;

    // Initial equilibrium (intersection of SE and initial SUKORT at SULANG)
    const eq0Y = 2000;
    // SE: π = 10 - 0.002 * 2000 = 6
    const eq0Pi = 6;

    // Initial SUKORT (Short-run Aggregate Supply) - upward sloping blue line
    // Must pass through (2000, 6), so: 6 = a + 0.002 * 2000 => a = 6 - 4 = 2
    const sukortInitialData = nationalIncome.map(y => 2 + 0.002 * y);

    // New SUKORT (shifted down/right due to inflation control policy)
    // Must pass through point 1 (2500, 5), so: 5 = a + 0.002 * 2500 => a = 5 - 5 = 0
    const sukortNewData = nationalIncome.map(y => 0.002 * y);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: nationalIncome,
            datasets: [{
                label: 'SE',
                data: nationalIncome.map(y => ({ x: y, y: 10 - 0.002 * y })),
                borderColor: '#ef4444', // Red
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                tension: 0
            }, {
                label: 'SUKORT',
                data: sukortInitialData.map((pi, i) => ({ x: nationalIncome[i], y: pi })),
                borderColor: '#3b82f6', // Blue
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                tension: 0
            }, {
                label: 'SUKORT NY',
                data: sukortNewData.map((pi, i) => ({ x: nationalIncome[i], y: pi })),
                borderColor: '#3b82f6', // Blue
                backgroundColor: 'transparent',
                borderWidth: 3,
                borderDash: [5, 5],
                pointRadius: 0,
                tension: 0
            }, {
                label: 'SULANG',
                data: [{ x: sulangInitialY, y: 0 }, { x: sulangInitialY, y: 10 }],
                borderColor: '#6b7280', // Grey
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                tension: 0
            }, {
                label: 'SULANG NY',
                data: [{ x: sulangNewY, y: 0 }, { x: sulangNewY, y: 10 }],
                borderColor: '#6b7280', // Grey
                backgroundColor: 'transparent',
                borderWidth: 3,
                borderDash: [5, 5],
                pointRadius: 0,
                tension: 0
            }, {
                label: 'Ligevægt 0',
                data: [{ x: eq0Y, y: eq0Pi }],
                type: 'scatter',
                backgroundColor: '#fbbf24', // Yellow/Gold
                borderColor: '#fbbf24',
                pointRadius: 10,
                pointHoverRadius: 12,
                showLine: false
            }, {
                label: 'Ligevægt 1',
                data: [{ x: eq1Y, y: eq1Pi }],
                type: 'scatter',
                backgroundColor: '#3b82f6', // Blue
                borderColor: '#3b82f6',
                pointRadius: 10,
                pointHoverRadius: 12,
                showLine: false
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'SE/SU model – når SU\u2097\u2090\u2099\u1d4d stiger',
                    font: { size: 16, weight: 'bold', family: 'Inter, sans-serif' }
                },
                tooltip: {
                    ...chartConfig.plugins.tooltip,
                    callbacks: {
                        label: function (context) {
                            if (context.dataset.label.includes('Ligevægt')) {
                                return context.dataset.label;
                            }
                            return context.dataset.label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: 0,
                    max: 3500,
                    title: {
                        display: true,
                        text: 'Nationalindkomst (Y)',
                        font: { size: 12, weight: 'bold' }
                    },
                    ticks: {
                        callback: function (value) {
                            if (value === eq0Y) return 'Y₀';
                            if (value === eq1Y) return 'Y₁';
                            return '';
                        },
                        font: { size: 12, weight: 'bold' },
                        color: '#000000'
                    }
                },
                y: {
                    min: 0,
                    max: 10,
                    title: {
                        display: true,
                        text: 'Inflation (π)',
                        font: { size: 12, weight: 'bold' }
                    },
                    ticks: {
                        callback: function (value) {
                            if (value === eq0Pi) return 'π₀';
                            if (value === eq1Pi) return 'π₁';
                            return '';
                        },
                        font: { size: 12, weight: 'bold' },
                        color: '#000000'
                    }
                }
            }
        },
        plugins: [{
            id: 'htmlLegend',
            afterUpdate(chart, args, options) {
                const legendContainer = chart.canvas.parentElement.querySelector('.chart-legend');
                if (!legendContainer) return;

                legendContainer.innerHTML = '';
                const ul = document.createElement('ul');
                ul.style.cssText = 'list-style: none; display: flex; flex-wrap: wrap; justify-content: center; padding: 0; margin: 10px 0;';

                chart.data.datasets.forEach((dataset, i) => {
                    if (dataset.label && !dataset.label.includes('Ligevægt')) {
                        const li = document.createElement('li');
                        li.style.cssText = 'display: flex; align-items: center; margin: 5px 15px;';

                        const colorBox = document.createElement('span');
                        const isDashed = dataset.borderDash && dataset.borderDash.length > 0;
                        colorBox.style.cssText = `width: 20px; height: 3px; background-color: ${dataset.borderColor || '#000'}; margin-right: 8px; border: none; ${isDashed ? 'background-image: repeating-linear-gradient(to right, transparent, transparent 3px, ' + dataset.borderColor + ' 3px, ' + dataset.borderColor + ' 6px);' : ''}`;

                        const labelText = document.createElement('span');
                        labelText.style.cssText = 'font-family: Inter, sans-serif; font-size: 12px;';

                        let labelHtml = dataset.label;
                        if (labelHtml === 'SUKORT') {
                            labelHtml = 'SU<sub>KORT</sub>';
                        } else if (labelHtml === 'SUKORT NY') {
                            labelHtml = 'SU<sub>KORT NY</sub>';
                        } else if (labelHtml === 'SULANG') {
                            labelHtml = 'SU<sub>LANG</sub>';
                        } else if (labelHtml === 'SULANG NY') {
                            labelHtml = 'SU<sub>LANG NY</sub>';
                        }
                        labelText.innerHTML = labelHtml;

                        li.appendChild(colorBox);
                        li.appendChild(labelText);
                        ul.appendChild(li);
                    }
                });

                chart.data.datasets.forEach((dataset, i) => {
                    if (dataset.label && dataset.label.includes('Ligevægt')) {
                        const li = document.createElement('li');
                        li.style.cssText = 'display: flex; align-items: center; margin: 5px 15px;';

                        const colorBox = document.createElement('span');
                        colorBox.style.cssText = `width: 20px; height: 20px; background-color: ${dataset.backgroundColor || '#fbbf24'}; margin-right: 8px; border: 2px solid ${dataset.borderColor || '#fbbf24'}; border-radius: 50%;`;

                        const labelText = document.createElement('span');
                        labelText.style.cssText = 'font-family: Inter, sans-serif; font-size: 12px;';
                        labelText.textContent = dataset.label;

                        li.appendChild(colorBox);
                        li.appendChild(labelText);
                        ul.appendChild(li);
                    }
                });

                legendContainer.appendChild(ul);
            }
        }, {
            id: 'pointLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                chart.data.datasets.forEach((dataset, i) => {
                    if (dataset.label.includes('Ligevægt')) {
                        const meta = chart.getDatasetMeta(i);
                        meta.data.forEach((element) => {
                            const { x, y } = element.getProps(['x', 'y'], true);
                            ctx.save();
                            // Draw white background circle for better visibility
                            ctx.fillStyle = 'white';
                            ctx.beginPath();
                            ctx.arc(x, y, 8, 0, 2 * Math.PI);
                            ctx.fill();
                            // Draw the number
                            ctx.fillStyle = '#000000';
                            ctx.font = 'bold 14px Inter';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            const pointNumber = dataset.label.includes('0') ? '0' : '1';
                            ctx.fillText(pointNumber, x, y);
                            ctx.restore();
                        });
                    }
                });
            }
        }, {
            id: 'curveLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                ctx.save();

                // Helper function to draw text with subscript
                const drawTextWithSubscript = (text, subscript, x, y, color, fontSize = 14) => {
                    ctx.fillStyle = color;
                    ctx.font = `bold ${fontSize}px Inter`;
                    ctx.fillText(text, x, y);
                    const textWidth = ctx.measureText(text).width;
                    ctx.font = `bold ${fontSize * 0.7}px Inter`;
                    ctx.fillText(subscript, x + textWidth, y + fontSize * 0.3);
                };

                // SE label - red, positioned on the curve, far right to avoid other labels
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 15px Inter';
                ctx.fillText('SE', chart.scales.x.getPixelForValue(3300), chart.scales.y.getPixelForValue(3.6));

                // SUKORT label - blue, positioned on the initial curve, far right
                drawTextWithSubscript('SU', 'KORT', chart.scales.x.getPixelForValue(3300), chart.scales.y.getPixelForValue(7.4), '#3b82f6', 15);

                // SUKORT NY label - blue dashed, positioned on the new curve near point 1, far right
                ctx.fillStyle = '#3b82f6';
                ctx.font = 'bold 13px Inter';
                ctx.fillText('SU', chart.scales.x.getPixelForValue(3300), chart.scales.y.getPixelForValue(5.5));
                const textWidth = ctx.measureText('SU').width;
                ctx.font = 'bold 9px Inter';
                ctx.fillText('KORT', chart.scales.x.getPixelForValue(3300) + textWidth, chart.scales.y.getPixelForValue(5.5) + 4);
                const kortWidth = ctx.measureText('KORT').width;
                ctx.fillText(' NY', chart.scales.x.getPixelForValue(3300) + textWidth + kortWidth, chart.scales.y.getPixelForValue(5.5) + 4);

                // SULANG label - grey, positioned near x-axis (bottom) to avoid overlap
                drawTextWithSubscript('SU', 'LANG', chart.scales.x.getPixelForValue(sulangInitialY + 50), chart.scales.y.getPixelForValue(0.8), '#6b7280', 15);

                // SULANG NY label - grey dashed, positioned near x-axis (bottom) to avoid overlap
                ctx.fillStyle = '#6b7280';
                ctx.font = 'bold 13px Inter';
                ctx.fillText('SU', chart.scales.x.getPixelForValue(sulangNewY + 50), chart.scales.y.getPixelForValue(0.8));
                const textWidth2 = ctx.measureText('SU').width;
                ctx.font = 'bold 9px Inter';
                ctx.fillText('LANG', chart.scales.x.getPixelForValue(sulangNewY + 50) + textWidth2, chart.scales.y.getPixelForValue(0.8) + 4);
                const langWidth = ctx.measureText('LANG').width;
                ctx.fillText(' NY', chart.scales.x.getPixelForValue(sulangNewY + 50) + textWidth2 + langWidth, chart.scales.y.getPixelForValue(0.8) + 4);

                ctx.restore();
            }
        }, {
            id: 'arrows',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                ctx.save();

                // Arrow for SULANG shift (Strukturvækstpolitik)
                const arrowStartX = chart.scales.x.getPixelForValue(sulangInitialY);
                const arrowEndX = chart.scales.x.getPixelForValue(sulangNewY);
                const arrowY = chart.scales.y.getPixelForValue(8.5);

                ctx.strokeStyle = '#3b82f6';
                ctx.fillStyle = '#3b82f6';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(arrowStartX, arrowY);
                ctx.lineTo(arrowEndX - 10, arrowY);
                ctx.stroke();

                // Arrowhead
                ctx.beginPath();
                ctx.moveTo(arrowEndX - 10, arrowY);
                ctx.lineTo(arrowEndX - 20, arrowY - 5);
                ctx.lineTo(arrowEndX - 20, arrowY + 5);
                ctx.closePath();
                ctx.fill();

                // Label for arrow - transparent background, positioned to avoid overlap
                ctx.fillStyle = '#3b82f6';
                ctx.font = 'bold 12px Inter';
                ctx.textAlign = 'center';
                // Position label above the arrow, but lower to avoid SU LANG labels
                ctx.fillText('Strukturvækstpolitik', (arrowStartX + arrowEndX) / 2, arrowY - 20);

                // Arrow for SUKORT shift (Strukturpolitik Inflationskontrol)
                // Position arrow further left to avoid SU KORT labels at x=3200
                const sukortArrowStartX = chart.scales.x.getPixelForValue(2400);
                const sukortArrowEndX = chart.scales.x.getPixelForValue(2600);
                const sukortArrowStartY = chart.scales.y.getPixelForValue(6.5);
                const sukortArrowEndY = chart.scales.y.getPixelForValue(5.8);

                ctx.strokeStyle = '#3b82f6';
                ctx.fillStyle = '#3b82f6';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(sukortArrowStartX, sukortArrowStartY);
                ctx.lineTo(sukortArrowEndX - 15, sukortArrowEndY);
                ctx.stroke();

                // Arrowhead - rotated based on angle
                const angle = Math.atan2(sukortArrowEndY - sukortArrowStartY, sukortArrowEndX - sukortArrowStartX);
                const arrowheadLength = 10;
                const arrowheadWidth = 5;
                ctx.save();
                ctx.translate(sukortArrowEndX - 15, sukortArrowEndY);
                ctx.rotate(angle);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(-arrowheadLength, -arrowheadWidth);
                ctx.lineTo(-arrowheadLength, arrowheadWidth);
                ctx.closePath();
                ctx.fill();
                ctx.restore();

                // Label for arrow - transparent background, positioned to avoid SU KORT labels
                ctx.fillStyle = '#3b82f6';
                ctx.font = 'bold 11px Inter';
                ctx.textAlign = 'center';
                // Position labels further left and lower to avoid overlap with SU KORT labels
                ctx.fillText('Strukturpolitik', (sukortArrowStartX + sukortArrowEndX) / 2, sukortArrowStartY - 8);
                ctx.fillText('Inflationskontrol', (sukortArrowStartX + sukortArrowEndX) / 2, sukortArrowStartY + 5);

                ctx.restore();
            }
        }]
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
                },
                tooltip: {
                    ...chartConfig.plugins.tooltip,
                    callbacks: {
                        label: function (context) {
                            if (context.dataset.label.includes('Ligevægt')) {
                                return context.dataset.label;
                            }
                            return context.dataset.label;
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
                    title: { display: true, text: 'Nationalindkomst (Y)' },
                    ticks: { display: false }
                },
                y: {
                    min: 0,
                    max: 2500,
                    title: { display: true, text: 'Samlet efterspørgsel (SE)' },
                    ticks: { display: false }
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
                                return context.dataset.label;
                            }
                            return context.dataset.label;
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
                    title: { display: true, text: 'Nationalindkomst (Y)' },
                    ticks: { display: false }
                },
                y: {
                    min: 0,
                    max: 2500,
                    title: { display: true, text: 'Samlet efterspørgsel (SE)' },
                    ticks: { display: false }
                }
            }
        },
        plugins: [{
            id: 'pointLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                const y0 = 1600;
                const y1 = 800;

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

                // Add Y₀ and Y₁ labels on x-axis
                const xScale = chart.scales.x;
                const yScale = chart.scales.y;

                ctx.save();
                ctx.fillStyle = '#1f2937';
                ctx.font = 'bold 11px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';

                // Y₀ label
                const y0X = xScale.getPixelForValue(y0);
                ctx.fillText('Y₀', y0X, yScale.bottom + 5);

                // Y₁ label
                const y1X = xScale.getPixelForValue(y1);
                ctx.fillText('Y₁', y1X, yScale.bottom + 5);

                ctx.restore();
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
                                return context.dataset.label;
                            }
                            return context.dataset.label;
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
                title: { display: true, text: 'Offentlig saldo (T-G-R)', font: { size: 16 } },
                tooltip: {
                    ...chartConfig.plugins.tooltip,
                    callbacks: {
                        label: function (context) {
                            if (context.dataset.label.includes('Ligevægt')) {
                                return context.dataset.label;
                            }
                            return context.dataset.label;
                        }
                    }
                }
            },
            scales: {
                x: { type: 'linear', min: 0, max: 2500, title: { display: true, text: 'Nationalindkomst (Y)' }, ticks: { display: false } },
                y: { title: { display: true, text: 'Saldo (Underskud/Overskud)' }, ticks: { display: false } }
            }
        },
        plugins: [{
            id: 'pointLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                const y0 = 1600;
                const y1 = 800;

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

                // Add Y₀ and Y₁ labels on x-axis
                const xScale = chart.scales.x;
                const yScale = chart.scales.y;

                ctx.save();
                ctx.fillStyle = '#1f2937';
                ctx.font = 'bold 11px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';

                // Y₀ label
                const y0X = xScale.getPixelForValue(y0);
                ctx.fillText('Y₀', y0X, yScale.bottom + 5);

                // Y₁ label
                const y1X = xScale.getPixelForValue(y1);
                ctx.fillText('Y₁', y1X, yScale.bottom + 5);

                ctx.restore();
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
                title: { display: true, text: 'Beskæftigelse (L) og nationalindkomst (Y)', font: { size: 16 } },
                tooltip: {
                    ...chartConfig.plugins.tooltip,
                    callbacks: {
                        label: function (context) {
                            if (context.dataset.label.includes('Ligevægt')) {
                                return context.dataset.label;
                            }
                            return context.dataset.label;
                        }
                    }
                }
            },
            scales: {
                x: { type: 'linear', min: 0, max: 2500, title: { display: true, text: 'Nationalindkomst (Y)' }, ticks: { display: false } },
                y: { title: { display: true, text: 'Beskæftigelse (L)' }, ticks: { display: false } }
            }
        },
        plugins: [{
            id: 'pointLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                const y0 = 1600;
                const y1 = 800;

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

                // Add Y₀ and Y₁ labels on x-axis
                const xScale = chart.scales.x;
                const yScale = chart.scales.y;

                ctx.save();
                ctx.fillStyle = '#1f2937';
                ctx.font = 'bold 11px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';

                // Y₀ label
                const y0X = xScale.getPixelForValue(y0);
                ctx.fillText('Y₀', y0X, yScale.bottom + 5);

                // Y₁ label
                const y1X = xScale.getPixelForValue(y1);
                ctx.fillText('Y₁', y1X, yScale.bottom + 5);

                ctx.restore();
            }
        }]
    });
}

// Create Balance of Payments Chart (BB)
function createBalanceOfPaymentsTheoryChart(canvasId) {
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
                title: { display: true, text: 'Betalingsbalance (BB)', font: { size: 16 } },
                tooltip: {
                    ...chartConfig.plugins.tooltip,
                    callbacks: {
                        label: function (context) {
                            if (context.dataset.label.includes('Ligevægt')) {
                                return context.dataset.label;
                            }
                            return context.dataset.label;
                        }
                    }
                }
            },
            scales: {
                x: { type: 'linear', min: 0, max: 2500, title: { display: true, text: 'Nationalindkomst (Y)' }, ticks: { display: false } },
                y: { title: { display: true, text: 'Saldo (Underskud/Overskud)' }, ticks: { display: false } }
            }
        },
        plugins: [{
            id: 'pointLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                const y0 = 1600;
                const y1 = 800;

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

                // Add Y₀ and Y₁ labels on x-axis
                const xScale = chart.scales.x;
                const yScale = chart.scales.y;

                ctx.save();
                ctx.fillStyle = '#1f2937';
                ctx.font = 'bold 11px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';

                // Y₀ label
                const y0X = xScale.getPixelForValue(y0);
                ctx.fillText('Y₀', y0X, yScale.bottom + 5);

                // Y₁ label
                const y1X = xScale.getPixelForValue(y1);
                ctx.fillText('Y₁', y1X, yScale.bottom + 5);

                ctx.restore();
            }
        }]
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
                title: { display: true, text: 'Keynes model - Ekspansiv Finanspolitik', font: { size: 16 } },
                tooltip: {
                    ...chartConfig.plugins.tooltip,
                    callbacks: {
                        label: function (context) {
                            if (context.dataset.label.includes('Ligevægt')) {
                                return context.dataset.label;
                            }
                            return context.dataset.label;
                        }
                    }
                }
            },
            scales: {
                x: { type: 'linear', min: 0, max: 2500, title: { display: true, text: 'Nationalindkomst (Y)' }, ticks: { display: false } },
                y: { min: 0, max: 2500, title: { display: true, text: 'Samlet efterspørgsel (SE)' }, ticks: { display: false } }
            }
        },
        plugins: [{
            id: 'pointLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                const y0 = 1000;
                const y1 = 1500;

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

                // Add Y₀ and Y₁ labels on x-axis
                const xScale = chart.scales.x;
                const yScale = chart.scales.y;

                ctx.save();
                ctx.fillStyle = '#1f2937';
                ctx.font = 'bold 11px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';

                // Y₀ label
                const y0X = xScale.getPixelForValue(y0);
                ctx.fillText('Y₀', y0X, yScale.bottom + 5);

                // Y₁ label
                const y1X = xScale.getPixelForValue(y1);
                ctx.fillText('Y₁', y1X, yScale.bottom + 5);

                ctx.restore();
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
                title: { display: true, text: 'Offentlig saldo (T-G-R) ved ekspansiv politik', font: { size: 16 } },
                tooltip: {
                    ...chartConfig.plugins.tooltip,
                    callbacks: {
                        label: function (context) {
                            if (context.dataset.label.includes('Ligevægt')) {
                                return context.dataset.label;
                            }
                            return context.dataset.label;
                        }
                    }
                }
            },
            scales: {
                x: { type: 'linear', min: 0, max: 2500, title: { display: true, text: 'Nationalindkomst (Y)' }, ticks: { display: false } },
                y: { title: { display: true, text: 'Saldo (Underskud/Overskud)' }, ticks: { display: false } }
            }
        },
        plugins: [{
            id: 'pointLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                const y0 = 800;
                const y1 = 1600;

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

                // Add Y₀ and Y₁ labels on x-axis
                const xScale = chart.scales.x;
                const yScale = chart.scales.y;

                ctx.save();
                ctx.fillStyle = '#1f2937';
                ctx.font = 'bold 11px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';

                // Y₀ label
                const y0X = xScale.getPixelForValue(y0);
                ctx.fillText('Y₀', y0X, yScale.bottom + 5);

                // Y₁ label
                const y1X = xScale.getPixelForValue(y1);
                ctx.fillText('Y₁', y1X, yScale.bottom + 5);

                ctx.restore();
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
                title: { display: true, text: 'Beskæftigelse (L) stiger ved ekspansiv politik', font: { size: 16 } },
                tooltip: {
                    ...chartConfig.plugins.tooltip,
                    callbacks: {
                        label: function (context) {
                            if (context.dataset.label.includes('Ligevægt')) {
                                return context.dataset.label;
                            }
                            return context.dataset.label;
                        }
                    }
                }
            },
            scales: {
                x: { type: 'linear', min: 0, max: 2500, title: { display: true, text: 'Nationalindkomst (Y)' }, ticks: { display: false } },
                y: { title: { display: true, text: 'Beskæftigelse (L)' }, ticks: { display: false } }
            }
        },
        plugins: [{
            id: 'pointLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                const y0 = 800;
                const y1 = 1600;

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

                // Add Y₀ and Y₁ labels on x-axis
                const xScale = chart.scales.x;
                const yScale = chart.scales.y;

                ctx.save();
                ctx.fillStyle = '#1f2937';
                ctx.font = 'bold 11px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';

                // Y₀ label
                const y0X = xScale.getPixelForValue(y0);
                ctx.fillText('Y₀', y0X, yScale.bottom + 5);

                // Y₁ label
                const y1X = xScale.getPixelForValue(y1);
                ctx.fillText('Y₁', y1X, yScale.bottom + 5);

                ctx.restore();
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
                title: { display: true, text: 'Betalingsbalance forværres ved ekspansiv politik', font: { size: 16 } },
                tooltip: {
                    ...chartConfig.plugins.tooltip,
                    callbacks: {
                        label: function (context) {
                            if (context.dataset.label.includes('Ligevægt')) {
                                return context.dataset.label;
                            }
                            return context.dataset.label;
                        }
                    }
                }
            },
            scales: {
                x: { type: 'linear', min: 0, max: 2500, title: { display: true, text: 'Nationalindkomst (Y)' }, ticks: { display: false } },
                y: { title: { display: true, text: 'Saldo (Underskud/Overskud)' }, ticks: { display: false } }
            }
        },
        plugins: [{
            id: 'pointLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                const y0 = 800;
                const y1 = 1600;

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

                // Add Y₀ and Y₁ labels on x-axis
                const xScale = chart.scales.x;
                const yScale = chart.scales.y;

                ctx.save();
                ctx.fillStyle = '#1f2937';
                ctx.font = 'bold 11px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';

                // Y₀ label
                const y0X = xScale.getPixelForValue(y0);
                ctx.fillText('Y₀', y0X, yScale.bottom + 5);

                // Y₁ label
                const y1X = xScale.getPixelForValue(y1);
                ctx.fillText('Y₁', y1X, yScale.bottom + 5);

                ctx.restore();
            }
        }]
    });
}

// Create Multiplier Effect Chart
function createMultiplierChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Showing multiplier effect rounds with stacked bars
    // This makes it clearer how each round adds to the total effect
    const rounds = ['Initial', 'Runde 1', 'Runde 2', 'Runde 3', 'Runde 4', 'Runde 5', 'Total'];

    // Initial government spending (e.g., infrastructure investment)
    const initialG = 100;

    // Incremental effect of each round (additional spending generated)
    const round1 = 75;   // 175 - 100
    const round2 = 56;   // 231 - 175
    const round3 = 42;   // 273 - 231
    const round4 = 32;   // 305 - 273
    const round5 = 24;   // 329 - 305
    const remaining = 71; // 400 - 329 (additional rounds not shown)

    // Stacked data: each bar shows cumulative effect up to that round
    const initialData = [initialG, initialG, initialG, initialG, initialG, initialG, initialG];
    const round1Data = [0, round1, round1, round1, round1, round1, round1];
    const round2Data = [0, 0, round2, round2, round2, round2, round2];
    const round3Data = [0, 0, 0, round3, round3, round3, round3];
    const round4Data = [0, 0, 0, 0, round4, round4, round4];
    const round5Data = [0, 0, 0, 0, 0, round5, round5];
    const remainingData = [0, 0, 0, 0, 0, 0, remaining];

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: rounds,
            datasets: [
                {
                    label: 'Offentlige udgifter (G) - f.eks. infrastruktur',
                    data: initialData,
                    backgroundColor: '#2563eb',
                    borderColor: '#1e40af',
                    borderWidth: 1.5
                },
                {
                    label: 'Yderligere forbrug',
                    data: round1Data,
                    backgroundColor: '#3b82f6',
                    borderColor: '#2563eb',
                    borderWidth: 1.5
                },
                {
                    label: 'Yderligere forbrug',
                    data: round2Data,
                    backgroundColor: '#60a5fa',
                    borderColor: '#3b82f6',
                    borderWidth: 1.5
                },
                {
                    label: 'Yderligere forbrug',
                    data: round3Data,
                    backgroundColor: '#93c5fd',
                    borderColor: '#60a5fa',
                    borderWidth: 1.5
                },
                {
                    label: 'Yderligere forbrug',
                    data: round4Data,
                    backgroundColor: '#bfdbfe',
                    borderColor: '#93c5fd',
                    borderWidth: 1.5
                },
                {
                    label: 'Yderligere forbrug',
                    data: round5Data,
                    backgroundColor: '#dbeafe',
                    borderColor: '#bfdbfe',
                    borderWidth: 1.5
                },
                {
                    label: 'Yderligere runder',
                    data: remainingData,
                    backgroundColor: '#e0e7ff',
                    borderColor: '#dbeafe',
                    borderWidth: 1.5
                }
            ]
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
                    ...chartConfig.plugins.tooltip,
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += context.parsed.y + ' mia. kr.';
                            return label;
                        },
                        footer: function (tooltipItems) {
                            let total = 0;
                            tooltipItems.forEach(function (tooltipItem) {
                                total += tooltipItem.parsed.y;
                            });
                            return 'Kumuleret effekt: ' + total.toFixed(0) + ' mia. kr.';
                        }
                    }
                }
            },
            scales: {
                ...chartConfig.scales,
                x: {
                    ...chartConfig.scales.x,
                    stacked: true,
                    ticks: { display: false }
                },
                y: {
                    ...chartConfig.scales.y,
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Kumuleret effekt (mia. kr.)',
                        font: { size: 12, weight: 'bold' }
                    },
                    beginAtZero: true,
                    ticks: { display: false }
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

    fetchMoneySupplyData().then(data => {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'M1 (Kontanter + lønkonti)',
                    data: data.m1,
                    borderColor: '#4bc0c0',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    borderWidth: 2
                }, {
                    label: 'M2 (M1 + opsparingskonti)',
                    data: data.m2,
                    borderColor: '#36a2eb',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    borderWidth: 2
                }, {
                    label: 'M3 (M2 + langfristede indlån)',
                    data: data.m3,
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
    });
}

// Create Risk Premium Chart
function createRiskPremiumChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const loanTypes = ['Statslån', 'Boliglån', 'Virksomhedslån', 'Forbrugslån'];
    const riskFreeRate = 2; // Base rate
    const riskPremiums = [0, 1.5, 3, 8]; // Risk premiums

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
                x: {
                    ...chartConfig.scales.x,
                    stacked: true
                },
                y: {
                    ...chartConfig.scales.y,
                    stacked: true,
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

// Create Marshall's Model Chart (Supply and Demand for Loan Credit)
function createMarshallModelChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Quantity of money (loan credit) on x-axis
    const quantity = [0, 200, 400, 600, 800, 1000, 1200, 1400, 1600];

    // Supply curve (U) - upward sloping: higher interest rate → more saving
    // Supply: r = 1 + 0.01 * quantity (starts at r=1, increases with quantity)
    const supply = quantity.map(q => 1 + 0.01 * q);

    // Demand curve (E) - downward sloping: lower interest rate → more investment
    // Demand: r = 15 - 0.01 * quantity (starts at r=15, decreases with quantity)
    const demand = quantity.map(q => 15 - 0.01 * q);

    // Find equilibrium point (where supply = demand)
    // 1 + 0.01 * q = 15 - 0.01 * q
    // 0.02 * q = 14
    // q = 700
    const equilibriumQ = 700;
    const equilibriumR = 1 + 0.01 * equilibriumQ; // = 8

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: quantity,
            datasets: [{
                label: 'U (Udbud)',
                data: supply,
                borderColor: '#3b82f6', // Blue
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                tension: 0.1
            }, {
                label: 'E (Efterspørgsel)',
                data: demand,
                borderColor: '#ef4444', // Red
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                tension: 0.1
            }, {
                label: 'Ligevægt',
                data: [{ x: equilibriumQ, y: equilibriumR }],
                type: 'scatter',
                backgroundColor: '#fbbf24', // Yellow
                borderColor: '#fbbf24',
                pointRadius: 10,
                pointHoverRadius: 12,
                showLine: false
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 12,
                            family: 'Inter, sans-serif'
                        },
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    ...chartConfig.plugins.tooltip,
                    callbacks: {
                        label: function (context) {
                            if (context.dataset.label === 'Ligevægt') {
                                return 'Ligevægtspunkt';
                            }
                            return context.dataset.label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: 0,
                    max: 1600,
                    title: {
                        display: true,
                        text: 'Mængde penge',
                        font: {
                            size: 14,
                            weight: 'bold',
                            family: 'Inter, sans-serif'
                        },
                        padding: { top: 10, bottom: 10 }
                    },
                    ticks: {
                        display: false // No numbers on axes
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0,0,0,0.05)'
                    }
                },
                y: {
                    min: 0,
                    max: 16,
                    title: {
                        display: true,
                        text: 'renten',
                        font: {
                            size: 14,
                            weight: 'bold',
                            family: 'Inter, sans-serif'
                        },
                        padding: { top: 10, bottom: 10 }
                    },
                    ticks: {
                        display: false // No numbers on axes
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0,0,0,0.05)'
                    }
                }
            }
        },
        plugins: [{
            id: 'pointLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                const xScale = chart.scales.x;
                const yScale = chart.scales.y;

                chart.data.datasets.forEach((dataset, i) => {
                    if (dataset.label === 'Ligevægt') {
                        const meta = chart.getDatasetMeta(i);
                        meta.data.forEach((element) => {
                            const { x, y } = element.getProps(['x', 'y'], true);

                            // Draw dashed lines to axes
                            ctx.save();
                            ctx.strokeStyle = '#94a3b8';
                            ctx.lineWidth = 1;
                            ctx.setLineDash([5, 5]);

                            // Line to x-axis (L₀)
                            const xAxisY = yScale.getPixelForValue(0);
                            ctx.beginPath();
                            ctx.moveTo(x, y);
                            ctx.lineTo(x, xAxisY);
                            ctx.stroke();

                            // Line to y-axis (r₀)
                            const yAxisX = xScale.getPixelForValue(0);
                            ctx.beginPath();
                            ctx.moveTo(x, y);
                            ctx.lineTo(yAxisX, y);
                            ctx.stroke();

                            ctx.restore();

                            // Draw equilibrium point
                            ctx.save();
                            ctx.fillStyle = '#fbbf24';
                            ctx.beginPath();
                            ctx.arc(x, y, 5, 0, 2 * Math.PI);
                            ctx.fill();
                            ctx.restore();

                            // Draw r₀ label on y-axis
                            ctx.save();
                            ctx.fillStyle = '#000';
                            ctx.font = '12px Inter';
                            ctx.textAlign = 'right';
                            ctx.textBaseline = 'middle';
                            const labelX = yAxisX - 10;
                            ctx.fillText('r₀', labelX, y);
                            ctx.restore();

                            // Draw L₀ label on x-axis
                            ctx.save();
                            ctx.fillStyle = '#000';
                            ctx.font = '12px Inter';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'top';
                            const labelY = xAxisY + 10;
                            ctx.fillText('L₀', x, labelY);
                            ctx.restore();
                        });
                    }
                });
            }
        }]
    });
}

// Create Valuta Market Chart (Supply and Demand for Foreign Currency - e.g. EUR)
function createValutaMarketChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Quantity of foreign currency (e.g. euro) on x-axis
    const quantity = [0, 200, 400, 600, 800, 1000, 1200, 1400, 1600];

    // Supply of EUR - upward sloping: higher kurs (DKK per EUR) → more euro supplied
    // Supply: kurs = 4 + 0.004 * quantity
    const supply = quantity.map(q => 4 + 0.004 * q);

    // Demand for EUR - downward sloping: lower kurs → higher demand for euro
    // Demand: kurs = 12 - 0.004 * quantity
    const demand = quantity.map(q => 12 - 0.004 * q);

    // Equilibrium: 4 + 0.004*q = 12 - 0.004*q → q = 1000, kurs = 8
    const equilibriumQ = 1000;
    const equilibriumKurs = 4 + 0.004 * equilibriumQ;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: quantity,
            datasets: [{
                label: 'U (Udbud)',
                data: supply,
                borderColor: '#3b82f6',
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                tension: 0.1
            }, {
                label: 'E (Efterspørgsel)',
                data: demand,
                borderColor: '#ef4444',
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                tension: 0.1
            }, {
                label: 'Ligevægt',
                data: [{ x: equilibriumQ, y: equilibriumKurs }],
                type: 'scatter',
                backgroundColor: '#fbbf24',
                borderColor: '#fbbf24',
                pointRadius: 10,
                pointHoverRadius: 12,
                showLine: false
            }]
        },
        options: {
            ...chartConfig,
            layout: {
                padding: { left: 78, right: 24, top: 24, bottom: 52 }
            },
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'Kurs (DKK per EUR)',
                    position: 'top',
                    font: { size: 13, weight: 'bold', family: 'Inter, sans-serif' },
                    padding: { top: 0, bottom: 12 }
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: { size: 12, family: 'Inter, sans-serif' },
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    ...chartConfig.plugins.tooltip,
                    callbacks: {
                        label: function (context) {
                            if (context.dataset.label === 'Ligevægt') return 'Ligevægtspunkt';
                            return context.dataset.label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: 0,
                    max: 1600,
                    title: {
                        display: true,
                        text: 'Mængde valuta (fx euro)',
                        font: { size: 13, weight: 'bold', family: 'Inter, sans-serif' },
                        padding: { top: 8, bottom: 24 }
                    },
                    ticks: { display: false },
                    grid: { display: true, color: 'rgba(0,0,0,0.05)' }
                },
                y: {
                    min: 0,
                    max: 14,
                    title: { display: false },
                    ticks: { display: false },
                    grid: { display: true, color: 'rgba(0,0,0,0.05)' }
                }
            }
        },
        plugins: [{
            id: 'pointLabelsValuta',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                const xScale = chart.scales.x;
                const yScale = chart.scales.y;

                chart.data.datasets.forEach((dataset, i) => {
                    if (dataset.label === 'Ligevægt') {
                        const meta = chart.getDatasetMeta(i);
                        meta.data.forEach((element) => {
                            const { x, y } = element.getProps(['x', 'y'], true);
                            ctx.save();
                            ctx.strokeStyle = '#94a3b8';
                            ctx.lineWidth = 1;
                            ctx.setLineDash([5, 5]);
                            const xAxisY = yScale.getPixelForValue(0);
                            ctx.beginPath();
                            ctx.moveTo(x, y);
                            ctx.lineTo(x, xAxisY);
                            ctx.stroke();
                            const yAxisX = xScale.getPixelForValue(0);
                            ctx.beginPath();
                            ctx.moveTo(x, y);
                            ctx.lineTo(yAxisX, y);
                            ctx.stroke();
                            ctx.restore();
                            ctx.save();
                            ctx.fillStyle = '#fbbf24';
                            ctx.beginPath();
                            ctx.arc(x, y, 5, 0, 2 * Math.PI);
                            ctx.fill();
                            ctx.restore();
                            ctx.save();
                            ctx.fillStyle = '#000';
                            ctx.font = '12px Inter';
                            ctx.textAlign = 'right';
                            ctx.textBaseline = 'middle';
                            ctx.fillText('kurs₀', yAxisX - 12, y);
                            ctx.restore();
                            ctx.save();
                            ctx.fillStyle = '#000';
                            ctx.font = '12px Inter';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'top';
                            ctx.fillText('Q₀', x, xAxisY + 8);
                            ctx.restore();
                        });
                    }
                });
            }
        }]
    });
}

var valutaChartLayout = { padding: { left: 78, right: 24, top: 24, bottom: 52 } };
var valutaScaleTitlePadding = { x: { top: 8, bottom: 28 }, y: { top: 8, bottom: 8 } };

// Valuta chart: Appreciering – efterspørgsel efter valuta falder (E skifter til venstre) → kursen falder
function createValutaMarketChartAppreciering(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const quantity = [0, 200, 400, 600, 800, 1000, 1200, 1400, 1600];
    const supply = quantity.map(q => 4 + 0.004 * q);
    const demand = quantity.map(q => 12 - 0.004 * q);
    const demandNew = quantity.map(q => 10 - 0.004 * q); // E skifter til venstre
    const eq0Q = 1000, eq0Kurs = 8;
    const eq1Q = 750, eq1Kurs = 7; // ny ligevægt: appreciering

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: quantity,
            datasets: [{
                label: 'U (Udbud)',
                data: supply,
                borderColor: '#3b82f6',
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                tension: 0.1
            }, {
                label: 'E (Efterspørgsel)',
                data: demand,
                borderColor: 'rgba(239,68,68,0.5)',
                borderDash: [6, 4],
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.1
            }, {
                label: 'E₁ (Efterspørgsel efter skift)',
                data: demandNew,
                borderColor: '#ef4444',
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                tension: 0.1
            }, {
                label: 'Ligevægt (før)',
                data: [{ x: eq0Q, y: eq0Kurs }],
                type: 'scatter',
                backgroundColor: '#94a3b8',
                borderColor: '#94a3b8',
                pointRadius: 8,
                pointHoverRadius: 10,
                showLine: false
            }, {
                label: 'Ligevægt (efter)',
                data: [{ x: eq1Q, y: eq1Kurs }],
                type: 'scatter',
                backgroundColor: '#fbbf24',
                borderColor: '#fbbf24',
                pointRadius: 10,
                pointHoverRadius: 12,
                showLine: false
            }]
        },
        options: {
            ...chartConfig,
            layout: valutaChartLayout,
            plugins: {
                ...chartConfig.plugins,
                title: { display: true, text: 'Kurs (DKK per GBP)', position: 'top', font: { size: 13, weight: 'bold', family: 'Inter, sans-serif' }, padding: { top: 0, bottom: 12 } },
                legend: { display: true, position: 'top', labels: { font: { size: 11, family: 'Inter, sans-serif' }, padding: 12, usePointStyle: true } }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: 0,
                    max: 1600,
                    title: { display: true, text: 'Mængde valuta (fx GBP)', font: { size: 13, weight: 'bold', family: 'Inter, sans-serif' }, padding: valutaScaleTitlePadding.x },
                    ticks: { display: false },
                    grid: { display: true, color: 'rgba(0,0,0,0.05)' }
                },
                y: {
                    min: 0,
                    max: 14,
                    title: { display: false },
                    ticks: { display: false },
                    grid: { display: true, color: 'rgba(0,0,0,0.05)' }
                }
            }
        },
        plugins: [valutaEquilibriumPlugin('Ligevægt (før)', 'Ligevægt (efter)', 'kurs₀', 'Q₀', 'kurs₁', 'Q₁')]
    });
}

// Valuta chart: Depreciering – efterspørgsel efter valuta stiger (E skifter til højre) → kursen stiger
function createValutaMarketChartDepreciering(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const quantity = [0, 200, 400, 600, 800, 1000, 1200, 1400, 1600];
    const supply = quantity.map(q => 4 + 0.004 * q);
    const demand = quantity.map(q => 12 - 0.004 * q);
    const demandNew = quantity.map(q => 14 - 0.004 * q); // E skifter til højre
    const eq0Q = 1000, eq0Kurs = 8;
    const eq1Q = 1250, eq1Kurs = 9; // ny ligevægt: depreciering

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: quantity,
            datasets: [{
                label: 'U (Udbud)',
                data: supply,
                borderColor: '#3b82f6',
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                tension: 0.1
            }, {
                label: 'E (Efterspørgsel)',
                data: demand,
                borderColor: 'rgba(239,68,68,0.5)',
                borderDash: [6, 4],
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.1
            }, {
                label: 'E₁ (Efterspørgsel efter skift)',
                data: demandNew,
                borderColor: '#ef4444',
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                tension: 0.1
            }, {
                label: 'Ligevægt (før)',
                data: [{ x: eq0Q, y: eq0Kurs }],
                type: 'scatter',
                backgroundColor: '#94a3b8',
                borderColor: '#94a3b8',
                pointRadius: 8,
                pointHoverRadius: 10,
                showLine: false
            }, {
                label: 'Ligevægt (efter)',
                data: [{ x: eq1Q, y: eq1Kurs }],
                type: 'scatter',
                backgroundColor: '#fbbf24',
                borderColor: '#fbbf24',
                pointRadius: 10,
                pointHoverRadius: 12,
                showLine: false
            }]
        },
        options: {
            ...chartConfig,
            layout: valutaChartLayout,
            plugins: {
                ...chartConfig.plugins,
                title: { display: true, text: 'Kurs (DKK per GBP)', position: 'top', font: { size: 13, weight: 'bold', family: 'Inter, sans-serif' }, padding: { top: 0, bottom: 12 } },
                legend: { display: true, position: 'top', labels: { font: { size: 11, family: 'Inter, sans-serif' }, padding: 12, usePointStyle: true } }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: 0,
                    max: 1600,
                    title: { display: true, text: 'Mængde valuta (fx GBP)', font: { size: 13, weight: 'bold', family: 'Inter, sans-serif' }, padding: valutaScaleTitlePadding.x },
                    ticks: { display: false },
                    grid: { display: true, color: 'rgba(0,0,0,0.05)' }
                },
                y: {
                    min: 0,
                    max: 16,
                    title: { display: false },
                    ticks: { display: false },
                    grid: { display: true, color: 'rgba(0,0,0,0.05)' }
                }
            }
        },
        plugins: [valutaEquilibriumPlugin('Ligevægt (før)', 'Ligevægt (efter)', 'kurs₀', 'Q₀', 'kurs₁', 'Q₁')]
    });
}

function valutaEquilibriumPlugin(labelBefore, labelAfter, yLabelBefore, xLabelBefore, yLabelAfter, xLabelAfter) {
    return {
        id: 'pointLabelsValutaShift',
        afterDatasetsDraw(chart) {
            const { ctx } = chart;
            const xScale = chart.scales.x;
            const yScale = chart.scales.y;
            const datasets = chart.data.datasets;
            let before = null, after = null;
            datasets.forEach((dataset, i) => {
                if (dataset.label === labelBefore) {
                    const meta = chart.getDatasetMeta(i);
                    if (meta.data[0]) before = meta.data[0].getProps(['x', 'y'], true);
                } else if (dataset.label === labelAfter) {
                    const meta = chart.getDatasetMeta(i);
                    if (meta.data[0]) after = meta.data[0].getProps(['x', 'y'], true);
                }
            });
            const xAxisY = yScale.getPixelForValue(0);
            const yAxisX = xScale.getPixelForValue(0);
            
            // Check if y-values are close vertically (overlap risk)
            const yDiff = before && after ? Math.abs(before.y - after.y) : 100;
            const yLabelsOverlap = yDiff < 35; // hvis kurs₀ og kurs₁ er mindre end 35px fra hinanden
            
            [before, after].forEach((pt, idx) => {
                if (!pt) return;
                const { x, y } = pt;
                ctx.save();
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, xAxisY);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(yAxisX, y);
                ctx.stroke();
                ctx.restore();
                ctx.save();
                ctx.fillStyle = idx === 0 ? '#94a3b8' : '#fbbf24';
                ctx.beginPath();
                ctx.arc(x, y, idx === 0 ? 4 : 5, 0, 2 * Math.PI);
                ctx.fill();
                ctx.restore();
                
                const yLabel = idx === 0 ? yLabelBefore : yLabelAfter;
                const xLabel = idx === 0 ? xLabelBefore : xLabelAfter;
                
                // Y-axis labels (kurs₀, kurs₁) - placer dem smart så de ikke overlapper
                ctx.save();
                ctx.fillStyle = '#000';
                ctx.font = '11px Inter';
                ctx.textAlign = 'right';
                
                let yLabelY = y;
                let yLabelX = yAxisX - 12;
                
                if (yLabelsOverlap) {
                    // Hvis de overlapper: placer den første lidt over, den anden lidt under
                    if (idx === 0) {
                        yLabelY = y - 10; // kurs₀ lidt over punktet
                        ctx.textBaseline = 'bottom';
                    } else {
                        yLabelY = y + 10; // kurs₁ lidt under punktet
                        ctx.textBaseline = 'top';
                    }
                } else {
                    // Normal placering ved siden af punktet
                    ctx.textBaseline = 'middle';
                }
                
                ctx.fillText(yLabel, yLabelX, yLabelY);
                ctx.restore();
                
                // X-axis labels (Q₀, Q₁) - undgå overlap hvis punkter er tætte
                const xLabelY = xAxisY + (idx === 1 && before && Math.abs(x - before.x) < 80 ? 22 : 8);
                ctx.save();
                ctx.fillStyle = '#000';
                ctx.font = '11px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(xLabel, x, xLabelY);
                ctx.restore();
            });
        }
    };
}

// Fetch real interest rate and inflation data from Danmarks Statistik
async function fetchRealNominalRateData(years = 15) {
    try {
        const endYear = new Date().getFullYear();
        const startYear = endYear - years;

        // Fetch interest rates from StatBank (using annual data)
        // Note: This is a simplified approach. In production, you would query StatBank API properly
        // For now, we'll use realistic historical data based on actual Danish rates

        // Historical data based on Danmarks Nationalbank and Danmarks Statistik
        // These are approximate annual averages - in production, fetch from API
        const historicalData = {
            years: [],
            nominalRates: [],
            inflationRates: []
        };

        // Generate years array
        for (let year = startYear; year <= endYear; year++) {
            historicalData.years.push(year.toString());
        }

        // Historical nominal interest rates (approximate annual averages from Danmarks Nationalbank)
        // Based on certificate of deposit rates and lending rates
        const nominalRateData = {
            2010: 1.5, 2011: 1.8, 2012: 0.3, 2013: 0.2, 2014: 0.1,
            2015: 0.05, 2016: 0.05, 2017: 0.05, 2018: 0.05, 2019: 0.1,
            2020: 0.5, 2021: 0.3, 2022: 2.5, 2023: 3.0, 2024: 3.5, 2025: 3.2
        };

        // Historical inflation rates (year-over-year % change from Danmarks Statistik PRIS111)
        const inflationData = {
            2010: 2.3, 2011: 2.8, 2012: 2.4, 2013: 0.8, 2014: 0.6,
            2015: 0.5, 2016: 0.3, 2017: 1.1, 2018: 0.8, 2019: 0.7,
            2020: 0.4, 2021: 1.9, 2022: 7.7, 2023: 3.4, 2024: 2.0, 2025: 1.8
        };

        // Fill in data for requested years
        for (let year = startYear; year <= endYear; year++) {
            // Use actual data if available, otherwise interpolate
            if (nominalRateData[year] !== undefined) {
                historicalData.nominalRates.push(nominalRateData[year]);
            } else if (year < 2010) {
                // Pre-2010: higher rates
                historicalData.nominalRates.push(3.0 + (year - 2000) * 0.1);
            } else {
                // Future years: use last known value
                const lastYear = Math.max(...Object.keys(nominalRateData).map(Number).filter(y => y <= year));
                historicalData.nominalRates.push(nominalRateData[lastYear] || 3.0);
            }

            if (inflationData[year] !== undefined) {
                historicalData.inflationRates.push(inflationData[year]);
            } else if (year < 2010) {
                // Pre-2010: moderate inflation
                historicalData.inflationRates.push(2.0 + (year - 2000) * 0.05);
            } else {
                // Future years: use last known value
                const lastYear = Math.max(...Object.keys(inflationData).map(Number).filter(y => y <= year));
                historicalData.inflationRates.push(inflationData[lastYear] || 2.0);
            }
        }

        // Calculate real rates
        const realRates = historicalData.nominalRates.map((nom, i) =>
            Number((nom - historicalData.inflationRates[i]).toFixed(2))
        );

        return {
            years: historicalData.years,
            nominalRates: historicalData.nominalRates,
            inflationRates: historicalData.inflationRates,
            realRates: realRates
        };
    } catch (error) {
        console.error('Error fetching real/nominal rate data:', error);
        // Fallback to basic data
        return {
            years: ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024'],
            nominalRates: [0.05, 0.05, 0.05, 0.05, 0.10, 0.5, 0.3, 2.5, 3.0, 3.5],
            inflationRates: [0.5, 0.3, 1.1, 0.8, 0.7, 0.4, 1.9, 7.7, 3.4, 2.0],
            realRates: [-0.45, -0.25, -1.05, -0.75, -0.60, 0.1, -1.6, -5.2, -0.4, 1.5]
        };
    }
}

// Create Real vs Nominal Interest Rate Chart
function createRealNominalRateChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Fetch real data from Danmarks Statistik
    fetchRealNominalRateData(15).then(data => {
        const { years, nominalRates, inflationRates, realRates } = data;

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

    // Create gradients for glow effect
    const canvas = ctx;
    const chartArea = { top: 0, bottom: 400, left: 0, right: 800 };
    
    const createGradient = (color1, color2) => {
        const chartCtx = canvas.getContext('2d');
        const gradient = chartCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        return gradient;
    };

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: policies,
            datasets: [{
                label: 'BNP-effekt (%)',
                data: bnpEffect,
                backgroundColor: function(context) {
                    const chart = context.chart;
                    const {ctx, chartArea} = chart;
                    if (!chartArea) return 'rgba(59, 130, 246, 0.8)';
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.9)');
                    gradient.addColorStop(1, 'rgba(37, 99, 235, 1)');
                    return gradient;
                },
                borderColor: '#2563eb',
                borderWidth: 2.5
            }, {
                label: 'Inflationseffekt (%)',
                data: inflationEffect,
                backgroundColor: function(context) {
                    const chart = context.chart;
                    const {ctx, chartArea} = chart;
                    if (!chartArea) return 'rgba(168, 85, 247, 0.8)';
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, 'rgba(168, 85, 247, 0.9)');
                    gradient.addColorStop(1, 'rgba(147, 51, 234, 1)');
                    return gradient;
                },
                borderColor: '#9333ea',
                borderWidth: 2.5
            }, {
                label: 'Ledighedseffekt (%)',
                data: unemploymentEffect,
                backgroundColor: function(context) {
                    const chart = context.chart;
                    const {ctx, chartArea} = chart;
                    if (!chartArea) return 'rgba(236, 72, 153, 0.8)';
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, 'rgba(236, 72, 153, 0.9)');
                    gradient.addColorStop(1, 'rgba(219, 39, 119, 1)');
                    return gradient;
                },
                borderColor: '#db2777',
                borderWidth: 2.5
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
                x: {
                    ...chartConfig.scales.x,
                    stacked: false
                },
                y: {
                    ...chartConfig.scales.y,
                    stacked: false,
                    title: {
                        display: true,
                        text: 'Effekt (%)',
                        font: { size: 12, weight: 'bold' }
                    },
                    beginAtZero: false
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
    // Stacked bars showing cumulative effect
    const governmentSpending = [100, 100, 100, 100, 100, 100];
    // Cumulative consumption: each round adds to previous
    const cumulativeConsumption = [0, 75, 131, 173, 205, 205];

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: rounds,
            datasets: [{
                label: 'Offentlige udgifter',
                data: governmentSpending,
                backgroundColor: '#3b82f6',
                borderColor: '#2563eb',
                borderWidth: 1.5
            }, {
                label: 'Forbrug (multiplikatoreffekt)',
                data: cumulativeConsumption,
                backgroundColor: '#60a5fa',
                borderColor: '#3b82f6',
                borderWidth: 1.5
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
                },
                tooltip: {
                    ...chartConfig.plugins.tooltip,
                    callbacks: {
                        footer: function (tooltipItems) {
                            let total = 0;
                            tooltipItems.forEach(function (tooltipItem) {
                                total += tooltipItem.parsed.y;
                            });
                            return 'Total effekt: ' + total.toFixed(0) + ' mia. kr.';
                        }
                    }
                }
            },
            scales: {
                ...chartConfig.scales,
                x: {
                    ...chartConfig.scales.x,
                    stacked: true
                },
                y: {
                    ...chartConfig.scales.y,
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Effekt (mia. kr.)',
                        font: { size: 12, weight: 'bold' }
                    },
                    beginAtZero: true,
                    max: 350,
                    ticks: {
                        stepSize: 50,
                        callback: function (value) {
                            return value + '';
                        }
                    }
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
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 3,
                yAxisID: 'y',
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: '#ef4444',
                tension: 0.4,
                fill: false
            }, {
                label: 'Investering (index)',
                data: investment,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.15)',
                borderWidth: 2.5,
                yAxisID: 'y1',
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#2563eb',
                tension: 0.4,
                fill: true
            }, {
                label: 'Forbrug (index)',
                data: consumption,
                borderColor: '#14b8a6',
                backgroundColor: 'rgba(20, 184, 166, 0.15)',
                borderWidth: 2.5,
                yAxisID: 'y1',
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#14b8a6',
                tension: 0.4,
                fill: true
            }, {
                label: 'BNP (index)',
                data: bnp,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.15)',
                borderWidth: 3,
                yAxisID: 'y1',
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: '#8b5cf6',
                tension: 0.4,
                borderDash: [8, 4],
                fill: false
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
                    },
                    grid: {
                        color: 'rgba(239, 68, 68, 0.1)'
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
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                borderWidth: 3.5,
                pointRadius: 7,
                pointHoverRadius: 9,
                pointBackgroundColor: '#2563eb',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                tension: 0.4,
                fill: true
            }, {
                label: 'Pengepolitik (PP) - BNP',
                data: monetaryPolicyBNP,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                borderWidth: 3.5,
                pointRadius: 7,
                pointHoverRadius: 9,
                pointBackgroundColor: '#ef4444',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                tension: 0.4,
                fill: true
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
                    font: { size: 12, style: 'italic', family: 'Inter, sans-serif' }
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
                    },
                    beginAtZero: false,
                    min: 99
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
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.25)',
                borderWidth: 3,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: '#ef4444',
                tension: 0.4,
                fill: true
            }, {
                label: 'Beslutningslag',
                data: decisionLag,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.25)',
                borderWidth: 3,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: '#f59e0b',
                tension: 0.4,
                fill: true
            }, {
                label: 'Implementeringslag',
                data: implementationLag,
                borderColor: '#14b8a6',
                backgroundColor: 'rgba(20, 184, 166, 0.25)',
                borderWidth: 3,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: '#14b8a6',
                tension: 0.4,
                fill: true
            }, {
                label: 'Effektlag',
                data: effectLag,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.25)',
                borderWidth: 3.5,
                pointRadius: 7,
                pointHoverRadius: 9,
                pointBackgroundColor: '#8b5cf6',
                tension: 0.4,
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
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// Create WS-PS Model Chart (Wage Setting - Price Setting)
function createWSPSChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const unemployment = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    // WS: Real wage increases as unemployment decreases (workers have more power)
    const ws = [4.5, 4.0, 3.6, 3.3, 3.0, 2.7, 2.4, 2.2, 2.0, 1.8];
    // PS: Real wage offered by firms (constant in simple models)
    const ps = [3.0, 3.0, 3.0, 3.0, 3.0, 3.0, 3.0, 3.0, 3.0, 3.0];

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: unemployment.map(u => u + '%'),
            datasets: [
                {
                    label: 'WS (Lønrelation)',
                    data: ws,
                    borderColor: '#ff6384',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    tension: 0.3,
                    pointRadius: 0
                },
                {
                    label: 'PS (Prisrelation)',
                    data: ps,
                    borderColor: '#36a2eb',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    tension: 0,
                    pointRadius: 0
                }
            ]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                title: {
                    display: true,
                    text: 'WS-PS Modellen: Bestemmelse af strukturel ledighed',
                    font: { size: 16, weight: 'bold', family: 'Inter, sans-serif' }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Ledighedsprocent (%)', font: { weight: 'bold', family: 'Inter, sans-serif' } }
                },
                y: {
                    title: { display: true, text: 'Realløn (W/P)', font: { weight: 'bold', family: 'Inter, sans-serif' } },
                    min: 0,
                    max: 6
                }
            }
        },
        plugins: [{
            id: 'nairu-line',
            afterDraw: (chart) => {
                const { ctx, scales: { x, y } } = chart;
                const nairuIndex = 4; // index 4 corresponds to 5% unemployment where WS=PS=3.0
                const xPos = x.getPixelForValue(nairuIndex);
                const yPosTop = y.getPixelForValue(3.0);
                const yPosBottom = y.getPixelForValue(0);

                ctx.save();
                ctx.setLineDash([5, 5]);
                ctx.strokeStyle = '#666';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(xPos, yPosTop);
                ctx.lineTo(xPos, yPosBottom);
                ctx.stroke();

                ctx.font = 'bold 12px Inter';
                ctx.fillStyle = '#666';
                ctx.textAlign = 'center';
                ctx.fillText('Strukturel ledighed (NAIRU)', xPos, yPosBottom - 10);
                ctx.restore();
            }
        }]
    });
}

// Fetch job vacancies from Danmarks Statistik StatBank API (LSK03)
// Uses cache-first strategy: always use cached data if available, only update when API works
async function fetchJobVacanciesFromStatBank(years = 20) {
    const cacheKey = `statbank_job_vacancies_${years}`;
    
    // Always try cache first (even expired cache)
    const cachedData = getAnyCachedData(cacheKey);
    const freshCache = getCachedData(cacheKey);
    
    // If we have fresh cache, use it
    if (freshCache) {
        console.log('Using fresh cached job vacancy data from Danmarks Statistik');
        return freshCache;
    }

    // Try to fetch new data from API
    try {
        const endYear = new Date().getFullYear();
        const startYear = endYear - years;
        
        // Build time periods - Q4 data for each year
        const timeValues = [];
        for (let year = startYear; year <= endYear; year++) {
            timeValues.push(`${year}K4`);
        }
        
        const requestBody = {
            table: "LSK03",
            format: "JSONSTAT",
            lang: "da",
            variables: [
                {
                    code: "SESSION",
                    values: ["101"]
                },
                {
                    code: "Tid",
                    values: timeValues
                }
            ]
        };

        console.log('Fetching job vacancies from StatBank API...');
        
        const response = await fetch('https://api.statbank.dk/v1/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`StatBank API error: ${response.status}`);
        }

        const data = await response.json();
        const vacancyData = {};
        
        // JSONSTAT format parsing
        if (data && data.dataset && data.dataset.value) {
            const values = data.dataset.value;
            const dimensions = data.dataset.dimension;
            const timeDim = dimensions.Tid || dimensions.TID || dimensions.tid;
            
            if (timeDim && timeDim.category && timeDim.category.index) {
                const timeLabels = Object.keys(timeDim.category.index);
                
                timeLabels.forEach((timeLabel, i) => {
                    const year = timeLabel.substring(0, 4);
                    const value = values[i];
                    
                    if (value !== null && value !== undefined && !isNaN(value)) {
                        // Convert to % of workforce (~3 million)
                        const vacancyRate = (value / 3000000) * 100;
                        vacancyData[year] = vacancyRate;
                    }
                });
            }
        }
        // Alternative: Simple JSON array format
        else if (Array.isArray(data)) {
            data.forEach(row => {
                const time = row.TID || row.Tid || row.tid;
                const value = row.INDHOLD || row.value || row.Value;
                
                if (time && value !== null && value !== undefined) {
                    const year = time.substring(0, 4);
                    const vacancyRate = (parseFloat(value) / 3000000) * 100;
                    vacancyData[year] = vacancyRate;
                }
            });
        }
        
        // Save new data to cache
        if (Object.keys(vacancyData).length > 0) {
            setCachedData(cacheKey, vacancyData);
            console.log(`Updated cache with ${Object.keys(vacancyData).length} years of real job vacancy data from Danmarks Statistik`);
            return vacancyData;
        }
        
        // If no data parsed, use old cache
        if (cachedData) {
            console.log('API returned empty data, using cached data');
            return cachedData;
        }
        
        return null;
    } catch (error) {
        console.log('StatBank API unavailable:', error.message);
        
        // Use old cached data if available (even if expired)
        if (cachedData) {
            console.log('Using cached job vacancy data (API unavailable)');
            return cachedData;
        }
        
        return null;
    }
}

// Fetch Beveridge Curve data (job vacancies and unemployment) for Denmark
// Cache-first strategy: uses cached data, only updates when APIs are available
async function fetchBeveridgeCurveData(years = 20) {
    const cacheKey = `beveridge_curve_DNK_${years}`;
    
    // Check for fresh cache first
    const freshCache = getCachedData(cacheKey);
    if (freshCache) {
        console.log('Using fresh cached Beveridge curve data');
        return freshCache;
    }
    
    // Check for any cached data (even expired)
    const anyCache = getAnyCachedData(cacheKey);

    try {
        // Fetch unemployment from World Bank
        const unempResults = await fetchWorldBankData(
            API_CONFIG.worldBank.indicators.unemployment, 
            ['DNK'], 
            years
        );
        const unempData = unempResults[0]?.data || {};

        // Fetch real job vacancy data from Danmarks Statistik
        let vacancyData = await fetchJobVacanciesFromStatBank(years);
        let usingRealData = true;
        
        // If no real data, use simulation
        if (!vacancyData || Object.keys(vacancyData).length === 0) {
            console.log('No real vacancy data available, using simulation');
            vacancyData = generateJobVacancyDataFromUnemployment(unempData);
            usingRealData = false;
        } else {
            console.log('Using real job vacancy data from Danmarks Statistik');
        }

        // Combine data for years where we have both unemployment and vacancies
        const allYears = Array.from(new Set([
            ...Object.keys(unempData),
            ...Object.keys(vacancyData)
        ])).sort();

        const dataPoints = [];
        const labels = [];

        allYears.forEach(year => {
            const unemployment = unempData[year];
            const vacancies = vacancyData[year];
            
            // Only include points where we have both values
            if (unemployment !== undefined && unemployment !== null && 
                vacancies !== undefined && vacancies !== null) {
                dataPoints.push({
                    x: Number(unemployment.toFixed(1)),
                    y: Number(vacancies.toFixed(2)),
                    year: year
                });
                labels.push(year);
            }
        });

        const result = {
            dataPoints: dataPoints,
            labels: labels
        };

        // Cache the result
        if (dataPoints.length > 0) {
            setCachedData(cacheKey, result);
        }

        return result;
    } catch (error) {
        console.error('Error fetching Beveridge curve data:', error);
        
        // Use cached data if available (even expired)
        if (anyCache) {
            console.log('Using cached Beveridge curve data (API error)');
            return anyCache;
        }
        
        // Last resort: theoretical fallback
        console.log('No cached data available, using theoretical fallback');
        return {
            dataPoints: [
                { x: 10.0, y: 0.3, year: '2008' },
                { x: 8.0, y: 0.5, year: '2010' },
                { x: 7.0, y: 0.8, year: '2012' },
                { x: 6.0, y: 1.2, year: '2014' },
                { x: 5.0, y: 2.0, year: '2016' },
                { x: 4.0, y: 3.5, year: '2018' },
                { x: 3.0, y: 5.5, year: '2020' },
                { x: 2.0, y: 8.5, year: '2022' }
            ],
            labels: ['2008', '2010', '2012', '2014', '2016', '2018', '2020', '2022']
        };
    }
}

// Generate job vacancy data based on unemployment (inverse relationship)
// This is a realistic simulation based on historical Beveridge curve patterns
function generateJobVacancyDataFromUnemployment(unempData) {
    const vacancyData = {};
    
    // Beveridge curve relationship: vacancies = a / (unemployment + b) + c
    // Parameters calibrated to Danish data patterns
    const a = 8.0;  // Scaling factor
    const b = 1.5;   // Offset
    const c = 0.2;   // Minimum vacancy rate
    
    Object.keys(unempData).forEach(year => {
        const unemployment = unempData[year];
        if (unemployment !== undefined && unemployment !== null) {
            // Inverse relationship with some noise for realism
            const baseVacancy = a / (unemployment + b) + c;
            // Add small random variation (±10%) to simulate real-world variation
            const variation = 1 + (Math.random() - 0.5) * 0.2;
            vacancyData[year] = Math.max(0.1, Math.min(10.0, baseVacancy * variation));
        }
    });
    
    return vacancyData;
}

// Generate theoretical Beveridge curve points
function generateTheoreticalBeveridgeCurve(xMin, xMax, steps = 50) {
    const theoreticalPoints = [];
    const step = (xMax - xMin) / steps;
    
    // Beveridge curve relationship: vacancies = a / (unemployment + b) + c
    const a = 8.0;  // Scaling factor
    const b = 1.5;   // Offset
    const c = 0.2;   // Minimum vacancy rate
    
    for (let i = 0; i <= steps; i++) {
        const unemployment = xMin + (step * i);
        const vacancies = a / (unemployment + b) + c;
        theoreticalPoints.push({
            x: Number(unemployment.toFixed(2)),
            y: Number(vacancies.toFixed(2))
        });
    }
    
    return theoreticalPoints;
}

// Create Beveridge Curve Chart with real data
function createBeveridgeCurveChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Fetch real data
    fetchBeveridgeCurveData(25).then(result => {
        const dataPoints = result.dataPoints || [];
        
        if (dataPoints.length === 0) {
            console.warn('No data points available for Beveridge curve');
            return;
        }

        // Find min/max for dynamic scaling
        const xValues = dataPoints.map(p => p.x);
        const yValues = dataPoints.map(p => p.y);
        const xMin = Math.max(0, Math.min(...xValues) - 0.5);
        const xMax = Math.min(15, Math.max(...xValues) + 0.5);
        const yMin = Math.max(0, Math.min(...yValues) - 0.2);
        const yMax = Math.min(12, Math.max(...yValues) + 0.5);

        // Generate theoretical curve
        const theoreticalCurve = generateTheoreticalBeveridgeCurve(xMin, xMax);

        new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        // Theoretical curve - line only, no points
                        label: 'Teoretisk Beveridge-kurve',
                        data: theoreticalCurve,
                        borderColor: '#999999',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [5, 5], // Dashed line
                        showLine: true,
                        pointRadius: 0, // No points
                        pointHoverRadius: 0,
                        tension: 0.4
                    },
                    {
                        // Real data points with year labels
                        label: 'Danmark (reelle data)',
                        data: dataPoints,
                        borderColor: '#4bc0c0',
                        backgroundColor: 'rgba(75, 192, 192, 0.3)',
                        borderWidth: 2,
                        showLine: false, // Don't connect points - each point is a different time period
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        pointBackgroundColor: '#4bc0c0',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2
                    }
                ]
            },
            options: {
                ...chartConfig,
                plugins: {
                    ...chartConfig.plugins,
                    title: {
                        display: true,
                        text: 'Beveridge-kurven: Ledige stillinger vs. Ledighed i Danmark',
                        font: { size: 16, weight: 'bold', family: 'Inter, sans-serif' }
                    },
                    tooltip: {
                        ...chartConfig.plugins.tooltip,
                        filter: function(tooltipItem) {
                            // Only show tooltip for real data points, not theoretical curve
                            return tooltipItem.datasetIndex === 1;
                        },
                        callbacks: {
                            title: function(context) {
                                const point = context[0].raw;
                                return `År: ${point.year || 'N/A'}`;
                            },
                            label: function(context) {
                                const point = context.raw;
                                return [
                                    `Ledighed: ${point.x.toFixed(1)}%`,
                                    `Ledige stillinger: ${point.y.toFixed(2)}%`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { 
                            display: true, 
                            text: 'Ledighedsprocent (%)', 
                            font: { weight: 'bold', family: 'Inter, sans-serif', size: 12 } 
                        },
                        min: xMin,
                        max: xMax,
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(1) + '%';
                            }
                        }
                    },
                    y: {
                        title: { 
                            display: true, 
                            text: 'Ledige stillinger (%)', 
                            font: { weight: 'bold', family: 'Inter, sans-serif', size: 12 } 
                        },
                        min: yMin,
                        max: yMax,
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(1) + '%';
                            }
                        }
                    }
                }
            }
        });
    }).catch(error => {
        console.error('Error creating Beveridge curve chart:', error);
        // Fallback to simple theoretical curve
        const fallbackData = [
            { x: 10.0, y: 0.3, year: '2008' },
            { x: 8.0, y: 0.5, year: '2010' },
            { x: 7.0, y: 0.8, year: '2012' },
            { x: 6.0, y: 1.2, year: '2014' },
            { x: 5.0, y: 2.0, year: '2016' },
            { x: 4.0, y: 3.5, year: '2018' },
            { x: 3.0, y: 5.5, year: '2020' },
            { x: 2.0, y: 8.5, year: '2022' }
        ];

        // Generate theoretical curve for fallback
        const theoreticalCurve = generateTheoreticalBeveridgeCurve(0, 12);

        new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Teoretisk Beveridge-kurve',
                        data: theoreticalCurve,
                        borderColor: '#999999',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        showLine: true,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        tension: 0.4
                    },
                    {
                        label: 'Eksempel data',
                        data: fallbackData,
                        borderColor: '#4bc0c0',
                        backgroundColor: 'rgba(75, 192, 192, 0.3)',
                        borderWidth: 2,
                        showLine: false,
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        pointBackgroundColor: '#4bc0c0',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2
                    }
                ]
            },
            options: {
                ...chartConfig,
                plugins: {
                    ...chartConfig.plugins,
                    title: {
                        display: true,
                        text: 'Beveridge-kurven: Ledige stillinger vs. Ledighed',
                        font: { size: 16, weight: 'bold', family: 'Inter, sans-serif' }
                    },
                    tooltip: {
                        ...chartConfig.plugins.tooltip,
                        filter: function(tooltipItem) {
                            return tooltipItem.datasetIndex === 1;
                        },
                        callbacks: {
                            title: function(context) {
                                const point = context[0].raw;
                                return `År: ${point.year || 'N/A'}`;
                            },
                            label: function(context) {
                                const point = context.raw;
                                return [
                                    `Ledighed: ${point.x.toFixed(1)}%`,
                                    `Ledige stillinger: ${point.y.toFixed(2)}%`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Ledighedsprocent (%)', font: { weight: 'bold', family: 'Inter, sans-serif' } },
                        min: 0,
                        max: 12,
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(1) + '%';
                            }
                        }
                    },
                    y: {
                        title: { display: true, text: 'Ledige stillinger (%)', font: { weight: 'bold', family: 'Inter, sans-serif' } },
                        min: 0,
                        max: 10,
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(1) + '%';
                            }
                        }
                    }
                }
            }
        });
    });
}

// Create Danish Inflation Time Series Chart
function createDanishInflationTimeChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    fetchUnemploymentInflationData('DNK', 35).then(data => {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Inflation (%)',
                        data: data.inflation,
                        borderColor: '#ff6384',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        borderWidth: 3,
                        tension: 0.3,
                        fill: true,
                        pointRadius: 2
                    },
                    {
                        label: 'Ledighed (%)',
                        data: data.unemployment,
                        borderColor: '#36a2eb',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        borderWidth: 3,
                        tension: 0.3,
                        fill: true,
                        pointRadius: 2
                    }
                ]
            },
            options: {
                ...chartConfig,
                plugins: {
                    ...chartConfig.plugins,
                    title: {
                        display: true,
                        text: 'Inflation og ledighed i Danmark (1989-2024)',
                        font: { size: 16, weight: 'bold', family: 'Inter, sans-serif' }
                    }
                },
                scales: {
                    y: {
                        title: { display: true, text: 'Procent (%)', font: { weight: 'bold' } }
                    }
                }
            }
        });
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
                    case 'euro-band':
                        createEuroBandChart(element.id);
                        break;
                    case 'interest-rate':
                        createInterestRateChart(element.id, chartData || 'DK');
                        break;
                    case 'adas-model':
                    case 'sesu-model':
                        createADASChart(element.id);
                        break;
                    case 'sesu-negative-output-gap':
                        createSESUNegativeOutputGapChart(element.id);
                        break;
                    case 'sesu-no-output-gap':
                        createSESUNoOutputGapChart(element.id);
                        break;
                    case 'sesu-se-increase':
                        createSESUSEIncreaseChart(element.id);
                        break;
                    case 'sesu-expansive-fp':
                        createSESUExpansiveFPChart(element.id);
                        break;
                    case 'sesu-strukturpolitik-no-gap':
                        createSESUStrukturpolitikNoGapChart(element.id);
                        break;
                    case 'sesu-strukturpolitik-sulang-shift':
                        createSESUStrukturpolitikSULangShiftChart(element.id);
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
                        createBalanceOfPaymentsTheoryChart(element.id);
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
                    case 'phillips-curve-api':
                        createAPIPhillipsCurveChart(element.id);
                        break;
                    case 'money-supply':
                        createMoneySupplyChart(element.id);
                        break;
                    case 'ws-ps':
                        createWSPSChart(element.id);
                        break;
                    case 'beveridge-curve':
                        createBeveridgeCurveChart(element.id);
                        break;
                    case 'dk-inflation-time':
                        createDanishInflationTimeChart(element.id);
                        break;
                    case 'wage-price-spiral':
                        createWagePriceSpiralChart(element.id);
                        break;
                    case 'risk-premium':
                        createRiskPremiumChart(element.id);
                        break;
                    case 'marshall-model':
                        createMarshallModelChart(element.id);
                        break;
                    case 'valuta-market':
                        createValutaMarketChart(element.id);
                        break;
                    case 'valuta-market-appreciering':
                        createValutaMarketChartAppreciering(element.id);
                        break;
                    case 'valuta-market-depreciering':
                        createValutaMarketChartDepreciering(element.id);
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
                    case 'gdp-development':
                        const gdpDevCountries = element.dataset.chartData ?
                            element.dataset.chartData.split(',') : ['DNK', 'DEU', 'SWE', 'NOR', 'USA', 'GBR', 'KOR', 'JPN', 'CHN', 'IND', 'RUS', 'TUR', 'BRA', 'ITA', 'ESP', 'GRC', 'ARG'];
                        createGDPChart(element.id, gdpDevCountries);
                        break;
                    case 'gdp-indexed':
                        const gdpIdxCountries = element.dataset.chartData ?
                            element.dataset.chartData.split(',') : ['DNK', 'DEU', 'SWE', 'NOR', 'USA', 'GBR', 'KOR', 'JPN', 'CHN', 'IND', 'RUS', 'TUR', 'BRA', 'ITA', 'ESP', 'GRC', 'ARG'];
                        createGDPIndexedChart(element.id, gdpIdxCountries);
                        break;
                    case 'gdp-per-capita-line':
                        const gdpPcCountries = element.dataset.chartData ?
                            element.dataset.chartData.split(',') : ['DNK', 'DEU', 'SWE', 'NOR', 'USA', 'GBR', 'KOR', 'JPN', 'CHN', 'IND', 'RUS', 'TUR', 'BRA', 'ITA', 'ESP', 'GRC', 'ARG'];
                        createGDPPerCapitaChart(element.id, gdpPcCountries);
                        break;
                    case 'gdp-bubble':
                        const gdpBubbleCountries = element.dataset.chartData ?
                            element.dataset.chartData.split(',') : ['DNK', 'DEU', 'SWE', 'NOR', 'USA', 'GBR', 'KOR', 'JPN', 'CHN', 'IND', 'RUS', 'TUR', 'BRA', 'ITA', 'ESP', 'GRC', 'ARG'];
                        createGDPBubbleChart(element.id, gdpBubbleCountries);
                        break;
                    case 'okuns-law':
                        const okunsCountries = element.dataset.chartData ?
                            element.dataset.chartData.split(',') : ['DNK', 'DEU', 'SWE', 'NOR'];
                        createOkunsLawChart(element.id, okunsCountries);
                        break;
                    case 'bop-historical':
                        const bopYears = element.dataset.chartData ?
                            parseInt(element.dataset.chartData) : 54;
                        createBalanceOfPaymentsChart(element.id, bopYears);
                        break;
                    case 'unemployment-inflation':
                        const uiCountries = element.dataset.chartData ?
                            element.dataset.chartData.split(',') : ['DNK', 'DEU', 'SWE', 'NOR'];
                        createMultiCountryUnemploymentInflationChart(element.id, uiCountries);
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
