document.addEventListener("DOMContentLoaded", function () {
    const article = document.querySelector('article');
    if (!article) return;

    const headings = article.querySelectorAll('h1, h2, h3, h4');
    if (!headings.length) return;

    // Get current page filename and chapter number
    let currentUrl = window.location.href;
    currentUrl = currentUrl.split('?')[0].split('#')[0];
    let currentPage = currentUrl.substring(currentUrl.lastIndexOf('/') + 1).toLowerCase();
    if (!currentPage || currentPage === '') {
        currentPage = 'index.html';
    } else if (!currentPage.includes('.')) {
        currentPage += '.html';
    }

    // Find chapter number from menuItems array if it exists
    // index.html is 0, kapitel1.html is 1, etc.
    const chapterNumber = typeof menuItems !== 'undefined'
        ? menuItems.findIndex(item => item.href.toLowerCase() === currentPage) // index.html = 0, kapitel1.html = 1
        : 0; // For index.html or other non-chapter pages

    let h2Counter = 0, h3Counter = 0, h4Counter = 0;

    headings.forEach(heading => {
        const tagName = heading.tagName.toLowerCase();
        let numberPrefix = '';

        if (tagName === 'h1') {
            h2Counter = 0; h3Counter = 0; h4Counter = 0;
            numberPrefix = chapterNumber + ' ';
        } else if (tagName === 'h2') {
            h2Counter++; h3Counter = 0; h4Counter = 0;
            numberPrefix = chapterNumber + '.' + h2Counter + ' ';
        } else if (tagName === 'h3') {
            h3Counter++; h4Counter = 0;
            numberPrefix = chapterNumber + '.' + h2Counter + '.' + h3Counter + ' ';
        } else if (tagName === 'h4') {
            h4Counter++;
            numberPrefix = chapterNumber + '.' + h2Counter + '.' + h3Counter + '.' + h4Counter + ' ';
        }

        // Improved regex to remove existing numbering like "1. ", "1.1 ", "1.1.1 ", "1. Vækst"
        let headingText = heading.innerText.replace(/^[\d.]+\s+/, '').trim();
        const id = heading.id || headingText.replace(/\s+/g, '-').toLowerCase();
        heading.id = id;
        heading.innerHTML = numberPrefix + headingText;
    });

    // Left-aligned TOC Sidebar
    const sidebar = document.getElementById('left-aligned-sidebar');
    const sidebarToggleButton = document.getElementById('sidebar-toggle-button');
    const sidebarToc = document.getElementById('sidebar-toc');
    const content = document.querySelector('.content');

    if (sidebar && sidebarToggleButton && sidebarToc && content) {
        const articleHeadings = article.querySelectorAll('h2, h3, h4');
        let tocHTML = '';
        articleHeadings.forEach(heading => {
            const id = heading.id;
            const indentClass = { 'H2': 'pl-0', 'H3': 'pl-3', 'H4': 'pl-5' }[heading.tagName];
            tocHTML += `<li class="${indentClass}"><a href="#${id}">${heading.innerHTML}</a></li>`;
        });
        sidebarToc.innerHTML = tocHTML;

        const toggleSidebar = () => {
            sidebar.classList.toggle('open');
            sidebarToggleButton.classList.toggle('open');
            content.classList.toggle('sidebar-open');
        };

        sidebarToggleButton.addEventListener('click', toggleSidebar);

        setTimeout(() => {
            toggleSidebar();
        }, 0); // Open instantly (0ms) - Change this value to adjust slide-in time

        setTimeout(() => {
            if (sidebar.classList.contains('open')) {
                toggleSidebar();
            }
        }, 5000); // Close after 5 seconds (from initial open) - Change this value to adjust slide-out time
    }

    // Typing animation for video/image overlays
    function typeWriter(element, text, speed = 100, callback) {
        let i = 0;
        element.innerHTML = '';
        let cursor = element.querySelector('.typing-cursor');
        if (!cursor) {
            cursor = document.createElement('span');
            cursor.className = 'typing-cursor';
            element.appendChild(cursor);
        }
        function type() {
            if (i < text.length) {
                cursor.insertAdjacentText('beforebegin', text.charAt(i));
                i++;
                setTimeout(type, speed);
            } else {
                if (callback) callback();
            }
        }
        type();
    }

    // Intersection Observer for text animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const overlay = entry.target;
                overlay.classList.add('is-visible');

                setTimeout(() => {
                    const text = overlay.dataset.typeText;
                    const speed = parseInt(overlay.dataset.typeSpeed) || 150;
                    if (text && !overlay.hasAttribute('data-typed')) {
                        overlay.setAttribute('data-typed', 'true');
                        typeWriter(overlay, text, speed);
                    }
                }, 300);
            }
        });
    }, {
        threshold: 0.5
    });

    // Clear text immediately on page load to prevent flash before typing animation
    document.querySelectorAll('.cover-text-overlay[data-type-text]').forEach(overlay => {
        overlay.innerHTML = '';
        observer.observe(overlay);
    });
});