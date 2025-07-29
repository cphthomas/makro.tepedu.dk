document.addEventListener('DOMContentLoaded', function() {
    const podcastPlayer = document.querySelector('.podcast-player');
    if (!podcastPlayer) {
        return;
    }

    const audioEl = podcastPlayer.querySelector('audio');
    const waveformEl = podcastPlayer.querySelector('.podcast-waveform');
    const playBtn = podcastPlayer.querySelector('.podcast-play-button');
    const currentTimeEl = podcastPlayer.querySelector('.current-time');
    const totalDurationEl = podcastPlayer.querySelector('.total-duration');
    const speedSelector = podcastPlayer.querySelector('.podcast-speed-selector');

    if (!audioEl || !waveformEl || !playBtn || !currentTimeEl || !totalDurationEl || !speedSelector) {
        console.error('Podcast player element(s) not found.');
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

    speedSelector.addEventListener('change', function (e) {
        wavesurfer.setPlaybackRate(e.target.value);
    });

    function formatTime(time) {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    }
});