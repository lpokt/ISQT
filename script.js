// Elements for Drag and Drop & File Upload Logic
const dropZone = document.getElementById('dropZone');
const audioElement = document.getElementById('audioElement');
const audioFileInput = document.getElementById('audioFileInput');
const audioCanvas = document.getElementById('Audio_waveform');
const audioCanvasContext = audioCanvas.getContext('2d');

// Elements for Recording Logic
let mediaRecorder;
let audioChunks = [];
const recordedAudio = document.getElementById('recordedAudio');
const startRecordingButton = document.getElementById('startRecording');
const stopRecordingButton = document.getElementById('stopRecording');
const saveRecordingButton = document.getElementById('saveRecording');
const recordCanvas = document.getElementById('waveform');
const recordCanvasContext = recordCanvas.getContext('2d');

// Elements for Playback Logic
const playbackSpeedSlider = document.getElementById('playbackSpeed');
const speedDisplay = document.getElementById('speedDisplay');
const localStorageKey = 'preferredPlaybackSpeed';

// Elements for recorded audio playback speed control
const recordPlaybackSpeedSlider = document.getElementById('recordPlaybackSpeed');
const recordSpeedDisplay = document.getElementById('recordSpeedDisplay');
const recordedAudioStorageKey = 'preferredRecordedPlaybackSpeed';

// Elements for Volume Control
const volumeControlSlider = document.getElementById('volumeControl');
const volumeDisplay = document.getElementById('volumeDisplay');

// Elements for Recorded Audio Volume Control
const recordVolumeControlSlider = document.getElementById('recordVolumeControl');
const recordVolumeDisplay = document.getElementById('recordVolumeDisplay');

// Web Audio API context will be created upon user interaction
let audioContext;

// Declare global variables for recorded audio visualization
let recordedAudioSource;
let recordedAudioAnalyser;
let recordedAudioAnimationId;

// Audio Recording Button
const recordPlayButton = document.getElementById('recordPlayButton');
let isRecordedPlaying = false;

// Function to create AudioContext
function createAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Initialize AudioContext and resume it as early as possible
function initializeAudioContext() {
    createAudioContext();
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Function to set up visualization components for recorded audio
function setupRecordedAudioVisualization() {
    // Ensure AudioContext is ready
    initializeAudioContext();

    if (!recordedAudioSource) {
        recordedAudioSource = audioContext.createMediaElementSource(recordedAudio);
    }

    if (!recordedAudioAnalyser) {
        recordedAudioAnalyser = audioContext.createAnalyser();
        recordedAudioAnalyser.fftSize = 2048;
        recordedAudioSource.connect(recordedAudioAnalyser);
        recordedAudioAnalyser.connect(audioContext.destination);
    }
}

// Function to visualize the recorded audio during playback
function visualizeRecordedAudio() {
    // Visualization setup has already been done in setupRecordedAudioVisualization()
    const dataArray = new Uint8Array(recordedAudioAnalyser.frequencyBinCount);

    function draw() {
        recordedAudioAnimationId = requestAnimationFrame(draw);

        recordedAudioAnalyser.getByteTimeDomainData(dataArray);

        recordCanvasContext.fillStyle = 'white';
        recordCanvasContext.fillRect(0, 0, recordCanvas.width, recordCanvas.height);

        recordCanvasContext.lineWidth = 2;
        recordCanvasContext.strokeStyle = '#000000';
        recordCanvasContext.beginPath();

        const amplitudeScaleFactor = 1.5; // Adjust if needed
        const sliceWidth = recordCanvas.width / dataArray.length;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            const v = (dataArray[i] - 128) / 128.0;
            const y = (v * amplitudeScaleFactor * (recordCanvas.height / 2)) + (recordCanvas.height / 2);

            if (i === 0) {
                recordCanvasContext.moveTo(x, y);
            } else {
                recordCanvasContext.lineTo(x, y);
            }

            x += sliceWidth;
        }

        recordCanvasContext.lineTo(recordCanvas.width, recordCanvas.height / 2);
        recordCanvasContext.stroke();
    }

    draw();
}

// Event listeners for recordedAudio
recordedAudio.addEventListener('loadeddata', () => {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
});

recordedAudio.addEventListener('play', () => {
    // Visualize recorded audio when it starts playing
    visualizeRecordedAudio();
});

