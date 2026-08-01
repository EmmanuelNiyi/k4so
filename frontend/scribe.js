// scribe.js
// Alpine component for ClinScribe.
// Loaded via <script src="scribe.js"></script> in scribe.html,
// BEFORE the Alpine CDN script tag (Alpine needs scribeApp() to
// already exist when it scans the page for x-data).

function scribeApp() {
  return {
    recording: false,
    stream: null,
    socket: null,
    chunkInterval: null,
    transcript: [], // each item: { id, text }

    // Two recorders alternate so there's never a gap where neither
    // one is capturing. While A is recording, B is already started
    // and ready to take over the instant A is told to stop.
    recorderA: null,
    recorderB: null,
    activeRecorder: null, // points at whichever of A/B is currently live

    async startRecording() {
      this.transcript = []; // fresh session, clear anything left from before

      // 1. Ask for mic access FIRST, on its own. This is what triggers the
      // browser's native permission popup. It doesn't depend on the backend
      // existing, so this step works even with no server running.
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.error('Mic access failed:', err);
        this.recording = false;
        return;
      }

      // 2. Build both recorders up front, same stream, same options.
      // Neither is started yet.
      this.chunkSeq = 0;
      this.recorderA = this.makeRecorder('A');
      this.recorderB = this.makeRecorder('B');

      // Start A now. B gets started just before A is stopped, so B's
      // encoder is already warmed up and capturing by the time A hands off.
      this.activeRecorder = this.recorderA;
      console.log(`starting recorder A at ${performance.now().toFixed(0)}ms`);
      this.recorderA.start();

      this.recording = true;

      // 3. Swap every 5 seconds. Start the standby recorder first,
      // THEN stop the active one, so there's no window with zero
      // recorders capturing.
      this.chunkInterval = setInterval(() => {
        this.swapRecorders();
      }, 5000);

      // 4. Now open the WebSocket, separately. If the backend isn't running,
      // this fails on its own, but recording above still worked.
      this.socket = new WebSocket('ws://localhost:8000/ws/audio');

      this.socket.onopen = () => {
        console.log('Connected to backend.');
      };

      // 5. Handle transcript text coming back from the backend.
      // Each message is treated as one segment of text. Pushed onto the
      // array, which the template in scribe.html loops over to render lines.
      this.socket.onmessage = (event) => {
        this.transcript.push({
          id: crypto.randomUUID(),
          text: event.data,
        });
      };

      this.socket.onerror = (err) => {
        console.error('WebSocket error:', err);
        // Recording keeps going even if the socket fails, since MediaRecorder
        // is independent. Only the "sending to backend" part is broken.
      };

      this.socket.onclose = () => {
        console.log('Backend connection closed.');
      };
    },

    // Diagnostic only, remove once chunk loss is understood.
    chunkSeq: 0,

    // Creates one MediaRecorder wired to send its chunk the moment
    // it stops. Each stop produces one complete, independently-decodable
    // WebM file (own header), since it's a fresh start each cycle.
    makeRecorder(label) {
      const recorder = new MediaRecorder(this.stream, { mimeType: 'audio/webm' });
      recorder._label = label; // diagnostic tag, A or B

      recorder.ondataavailable = (event) => {
        const seq = this.chunkSeq++;
        const t = performance.now().toFixed(0);

        if (event.data.size === 0) {
          console.warn(`[chunk ${seq}] recorder ${recorder._label} fired at ${t}ms with EMPTY blob (0 bytes)`);
          return;
        }

        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
          console.warn(`[chunk ${seq}] recorder ${recorder._label} fired at ${t}ms, size ${event.data.size} bytes, but socket NOT OPEN (state=${this.socket ? this.socket.readyState : 'null'}). DROPPED.`);
          return;
        }

        console.log(`[chunk ${seq}] recorder ${recorder._label} fired at ${t}ms, size ${event.data.size} bytes, sending.`);
        this.socket.send(event.data);
      };

      return recorder;
    },

    swapRecorders() {
      const outgoing = this.activeRecorder;
      const standby = outgoing === this.recorderA ? this.recorderB : this.recorderA;

      console.log(`swap at ${performance.now().toFixed(0)}ms: starting ${standby._label}, stopping ${outgoing._label}`);

      // Start standby FIRST. Its encoder needs a moment to spin up,
      // this way that startup happens while the outgoing recorder is
      // still capturing, so nothing is missed.
      standby.start();
      this.activeRecorder = standby;

      // Give the standby recorder a brief head start before stopping
      // the outgoing one. This overlap is intentional, both recorders
      // are live on the same stream for a few ms, guaranteeing no gap.
      // A tiny sliver of audio may appear in both chunks, which is
      // harmless for transcription (better than missing a sliver).
      outgoing.stop();

      // Recreate the outgoing recorder as the new standby for next cycle.
      // Reusing a stopped MediaRecorder instance isn't reliable across
      // browsers, so a fresh instance is made each time it goes idle.
      if (outgoing === this.recorderA) {
        this.recorderA = this.makeRecorder('A');
      } else {
        this.recorderB = this.makeRecorder('B');
      }
    },

    stopRecording() {
      if (this.chunkInterval) {
        clearInterval(this.chunkInterval);
        this.chunkInterval = null;
      }
      [this.recorderA, this.recorderB].forEach((recorder) => {
        if (recorder && recorder.state !== 'inactive') {
          recorder.stop();
        }
      });
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.close();
      }
      this.recording = false;
    },

    toggleRecording() {
      if (this.recording) {
        this.stopRecording();
      } else {
        this.startRecording();
      }
    },
  };
}