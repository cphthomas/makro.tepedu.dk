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
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .info-popup img {
            width: 100%;
            height: 120px;
            object-fit: cover;
            object-position: center top;
            display: block;
            margin: 10px auto;
        }
        
        .info-popup img[alt="Thomas Hanke"] {
            object-position: center top;
        }
        
        .info-popup img[alt="Theis Bjerken"] {
            object-position: center 35%;
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
            transition: color 0.3s ease;
        }
        
        .info-icon:hover {
            color: #333;
        }
        
        /* Dark theme support */
        [data-theme="dark"] .info-icon {
            color: #ffffff !important;
        }
        
        [data-theme="dark"] .info-icon:hover {
            color: #e0e0e0 !important;
        }
        
        [data-theme="dark"] .info-popup {
            background-color: #000000 !important;
            color: #ffffff !important;
            border-color: rgba(255, 255, 255, 0.2) !important;
            box-shadow: 0 5px 15px rgba(255, 255, 255, 0.1) !important;
        }
        
        [data-theme="dark"] .info-popup h6 {
            color: #ffffff !important;
        }
        
        [data-theme="dark"] .info-popup small {
            color: #e0e0e0 !important;
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

        // Hent nuværende år for APA reference
        const currentYear = new Date().getFullYear();
        
        // Tilføj indhold til popup
        infoPopup.innerHTML = `
            <h6>Om onlinebogen</h6>
            <small>Denne onlinebog er udviklet af:
            <img src="images/tb.jpeg" alt="Theis Bjerken">
            Lektor Theis Bjerken <br>Redaktør<br>&<br>
            <img src="images/mig.jpg" alt="Thomas Petersen">Lektor Thomas Petersen
              <br><br>
            <p>Onlinebogen er udviklet med anvendelse af kunstig intelligens til udformning af teknisk struktur (navigation, HTML, CSS, JavaScript) samt fagligt indhold og eksempelmateriale.</p>
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