recordedAudio.addEventListener('pause', () => {
    if (recordedAudioAnimationId) {
        cancelAnimationFrame(recordedAudioAnimationId);
        recordedAudioAnimationId = null;
        // Optional: Clear the canvas
        recordCanvasContext.clearRect(0, 0, recordCanvas.width, recordCanvas.height);
    }
});

recordedAudio.addEventListener('ended', () => {
    recordPlayButton.textContent = '▶';
    isRecordedPlaying = false;
    if (recordedAudioAnimationId) {
        cancelAnimationFrame(recordedAudioAnimationId);
        recordedAudioAnimationId = null;
        // Optional: Clear the canvas
        recordCanvasContext.clearRect(0, 0, recordCanvas.width, recordCanvas.height);
    }
});

// Function to visualize audio element (drag-and-drop file)
function visualizeAudioElement(audioElement) {
    createAudioContext();
    const track = audioContext.createMediaElementSource(audioElement);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    track.connect(analyser);
    analyser.connect(audioContext.destination); // Connect analyser to the output (speakers)
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function draw() {
        requestAnimationFrame(draw);

        analyser.getByteTimeDomainData(dataArray);

        audioCanvasContext.fillStyle = 'white';
        audioCanvasContext.fillRect(0, 0, audioCanvas.width, audioCanvas.height);

        audioCanvasContext.lineWidth = 2;
        audioCanvasContext.strokeStyle = '#000000';
        audioCanvasContext.beginPath();

        const sliceWidth = audioCanvas.width / dataArray.length;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * audioCanvas.height) / 2;

            if (i === 0) {
                audioCanvasContext.moveTo(x, y);
            } else {
                audioCanvasContext.lineTo(x, y);
            }

            x += sliceWidth;
        }

        audioCanvasContext.lineTo(audioCanvas.width, audioCanvas.height / 2);
        audioCanvasContext.stroke();
    }

    draw();
}

// Function to visualize recording audio
function visualizeRecording(stream) {
    createAudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function draw() {
        requestAnimationFrame(draw);

        analyser.getByteTimeDomainData(dataArray);

        recordCanvasContext.fillStyle = 'white';
        recordCanvasContext.fillRect(0, 0, recordCanvas.width, recordCanvas.height);

        recordCanvasContext.lineWidth = 2;
        recordCanvasContext.strokeStyle = '#000000';
        recordCanvasContext.beginPath();

        const amplitudeScaleFactor = 1.5; // Adjust this factor to make the waveform taller
        const sliceWidth = recordCanvas.width / dataArray.length;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            const v = (dataArray[i] - 128) / 128.0; // Center the waveform vertically
            const y = (v * amplitudeScaleFactor * (recordCanvas.height / 2)) + (recordCanvas.height / 2);

            if (i === 0) {
                recordCanvasContext.moveTo(x, y);
            } else {
                recordCanvasContext.lineTo(x, y);
            }

            x += sliceWidth;
        }

        recordCanvasContext.lineTo(recordCanvas.width, recordCanvas.height / 2);
        recordCanvasContext.stroke();
    }

    draw();
}

// Add click functionality to dropZone
dropZone.addEventListener('click', () => {
    audioFileInput.click();  // Trigger the hidden file input click
});

// Drag-and-drop functionality
dropZone.addEventListener('dragover', (event) => {
    event.preventDefault(); // Prevent default behavior to allow drop
    dropZone.style.borderColor = 'green';
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = '#aaa';
});

dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.style.borderColor = '#aaa';

    const file = event.dataTransfer.files[0];
    handleAudioFile(file);
});

audioFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    handleAudioFile(file);
});

