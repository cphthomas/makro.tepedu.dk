document.addEventListener('DOMContentLoaded', function() {
    const playerContainers = document.querySelectorAll('.podcast-player-modern');

    playerContainers.forEach(container => {
        const audioEl = container.querySelector('audio');
        const waveformEl = container.querySelector('.waveform-container');
        const playBtn = container.querySelector('.play-pause-button');
        const currentTimeEl = container.querySelector('.current-time');
        const totalDurationEl = container.querySelector('.total-duration');
        const speedControl = container.querySelector('.speed-control-modern');
        const podcastIcon = container.querySelector('.podcast-icon');
        const progressBar = container.querySelector('.progress-bar');

        if (!audioEl || !waveformEl || !playBtn || !currentTimeEl || !totalDurationEl || !speedControl || !podcastIcon || !progressBar) {
            console.error('One or more podcast player elements are missing.');
            return;
        }

        const wavesurfer = WaveSurfer.create({
            container: waveformEl,
            waveColor: 'rgba(0, 123, 255, 0.1)',
            progressColor: 'rgba(0, 123, 255, 0.7)',
            cursorColor: 'transparent',
            barWidth: 2,
            barRadius: 3,
            responsive: true,
            height: 60,
            normalize: true,
            media: audioEl,
        });

        wavesurfer.on('ready', function () {
            totalDurationEl.textContent = formatTime(wavesurfer.getDuration());
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

        let currentSpeed = 1.0;
        const speeds = [1.0, 1.25, 1.5, 2.0, 0.75];

        speedControl.addEventListener('click', () => {
            const currentIndex = speeds.indexOf(currentSpeed);
            const nextIndex = (currentIndex + 1) % speeds.length;
            currentSpeed = speeds[nextIndex];
            
            wavesurfer.setPlaybackRate(currentSpeed);

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