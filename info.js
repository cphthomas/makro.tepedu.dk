// Info popup functionality
document.addEventListener('DOMContentLoaded', function () {
    // Tilføj styling til head
    const style = document.createElement('style');
    style.textContent = `
        .info-icon-container {
            position: relative;
            display: inline-block;
            margin-left: 10px;
        }
        
        .info-popup {
            visibility: hidden;
            width: 180px; /* Set to 60% of 300px */
            background-color: #fff;
            color: #333;
            text-align: left;
            border-radius: 0;
            padding: 15px;
            position: absolute;
            z-index: 1000;
            top: 40px;
            left: 50%;
            transform: translateX(-50%);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            opacity: 0;
            transition: opacity 0.3s, visibility 0.3s;
            font-size: 0.9rem;
            border: 1px solid #ddd;
        }
        
        .info-popup img {
            max-width: 100%; /* Ensure image fits within the popup */
            height: auto; /* Maintain aspect ratio */
            display: block; /* Remove extra space below image */
            margin: 10px auto; /* Center image and add some vertical spacing */
        }
        
        .info-icon-container:hover .info-popup,
        .info-popup.show {
            visibility: visible;
            opacity: 1;
        }
        
        .info-icon {
            color: #000;
            cursor: pointer;
            font-size: 1.2rem;
            background-color: transparent;
            border-radius: 50%;
            padding: 2px;
        }
        
        .info-icon:hover {
            color: #333;
        }
    `;
    document.head.appendChild(style);

    // Find navbar-brandet (home-ikonet)
    const navbarBrand = document.querySelector('.navbar-brand');

    if (navbarBrand) {
        // Opret info-ikonet og container
        const infoContainer = document.createElement('div');
        infoContainer.className = 'info-icon-container';

        const infoIcon = document.createElement('i');
        infoIcon.className = 'bi bi-info-circle info-icon';

        const infoPopup = document.createElement('div');
        infoPopup.className = 'info-popup';
        infoPopup.id = 'infoPopup';

        // Tilføj indhold til popup
        infoPopup.innerHTML = `
            <h5>Om denne bog</h5>
            <small>Denne bog er udviklet af:
            <img src="images/hanke.avif" alt="Thomas Hanke">
            Advokat Thomas Hanke <br>Redaktør<br>&<br>
            <img src="images/mig.jpg" alt="Thomas Petersen">Lektor Thomas Petersen
            <br><br>
            <p>I udviklingen er der benyttet kunstig intelligens både til kodningen af selve strukturen i form af navigation, js-, html- og css-filer, samt indhold og eksempler.</p>
            <p>Bogen er udviklet til undervisningsbrug og er frit tilgængelig. Bogen bør ikke benyttes som grundlag for juridiske beslutninger, den kan således ikke erstatte juridisk rådgivning fra en advokat.
            </p>
           
            </small>
        `;

        // Sæt elementerne sammen
        infoContainer.appendChild(infoIcon);
        infoContainer.appendChild(infoPopup);

        // Indsæt efter navbar-brandet
        navbarBrand.parentNode.insertBefore(infoContainer, navbarBrand.nextSibling);

        // Tilføj event listeners
        infoIcon.addEventListener('click', function (e) {
            e.stopPropagation();
            infoPopup.classList.toggle('show');
        });

        document.addEventListener('click', function (e) {
            if (infoPopup.classList.contains('show')) {
                infoPopup.classList.remove('show');
            }
        });

        infoPopup.addEventListener('click', function (e) {
            e.stopPropagation();
        });
    }
}); 