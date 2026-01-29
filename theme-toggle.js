// Theme Toggle Functionality
(function() {
    'use strict';

    // Theme state management
    const THEME_STORAGE_KEY = 'makro-theme';
    const THEME_LIGHT = 'light';
    const THEME_DARK = 'dark';

    // Get current theme from localStorage or default to light
    function getCurrentTheme() {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        return savedTheme || THEME_LIGHT;
    }

    // Set theme
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_STORAGE_KEY, theme);
        
        // Update Chart.js charts if they exist
        updateChartTheme(theme);
    }

    // Toggle theme
    function toggleTheme() {
        const currentTheme = getCurrentTheme();
        const newTheme = currentTheme === THEME_LIGHT ? THEME_DARK : THEME_LIGHT;
        setTheme(newTheme);
        updateThemeIcon(newTheme);
    }

    // Update theme icon animation
    function updateThemeIcon(theme) {
        const themeToggle = document.getElementById('theme-toggle');
        if (!themeToggle) return;

        const sunIcon = themeToggle.querySelector('.theme-icon-sun');
        const moonIcon = themeToggle.querySelector('.theme-icon-moon');

        if (theme === THEME_DARK) {
            sunIcon.classList.remove('active');
            moonIcon.classList.add('active');
        } else {
            sunIcon.classList.add('active');
            moonIcon.classList.remove('active');
        }
    }

    // Update Chart.js charts to match theme
    function updateChartTheme(theme) {
        // Update chartConfig in charts-api.js if available
        if (typeof window.updateChartConfig === 'function') {
            window.updateChartConfig();
        }

        // Get all Chart.js chart instances
        if (typeof Chart !== 'undefined' && Chart.instances) {
            Object.keys(Chart.instances).forEach(chartId => {
                const chart = Chart.instances[chartId];
                if (chart && chart.options) {
                    // Update chart colors based on theme
                    const isDark = theme === THEME_DARK;
                    const colors = isDark ? {
                        grid: 'rgba(255, 255, 255, 0.3)', // More visible grid in dark mode
                        text: '#ffffff',
                        tooltipBg: 'rgba(255, 255, 255, 0.9)',
                        tooltipText: '#000000'
                    } : {
                        grid: 'rgba(0, 0, 0, 0.05)',
                        text: '#333333',
                        tooltipBg: 'rgba(0, 0, 0, 0.8)',
                        tooltipText: '#ffffff'
                    };
                    
                    // Update scales colors
                    if (chart.options.scales) {
                        Object.keys(chart.options.scales).forEach(scaleKey => {
                            const scale = chart.options.scales[scaleKey];
                            if (scale.grid) {
                                scale.grid.color = colors.grid;
                                scale.grid.lineWidth = 1;
                            }
                            if (scale.ticks) {
                                scale.ticks.color = colors.text;
                            }
                            if (scale.title) {
                                scale.title.color = colors.text;
                            }
                        });
                    }

                    // Update legend colors
                    if (chart.options.plugins && chart.options.plugins.legend) {
                        if (chart.options.plugins.legend.labels) {
                            chart.options.plugins.legend.labels.color = colors.text;
                        }
                    }

                    // Update title colors
                    if (chart.options.plugins && chart.options.plugins.title) {
                        chart.options.plugins.title.color = colors.text;
                    }

                    // Update tooltip colors
                    if (chart.options.plugins && chart.options.plugins.tooltip) {
                        chart.options.plugins.tooltip.backgroundColor = colors.tooltipBg;
                        chart.options.plugins.tooltip.titleColor = colors.tooltipText;
                        chart.options.plugins.tooltip.bodyColor = colors.tooltipText;
                    }

                    chart.update('none'); // Update without animation for instant theme change
                }
            });
        }

        // Also update charts created via charts-api.js
        if (window.chartInstances && Array.isArray(window.chartInstances)) {
            window.chartInstances.forEach(chart => {
                if (chart && chart.options) {
                    const isDark = theme === THEME_DARK;
                    const colors = isDark ? {
                        grid: 'rgba(255, 255, 255, 0.3)', // More visible grid in dark mode
                        text: '#ffffff',
                        tooltipBg: 'rgba(255, 255, 255, 0.9)',
                        tooltipText: '#000000'
                    } : {
                        grid: 'rgba(0, 0, 0, 0.05)',
                        text: '#333333',
                        tooltipBg: 'rgba(0, 0, 0, 0.8)',
                        tooltipText: '#ffffff'
                    };
                    
                    if (chart.options.scales) {
                        Object.keys(chart.options.scales).forEach(scaleKey => {
                            const scale = chart.options.scales[scaleKey];
                            if (scale.grid) {
                                scale.grid.color = colors.grid;
                                scale.grid.lineWidth = 1;
                            }
                            if (scale.ticks) {
                                scale.ticks.color = colors.text;
                            }
                            if (scale.title) {
                                scale.title.color = colors.text;
                            }
                        });
                    }

                    if (chart.options.plugins && chart.options.plugins.legend) {
                        if (chart.options.plugins.legend.labels) {
                            chart.options.plugins.legend.labels.color = colors.text;
                        }
                    }

                    if (chart.options.plugins && chart.options.plugins.title) {
                        chart.options.plugins.title.color = colors.text;
                    }

                    if (chart.options.plugins && chart.options.plugins.tooltip) {
                        chart.options.plugins.tooltip.backgroundColor = colors.tooltipBg;
                        chart.options.plugins.tooltip.titleColor = colors.tooltipText;
                        chart.options.plugins.tooltip.bodyColor = colors.tooltipText;
                    }

                    chart.update('none');
                }
            });
        }
    }

    // Initialize theme on page load
    function initTheme() {
        const currentTheme = getCurrentTheme();
        setTheme(currentTheme);
        updateThemeIcon(currentTheme);

        // Add event listener to theme toggle button
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', function(e) {
                e.preventDefault();
                toggleTheme();
            });
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheme);
    } else {
        initTheme();
    }

    // Expose toggleTheme for external use
    window.toggleTheme = toggleTheme;
    window.getCurrentTheme = getCurrentTheme;
})();
