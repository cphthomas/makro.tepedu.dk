document.addEventListener('DOMContentLoaded', function() {
    const playerContainers = document.querySelectorAll('.podcast-player-modern');

    playerContainers.forEach(container => {
        const audioEl = container.querySelector('audio');
        const waveformEl = container.querySelector('.waveform-container');
        const playBtn = container.querySelector('.play-pause-button');
        const currentTimeEl = container.querySelector('.current-time');
        const totalDurationEl = container.querySelector('.total-duration');
        const speedSelector = container.querySelector('.podcast-speed-selector'); // This is not in the new HTML, but I'll leave it for now
        const forwardBtn = container.querySelector('.forward-button');
        const backwardBtn = container.querySelector('.backward-button');

        if (!audioEl || !waveformEl || !playBtn || !currentTimeEl || !totalDurationEl || !forwardBtn || !backwardBtn) {
            console.error('One or more podcast player elements are missing.');
            return;
        }

        const wavesurfer = WaveSurfer.create({
            container: waveformEl,
            waveColor: 'rgba(0, 123, 255, 0.2)',
            progressColor: 'rgba(0, 123, 255, 0.7)',
            cursorColor: '#343a40',
            barWidth: 3,
            barRadius: 3,
            responsive: true,
            height: 100,
            normalize: true,
            media: audioEl,
        });

        wavesurfer.on('ready', function () {
            totalDurationEl.textContent = formatTime(wavesurfer.getDuration());
        });

        wavesurfer.on('audioprocess', function () {
            currentTimeEl.textContent = formatTime(wavesurfer.getCurrentTime());
        });

        playBtn.addEventListener('click', function () {
            wavesurfer.playPause();
            const isPlaying = wavesurfer.isPlaying();
            playBtn.innerHTML = isPlaying ? '<i class="bi bi-pause-fill"></i>' : '<i class="bi bi-play-fill"></i>';
        });

        forwardBtn.addEventListener('click', () => {
            wavesurfer.skipForward(10);
        });

        backwardBtn.addEventListener('click', () => {
            wavesurfer.skipBackward(10);
        });

        if (speedSelector) {
            speedSelector.addEventListener('change', function (e) {
                wavesurfer.setPlaybackRate(e.target.value);
            });
        }

        function formatTime(time) {
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60).toString().padStart(2, '0');
            return `${minutes}:${seconds}`;
        }
    });
});