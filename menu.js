// Menu configuration
const menuItems = [
    { href: 'index.html', text: 'Forside' },
    { href: 'kapitel1.html', text: 'Introduktion til makroøkonomi' },
    { href: 'kapitel2.html', text: 'Nationalregnskabet' },
    { href: 'kapitel3.html', text: 'Konjunkturbeskrivelse' },
    { href: 'kapitel4.html', text: 'Penge og finansielle markeder' },
    { href: 'kapitel5.html', text: 'Rentedannelse og finansiel stabilitet' },
    { href: 'kapitel6.html', text: 'Varemarkedet på kort sigt' },
    { href: 'kapitel7.html', text: 'Arbejdsmarked og inflation' },
    { href: 'kapitel8.html', text: 'Økonomisk politik og konkurrenceevne' },
    { href: 'kapitel9.html', text: 'Ordliste' }
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