function handleAudioFile(file) {
    if (file && file.type.startsWith('audio')) {
        const url = URL.createObjectURL(file);
        audioElement.src = url;

        // Force the audio element to load the new file
        audioElement.load(); 

        // Display the uploaded file name in the drop zone
        dropZone.textContent = `${file.name}`;

        // Apply the current playback speed from the slider or stored value
        const storedSpeed = localStorage.getItem(localStorageKey);
        const speed = storedSpeed ? parseFloat(storedSpeed) : 1.0;
        audioElement.playbackRate = speed;
        playbackSpeedSlider.value = speed;
        speedDisplay.textContent = `${speed}x`;

        // Apply the current volume setting
        const storedVolume = localStorage.getItem('preferredVolume');
        const volume = storedVolume ? parseFloat(storedVolume) : 1.0;
        audioElement.volume = volume;
        volumeControlSlider.value = volume;
        volumeDisplay.textContent = `${Math.round(volume * 100)}%`;

        // Resume the AudioContext if it is suspended
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('Audio context resumed.');
            });
        }

        // Start visualizing the drag-and-drop audio file when it plays
        audioElement.addEventListener('play', () => {
            visualizeAudioElement(audioElement);
        });

        audioElement.addEventListener('ended', () => {
            // Optional: Clear the canvas when audio ends
            audioCanvasContext.clearRect(0, 0, audioCanvas.width, audioCanvas.height);
        });

        // Autoplay the audio file after loading
        audioElement.play().catch(err => console.error('Error playing audio:', err));
    } else {
        alert('Please upload a valid audio file.');
    }
}

// Recording functionality
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    startRecordingButton.addEventListener('click', () => {
        // Must resume the AudioContext inside user-initiated event
        initializeAudioContext();

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                // Explicitly set MIME type for MediaRecorder
                let options = { mimeType: 'audio/webm;codecs=opus' };
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    console.warn(`${options.mimeType} is not supported, trying 'audio/ogg; codecs=opus'.`);
                    options = { mimeType: 'audio/ogg; codecs=opus' };
                    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                        console.warn(`${options.mimeType} is not supported, using default codec.`);
                        options = {};
                    }
                }

                mediaRecorder = new MediaRecorder(stream, options);

                audioChunks = []; // Reset audio chunks

                // Pre-buffering the audio stream by a small delay
                const startDelay = 200; // Adjust delay in milliseconds if necessary
                setTimeout(() => {
                    mediaRecorder.start();
                    console.log("Recording started after delay");

                    startRecordingButton.disabled = true;
                    stopRecordingButton.disabled = false;
                    saveRecordingButton.disabled = true;

                    visualizeRecording(stream); // Start waveform visualization for recording
                }, startDelay);

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data && event.data.size > 0) {
                        audioChunks.push(event.data);
                        console.log("Audio chunk collected:", event.data);
                    } else {
                        console.warn("Empty audio data received.");
                    }
                };

                mediaRecorder.onstop = () => {
                    console.log("Recording stopped, processing data.");
                    console.log("Audio chunks collected:", audioChunks.length);
                    const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    recordedAudio.src = audioUrl;

                    // Apply the current volume setting
                    const storedVolume = localStorage.getItem('preferredRecordedVolume');
                    const volume = storedVolume ? parseFloat(storedVolume) : 1.0;
                    recordedAudio.volume = volume;
                    recordVolumeControlSlider.value = volume;
                    recordVolumeDisplay.textContent = `${Math.round(volume * 100)}%`;

                    // Apply the current playback speed
                    const storedSpeed = localStorage.getItem(recordedAudioStorageKey);
                    const speed = storedSpeed ? parseFloat(storedSpeed) : 1.0;
                    recordedAudio.playbackRate = speed;
                    recordPlaybackSpeedSlider.value = speed;
                    recordSpeedDisplay.textContent = `${speed}x`;

                    console.log("Recording saved and available for playback");

                    // Set up AudioContext and visualization components
                    setupRecordedAudioVisualization();

                    // Ensure the recorded audio is ready to play
                    recordedAudio.load();
                };

                mediaRecorder.onerror = (event) => {
                    console.error("MediaRecorder error:", event.error);
                };
            })
            .catch(err => {
                console.error("Error accessing microphone:", err);
                alert("Error accessing microphone. Please check your permissions.");
            });
    });

    stopRecordingButton.addEventListener('click', () => {
        mediaRecorder.stop();
        console.log("Recording stopped by user.");

        // Stop all media tracks to release the microphone
        mediaRecorder.stream.getTracks().forEach(track => track.stop());

        stopRecordingButton.disabled = true;
        startRecordingButton.disabled = false;
        saveRecordingButton.disabled = false;

        // Optional: Clear the canvas when recording stops
        recordCanvasContext.clearRect(0, 0, recordCanvas.width, recordCanvas.height);
    });

    saveRecordingButton.addEventListener('click', () => {
        const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.href = audioUrl;
        a.download = 'recording.mp3';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        console.log("Recording downloaded as 'recording.mp3'");
    });
} else {
    alert('Your browser does not support audio recording.');
}

