// Menu configuration
const menuItems = [
    { href: 'index.html', text: 'Forside' },
    { href: 'kapitel1.html', text: 'Juridisk Metode' },
    { href: 'kapitel2.html', text: 'Aftaleloven' },
    { href: 'kapitel3.html', text: 'Købeloven' },
    { href: 'kapitel4.html', text: 'Erstatning' },
    { href: 'kapitel5.html', text: 'Kreditaftaleloven' },
    { href: 'kapitel6.html', text: 'Ejendomshandel Tinglysning & Pant' },
    { href: 'kapitel7.html', text: 'Insolvensret Selskabsret Hvidvask & Compliance' }
];

// Function to generate dropdown menu HTML
function generateDropdownMenu() {
    const dropdownMenu = document.querySelector('#navbarDropdownMenuLink + .dropdown-menu');
    if (!dropdownMenu) return;

    // Clear existing items
    dropdownMenu.innerHTML = '';

    // Add menu items
    menuItems.forEach((item, index) => {
        const menuItem = document.createElement('a');
        menuItem.className = 'dropdown-item';
        menuItem.href = item.href;
        // index.html is 0, kapitel1.html is 1, etc.
        const number = index === 0 ? 0 : index;
        menuItem.textContent = `${number}. ${item.text}`;
        dropdownMenu.appendChild(menuItem);
    });
}

// Function to get navigation links
function getNavigationLinks() {
    const pages = menuItems.map(item => item.href);
    const currentUrl = window.location.href;
    const currentPage = currentUrl.substring(currentUrl.lastIndexOf('/') + 1).split('?')[0].split('#')[0].toLowerCase();
    const currentIndex = pages.findIndex(page => page.toLowerCase() === currentPage);

    if (currentIndex === -1) {
        return {
            prev: pages[pages.length - 1],
            next: pages[1]
        };
    }

    return {
        prev: pages[(currentIndex - 1 + pages.length) % pages.length],
        next: pages[(currentIndex + 1) % pages.length]
    };
}

// Function to update navigation arrows
function updateNavigationArrows() {
    const links = getNavigationLinks();
    const prevLink = document.getElementById('prev-page-link');
    const nextLink = document.getElementById('next-page-link');

    if (prevLink) prevLink.href = links.prev;
    if (nextLink) nextLink.href = links.next;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    generateDropdownMenu();
    updateNavigationArrows();
});
