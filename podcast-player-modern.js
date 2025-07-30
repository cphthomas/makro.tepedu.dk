document.addEventListener('DOMContentLoaded', function() {
    const playerContainers = document.querySelectorAll('.podcast-player-modern');

    playerContainers.forEach(container => {
        const audioEl = container.querySelector('audio');
        const waveformEl = container.querySelector('.waveform-container');
        const playBtn = container.querySelector('.play-pause-button');
        const currentTimeEl = container.querySelector('.current-time');
        // const totalDurationEl = container.querySelector('.total-duration'); // Removed as per user request
        const speedControl = container.querySelector('.speed-control-modern');
        const podcastIcon = container.querySelector('.podcast-icon');
        const progressBarContainer = container.querySelector('.progress-bar-container');
        const progressBar = container.querySelector('.progress-bar');

        if (!audioEl || !waveformEl || !playBtn || !currentTimeEl || !speedControl || !podcastIcon || !progressBarContainer || !progressBar) {
            console.error('One or more podcast player elements are missing.');
            return;
        }

        const wavesurfer = WaveSurfer.create({
            container: waveformEl,
            waveColor: 'rgba(108, 117, 125, 0.2)', // Lighter grey for the background wave
            progressColor: '#FF8C00', // Orange like the progress bar
            cursorColor: 'transparent',
            barWidth: 3,
            barRadius: 5, // More rounded bars
            responsive: true,
            height: 80, // A bit taller to look more impressive
            normalize: true,
            media: audioEl,
            barGap: 2 // Add a small gap between bars
        });

        // Explicitly load the audio to ensure duration is available
        wavesurfer.load(audioEl.src);

        wavesurfer.on('ready', function () {
            // Removed total duration update as per user request
            // const duration = wavesurfer.getDuration();
            // console.log('Wavesurfer ready. Duration:', duration);
            // if (duration > 0) {
            //     totalDurationEl.textContent = formatTime(duration);
            // } else {
            //     console.warn('Wavesurfer duration not available on ready, retrying...');
            //     setTimeout(() => {
            //         const delayedDuration = wavesurfer.getDuration();
            //         console.log('Wavesurfer delayed duration:', delayedDuration);
            //         totalDurationEl.textContent = formatTime(delayedDuration);
            //     }, 500);
            // }
        });

        wavesurfer.on('audioprocess', function () {
            currentTimeEl.textContent = formatTime(wavesurfer.getCurrentTime());
            const progress = wavesurfer.getCurrentTime() / wavesurfer.getDuration();
            progressBar.style.width = `${progress * 100}%`;
        });

        playBtn.addEventListener('click', function () {
            wavesurfer.playPause();
            const isPlaying = wavesurfer.isPlaying();
            playBtn.innerHTML = isPlaying ? '<i class="bi bi-pause-fill"></i>' : '<i class="bi bi-play-fill"></i>';
            playBtn.classList.toggle('is-playing', isPlaying);
            podcastIcon.classList.toggle('is-playing', isPlaying);
        });

        progressBarContainer.addEventListener('click', function(e) {
            const bounds = this.getBoundingClientRect();
            const x = e.clientX - bounds.left;
            const width = bounds.width;
            const progress = x / width;
            wavesurfer.seekTo(progress);
        });

        let currentSpeed = 1.0;
        const speeds = [1.0, 1.25, 1.5, 2.0, 0.75]; // Added 0.75 for slower speed

        // Function to update the speed button's color based on speed
        function updateSpeedButtonColor(speed) {
            let color;
            switch (speed) {
                case 0.75:
                    color = '#6c757d'; // Grey for slower
                    break;
                case 1.0:
                    color = '#adb5bd'; // Lighter grey for normal (instead of blue)
                    break;
                case 1.25:
                    color = '#ffc107'; // Yellow/Orange for faster
                    break;
                case 1.5:
                    color = '#fd7e14'; // Orange-red for even faster
                    break;
                case 2.0:
                    color = '#dc3545'; // Red for fastest
                    break;
                default:
                    color = '#6c757d'; // Default to grey
            }
            speedControl.style.backgroundColor = color;
        }

        // Initialize button color
        updateSpeedButtonColor(currentSpeed);

        speedControl.addEventListener('click', () => {
            const currentIndex = speeds.indexOf(currentSpeed);
            const nextIndex = (currentIndex + 1) % speeds.length;
            currentSpeed = speeds[nextIndex];
            
            wavesurfer.setPlaybackRate(currentSpeed);
            updateSpeedButtonColor(currentSpeed); // Update color after speed change

            speedControl.classList.add('speed-changing');
            setTimeout(() => {
                speedControl.querySelector('.speed-text').textContent = `${currentSpeed}x`;
                speedControl.classList.remove('speed-changing');
            }, 150);
        });

        function formatTime(time) {
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60).toString().padStart(2, '0');
            return `${minutes}:${seconds}`;
        }
    });
});