// Function to initialize recorded audio playback speed from localStorage
function initializeRecordedPlaybackSpeed() {
    const storedSpeed = localStorage.getItem(recordedAudioStorageKey);
    const speed = storedSpeed ? parseFloat(storedSpeed) : 1.0;
    recordedAudio.playbackRate = speed;
    recordPlaybackSpeedSlider.value = speed;
    recordSpeedDisplay.textContent = `${speed}x`;
    recordSpeedDisplay.style.color = '#000000';
}

// Store the preferred playback speed for recorded audio in localStorage when the slider changes
recordPlaybackSpeedSlider.addEventListener('input', () => {
    const speed = recordPlaybackSpeedSlider.value;
    recordedAudio.playbackRate = speed;
    recordSpeedDisplay.textContent = `${speed}x`;
    localStorage.setItem(recordedAudioStorageKey, speed);
});

// Function to initialize volume controls from localStorage
function initializeVolumeControls() {
    // Initialize volume for drag-and-drop audio
    const storedVolume = localStorage.getItem('preferredVolume');
    const volume = storedVolume ? parseFloat(storedVolume) : 1.0;
    audioElement.volume = volume;
    volumeControlSlider.value = volume;
    volumeDisplay.textContent = `${Math.round(volume * 100)}%`;

    // Initialize volume for recorded audio
    const storedRecordedVolume = localStorage.getItem('preferredRecordedVolume');
    const recordedVolume = storedRecordedVolume ? parseFloat(storedRecordedVolume) : 1.0;
    recordedAudio.volume = recordedVolume;
    recordVolumeControlSlider.value = recordedVolume;
    recordVolumeDisplay.textContent = `${Math.round(recordedVolume * 100)}%`;
}

// Store the preferred volume in localStorage when the slider changes
volumeControlSlider.addEventListener('input', () => {
    const volume = volumeControlSlider.value;
    audioElement.volume = volume;
    volumeDisplay.textContent = `${Math.round(volume * 100)}%`;
    localStorage.setItem('preferredVolume', volume);
});

// Store the preferred volume for recorded audio in localStorage when the slider changes
recordVolumeControlSlider.addEventListener('input', () => {
    const volume = recordVolumeControlSlider.value;
    recordedAudio.volume = volume;
    recordVolumeDisplay.textContent = `${Math.round(volume * 100)}%`;
    localStorage.setItem('preferredRecordedVolume', volume);
});

const playButton = document.getElementById('playButton');
let isPlaying = false;

// Add event listener for the play button
playButton.addEventListener('click', () => {
    if (isPlaying) {
        audioElement.pause();
        playButton.textContent = '▶';
    } else {
        audioElement.play();
        playButton.textContent = '⏸︎';
    }
    isPlaying = !isPlaying;
});

// Play and pause the audio along with visualizing the waveform
audioElement.addEventListener('play', () => {
    visualizeAudioElement(audioElement);
});

audioElement.addEventListener('pause', () => {
    playButton.textContent = '▶';
    isPlaying = false;
});

audioElement.addEventListener('ended', () => {
    playButton.textContent = '▶';
    isPlaying = false;
});

// Event listener for the recordPlayButton
recordPlayButton.addEventListener('click', () => {
    if (isRecordedPlaying) {
        // Pause and reset the audio to the beginning
        recordedAudio.pause();
        recordedAudio.currentTime = 0;
        recordPlayButton.textContent = '▶';
        isRecordedPlaying = false;

        // Stop visualization
        if (recordedAudioAnimationId) {
            cancelAnimationFrame(recordedAudioAnimationId);
            recordedAudioAnimationId = null;
            recordCanvasContext.clearRect(0, 0, recordCanvas.width, recordCanvas.height);
        }
    } else {
        // Play the audio from the beginning
        recordedAudio.currentTime = 0;
        recordedAudio.play();
        recordPlayButton.textContent = '⏸︎';
        isRecordedPlaying = true;

        // Start visualization
        visualizeRecordedAudio();
    }
});

// Resume AudioContext when the page gains focus (optional, improves responsiveness)
window.addEventListener('focus', () => {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
});

// Initialize recorded playback speed and volume controls
initializeRecordedPlaybackSpeed();
initializeVolumeControls();
