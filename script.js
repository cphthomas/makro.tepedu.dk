document.addEventListener("DOMContentLoaded", function() {
  const menuIcon = document.getElementById('menu-icon');
  const pageMenu = document.getElementById('page-menu');
  
  // Only select headings within the article content
  const article = document.querySelector('article');
  if (!article) return;
  
  const headings = article.querySelectorAll('h1, h2, h3');
  if (!headings.length) return;

  // Get current page filename and chapter number
  let currentUrl = window.location.href;
  currentUrl = currentUrl.split('?')[0].split('#')[0];
  let currentPage = currentUrl.substring(currentUrl.lastIndexOf('/') + 1).toLowerCase();
  if (!currentPage) {
    currentPage = 'index.html';
  } else if (!currentPage.includes('.')) {
    currentPage += '.html';
  }

  // Get chapter number from menuItems array
  const chapterNumber = menuItems.findIndex(item => item.href.toLowerCase() === currentPage) + 1;

  // Counter for subheadings within the current page
  let h2Counter = 0;
  let h3Counters = {};  // Object to store H3 counters for each H2

  // Generate the page menu
  let menuContent = '<div class="menu-toggle" style="margin-top: 20px;"><i class="bi bi-x"></i></div>';
  menuContent += '<ul class="list-unstyled" style="margin-top: 20px;">';
  
  headings.forEach(heading => {
    const tagName = heading.tagName.toLowerCase();
    const indentClass = {
      'h1': 'pl-0',
      'h2': 'pl-3',
      'h3': 'pl-5'
    }[tagName];

    let numberPrefix = '';
    
    // Reset numbering for each new page
    if (tagName === 'h1') {
      h2Counter = 0;
      h3Counters = {};
      numberPrefix = chapterNumber + ' ';  // Add chapter number to h1
    } else if (tagName === 'h2') {
      h2Counter++;
      h3Counters[h2Counter] = 0;
      numberPrefix = chapterNumber + '.' + h2Counter + ' ';  // Add chapter number to h2
    } else if (tagName === 'h3') {
      const currentH2 = h2Counter;
      h3Counters[currentH2] = (h3Counters[currentH2] || 0) + 1;
      numberPrefix = chapterNumber + '.' + h2Counter + '.' + h3Counters[currentH2] + ' ';  // Add chapter number to h3
    }

    // Remove any existing numbers from the heading text
    let headingText = heading.innerText.replace(/^\d+(\.\d+)*\s+/, '');
    
    const id = headingText.replace(/\s+/g, '-').toLowerCase();
    heading.id = id;
    
    // Update the heading in the document
    heading.innerHTML = numberPrefix + headingText;

    menuContent += `<li class="${indentClass}" style="margin-bottom: 10px;">
                      <a href="#${id}">${numberPrefix}${headingText}</a>
                    </li>`;
  });
  menuContent += '</ul>';
  
  if (pageMenu) {
    pageMenu.innerHTML = menuContent;
  }

  // Menu toggle functionality
  const menuToggle = document.querySelector('#page-menu .menu-toggle');
  
  menuToggle?.addEventListener('click', function() {
    document.body.classList.add('menu-hidden');
  });

  menuIcon?.addEventListener('click', function() {
    document.body.classList.remove('menu-hidden');
  });
});