// Search functionality across all chapters
(function () {
    'use strict';

    // Chapter configuration
    const chapters = [
        { file: 'kapitel1.html', name: 'Kapitel 1: Introduktion til makroøkonomi' },
        { file: 'kapitel2.html', name: 'Kapitel 2: Nationalregnskabet' },
        { file: 'kapitel3.html', name: 'Kapitel 3: Konjunkturbeskrivelse' },
        { file: 'kapitel4.html', name: 'Kapitel 4: Penge og finansielle markeder' },
        { file: 'kapitel5.html', name: 'Kapitel 5: Rentedannelse og finansiel stabilitet' },
        { file: 'kapitel6.html', name: 'Kapitel 6: Varemarkedet på kort sigt' },
        { file: 'kapitel7.html', name: 'Kapitel 7: Arbejdsmarked og inflation' },
        { file: 'kapitel8.html', name: 'Kapitel 8: Økonomisk politik og konkurrenceevne' },
        { file: 'kapitel9.html', name: 'Kapitel 9: Arbejdsmarkedet i makroøkonomien' }
    ];

    let chaptersContent = {};
    let searchModal, searchInput, searchResults, searchInfo;
    let isLoadingChapters = false;
    let chaptersLoaded = false;

    // Initialize search functionality
    function initSearch() {
        searchModal = document.getElementById('search-modal');
        searchInput = document.getElementById('search-input');
        searchResults = document.getElementById('search-results');
        searchInfo = document.getElementById('search-info');

        if (!searchModal || !searchInput || !searchResults) {
            console.error('Search elements not found');
            return;
        }

        // Event listeners
        document.getElementById('search-icon-nav')?.addEventListener('click', openSearchModal);
        document.getElementById('search-close')?.addEventListener('click', closeSearchModal);
        searchModal.addEventListener('click', function (e) {
            if (e.target === searchModal) {
                closeSearchModal();
            }
        });

        // Search input event
        searchInput.addEventListener('input', debounce(performSearch, 300));

        // ESC key to close modal
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && searchModal.classList.contains('active')) {
                closeSearchModal();
            }
        });

        // Preload chapters content - don't await, let it load in background
        preloadChapters().then(() => {
            console.log('All chapters preloaded successfully');
        }).catch(err => {
            console.error('Error preloading chapters:', err);
        });
    }

    // Open search modal
    function openSearchModal() {
        searchModal.classList.add('active');
        searchInput.focus();
        searchInput.value = '';
        searchResults.innerHTML = '';
        searchInfo.textContent = 'Skriv mindst 3 tegn for at søge...';
    }

    // Close search modal
    function closeSearchModal() {
        searchModal.classList.remove('active');
        searchInput.value = '';
        searchResults.innerHTML = '';
    }

    // Debounce function to limit search frequency
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Preload all chapters content
    async function preloadChapters() {
        // Prevent duplicate loading
        if (isLoadingChapters || chaptersLoaded) {
            console.log('Chapters already loading or loaded, skipping...');
            return;
        }

        isLoadingChapters = true;
        console.log('Starting to preload chapters...');
        console.log('Total chapters to load:', chapters.length);

        // Check if we're using file:// protocol (CORS will block fetch)
        const isFileProtocol = window.location.protocol === 'file:';
        console.log('Protocol:', window.location.protocol, isFileProtocol ? '(file:// - CORS may block fetch)' : '(http/https - OK for fetch)');

        // Get current page filename
        const currentPage = window.location.pathname.split('/').pop();
        console.log('Current page:', currentPage);
        console.log('Window location:', window.location.href);

        // Load current page content first
        for (const chapter of chapters) {
            if (chapter.file === currentPage) {
                const article = document.querySelector('article');
                if (article) {
                    const clonedArticle = article.cloneNode(true);
                    clonedArticle.querySelectorAll('script, style, .quiz-container, .podcast-section').forEach(el => el.remove());
                    const textContent = clonedArticle.textContent || clonedArticle.innerText;
                    chaptersContent[chapter.file] = textContent;
                    console.log(`✓ Loaded ${chapter.file} (current page): ${textContent.length} characters`);
                } else {
                    console.warn(`✗ No article found for current page ${chapter.file}`);
                }
                break;
            }
        }

        // If using file:// protocol, we can't fetch other files due to CORS
        if (isFileProtocol) {
            console.warn('⚠ Using file:// protocol - cannot fetch other chapters due to CORS. Only current chapter will be searchable.');
            console.warn('💡 Tip: Use a local web server (e.g., `python -m http.server` or `npx serve`) for full cross-chapter search.');
            isLoadingChapters = false;
            chaptersLoaded = true;
            console.log(`Finished preloading. Total chapters loaded: ${Object.keys(chaptersContent).length} (limited by file:// protocol)`);
            return;
        }

        // Fetch other chapters (only works on http/https)
        for (const chapter of chapters) {
            try {
                // Skip current page (already loaded)
                if (chapter.file === currentPage) {
                    continue;
                }

                console.log(`\n=== Processing ${chapter.file} ===`);

                // Fetch other chapters
                console.log(`Fetching ${chapter.file}...`);
                const response = await fetch(chapter.file);
                console.log(`Response for ${chapter.file}:`, response.status, response.ok);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const html = await response.text();
                console.log(`Received HTML for ${chapter.file}: ${html.length} characters`);

                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const article = doc.querySelector('article');

                if (article) {
                    // Remove script tags, style tags, and other non-content elements
                    const clonedArticle = article.cloneNode(true);
                    clonedArticle.querySelectorAll('script, style, .quiz-container, .podcast-section').forEach(el => el.remove());
                    const textContent = clonedArticle.textContent || clonedArticle.innerText;
                    chaptersContent[chapter.file] = textContent;
                    console.log(`✓ Loaded ${chapter.file}: ${textContent.length} characters`);
                    console.log(`chaptersContent now has:`, Object.keys(chaptersContent));
                } else {
                    console.warn(`✗ No article found in ${chapter.file}`);
                }
            } catch (error) {
                // Check if it's a CORS error
                if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                    console.error(`✗ CORS error loading ${chapter.file} - likely using file:// protocol`);
                    console.error('💡 Tip: Use a local web server for full cross-chapter search');
                } else {
                    console.error(`✗ Error loading ${chapter.file}:`, error.message, error);
                }
            }
        }

        isLoadingChapters = false;
        chaptersLoaded = true;
        console.log(`Finished preloading. Total chapters loaded: ${Object.keys(chaptersContent).length}`);
    }

    // Perform search
    async function performSearch() {
        const query = searchInput.value.trim();

        if (query.length < 3) {
            searchResults.innerHTML = '';
            searchInfo.textContent = 'Skriv mindst 3 tegn for at søge...';
            return;
        }

        // Show loading
        searchResults.innerHTML = '<div class="search-loading"><i class="bi bi-hourglass-split"></i><p>Søger...</p></div>';
        searchInfo.textContent = `Søger efter "${query}"...`;

        // Wait for chapters to load if not loaded yet
        if (!chaptersLoaded) {
            searchInfo.textContent = 'Indlæser kapitler...';

            // If already loading, wait for it to finish
            if (isLoadingChapters) {
                console.log('Waiting for chapters to finish loading...');
                // Wait for loading to complete (check every 100ms)
                while (isLoadingChapters) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } else {
                // Start loading
                await preloadChapters();
            }

            console.log(`After preload: ${Object.keys(chaptersContent).length} chapters loaded`);
        }

        // Perform search with a small delay to show loading state
        setTimeout(() => {
            const results = searchInChapters(query);
            console.log(`Search for "${query}" found ${results.length} results`);
            console.log('Loaded chapters:', Object.keys(chaptersContent));
            displayResults(results, query);
        }, 100);
    }

    // Search in all chapters
    function searchInChapters(query) {
        const results = [];
        const queryLower = query.toLowerCase();

        for (const chapter of chapters) {
            const content = chaptersContent[chapter.file];
            if (!content) {
                console.log(`No content for ${chapter.file}`);
                continue;
            }

            const contentLower = content.toLowerCase();
            let index = 0;
            let resultCount = 0;

            // Find all occurrences
            while ((index = contentLower.indexOf(queryLower, index)) !== -1) {
                const start = Math.max(0, index - 80);
                const end = Math.min(content.length, index + query.length + 80);
                let context = content.substring(start, end);

                // Add ellipsis if not at start/end
                if (start > 0) context = '...' + context;
                if (end < content.length) context = context + '...';

                results.push({
                    chapter: chapter.name,
                    file: chapter.file,
                    context: context,
                    position: index,
                    searchTerm: query
                });

                index += query.length;
                resultCount++;

                // Limit results per chapter to avoid too many
                if (resultCount >= 5) {
                    break;
                }
            }

            if (resultCount > 0) {
                console.log(`Found ${resultCount} results in ${chapter.file}`);
            }
        }

        return results;
    }

    // Display search results
    function displayResults(results, query) {
        searchResults.innerHTML = '';

        if (results.length === 0) {
            searchInfo.textContent = `Ingen resultater fundet for "${query}"`;
            searchResults.innerHTML = `
                <div class="no-results">
                    <i class="bi bi-search"></i>
                    <p>Ingen resultater fundet. Prøv et andet søgeord.</p>
                </div>
            `;
            return;
        }

        // Check if we're using file:// protocol and only have 1 chapter loaded
        const isFileProtocol = window.location.protocol === 'file:';
        const loadedChaptersCount = Object.keys(chaptersContent).length;
        const isLimitedSearch = isFileProtocol && loadedChaptersCount === 1;

        if (isLimitedSearch) {
            searchInfo.textContent = `Fandt ${results.length} resultat${results.length !== 1 ? 'er' : ''} for "${query}" (kun i dette kapitel)`;
            // Add a note about file:// limitation
            const warningNote = document.createElement('div');
            warningNote.style.cssText = 'background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin-bottom: 15px; font-size: 13px; color: #856404;';
            warningNote.innerHTML = '<strong>Note:</strong> Søgning fungerer kun i dette kapitel når filen åbnes direkte (file://). Brug en lokal webserver for at søge på tværs af alle kapitler.';
            searchResults.appendChild(warningNote);
        } else {
            searchInfo.textContent = `Fandt ${results.length} resultat${results.length !== 1 ? 'er' : ''} for "${query}"`;
        }

        results.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';

            // Highlight the search term in context
            const highlightedContext = highlightText(result.context, query);

            resultItem.innerHTML = `
                <div class="search-result-chapter">${result.chapter}</div>
                <div class="search-result-text">${highlightedContext}</div>
            `;

            resultItem.addEventListener('click', () => {
                // Store search term in sessionStorage for highlighting after navigation
                sessionStorage.setItem('searchTerm', result.searchTerm);
                sessionStorage.setItem('searchFromOtherPage', 'true');

                // Navigate to the chapter
                window.location.href = result.file;
                closeSearchModal();
            });

            searchResults.appendChild(resultItem);
        });
    }

    // Highlight search term in text
    function highlightText(text, query) {
        const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    // Escape special regex characters
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Handle scrolling to search result after navigation
    function handleSearchNavigation() {
        const searchTerm = sessionStorage.getItem('searchTerm');
        const fromOtherPage = sessionStorage.getItem('searchFromOtherPage');

        if (searchTerm && fromOtherPage === 'true') {
            // Clear the flags
            sessionStorage.removeItem('searchTerm');
            sessionStorage.removeItem('searchFromOtherPage');

            // Wait for page to fully load
            setTimeout(() => {
                const article = document.querySelector('article');
                if (!article) return;

                // Find the first occurrence of the search term
                const walker = document.createTreeWalker(
                    article,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );

                let node;
                let found = false;
                const searchLower = searchTerm.toLowerCase();

                while (node = walker.nextNode()) {
                    const text = node.textContent;
                    const textLower = text.toLowerCase();
                    const index = textLower.indexOf(searchLower);

                    if (index !== -1 && !found) {
                        // Found the search term
                        const parent = node.parentElement;
                        if (parent) {
                            // Scroll to the element
                            parent.scrollIntoView({ behavior: 'smooth', block: 'center' });

                            // Highlight the parent element temporarily
                            parent.style.backgroundColor = '#d3d3d333';
                            setTimeout(() => {
                                parent.style.backgroundColor = '';
                            }, 3000);

                            found = true;
                            break;
                        }
                    }
                }
            }, 500);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initSearch();
            handleSearchNavigation();
        });
    } else {
        initSearch();
        handleSearchNavigation();
    }
})();
