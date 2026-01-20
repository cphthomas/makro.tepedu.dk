/**
 * Glossary Tooltip Functionality
 * Handles showing a discrete popup with definitions of legal terms.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'glossary-tooltip';
    document.body.appendChild(tooltip);

    let hideTimeout;

    const terms = document.querySelectorAll('.legal-term');

    terms.forEach(termElement => {
        termElement.addEventListener('mouseenter', (e) => {
            clearTimeout(hideTimeout);

            const term = termElement.textContent.trim();
            const definition = termElement.getAttribute('data-definition');
            const example = termElement.getAttribute('data-example');
            const slug = termElement.getAttribute('data-slug');

            tooltip.innerHTML = `
                <h4>${term}</h4>
                <div class="definition">${definition}</div>
                ${example ? `<div class="example"><strong>Eksempel:</strong> ${example}</div>` : ''}
                <div class="footer" style="cursor: pointer;" onclick="window.location.href='kapitel9.html#term-${slug}'">
                    <span>Læs mere i ordlisten</span>
                    <i class="bi bi-arrow-right"></i>
                </div>
            `;

            // Allow transitions to calculate height
            tooltip.style.visibility = 'hidden';
            tooltip.classList.add('show');

            const rect = termElement.getBoundingClientRect();
            const tooltipHeight = tooltip.offsetHeight;
            const tooltipWidth = tooltip.offsetWidth;

            let top = rect.top - tooltipHeight - 15;
            let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);

            // Adjust if out of bounds (top)
            if (top < 0) {
                top = rect.bottom + 15;
            }

            // Adjust if out of bounds (left)
            if (left < 10) left = 10;
            if (left + tooltipWidth > window.innerWidth - 10) {
                left = window.innerWidth - tooltipWidth - 10;
            }

            tooltip.style.top = `${top + window.scrollY}px`;
            tooltip.style.left = `${left + window.scrollX}px`;
            tooltip.style.visibility = 'visible';
        });

        termElement.addEventListener('mouseleave', () => {
            hideTimeout = setTimeout(() => {
                tooltip.classList.remove('show');
            }, 300);
        });
    });

    // Keep tooltip open when hovering over it
    tooltip.addEventListener('mouseenter', () => {
        clearTimeout(hideTimeout);
    });

    tooltip.addEventListener('mouseleave', () => {
        tooltip.classList.remove('show');
    });
});
