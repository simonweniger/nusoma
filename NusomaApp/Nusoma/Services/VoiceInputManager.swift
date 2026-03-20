// VoiceInputManager.swift — Voice-to-text using macOS Speech framework
// Phase 4 — Provides push-to-talk and toggle recording for voice input
//
// Uses SFSpeechRecognizer for on-device transcription (macOS 13+).
// Falls back gracefully when permission is denied or unavailable.

import Foundation
import Speech
import AVFoundation

@Observable
class VoiceInputManager {
    enum RecordingState: Equatable {
        case idle
        case requestingPermission
        case recording
        case processing
        case error(String)
    }

    var state: RecordingState = .idle
    var transcript: String = ""
    var isAvailable: Bool = false

    // Callback fired when transcription completes or updates
    var onTranscript: ((String) -> Void)?

    private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()

    init() {
        checkAvailability()
    }

    // MARK: - Availability

    private func checkAvailability() {
        isAvailable = speechRecognizer?.isAvailable ?? false
    }

    // MARK: - Permissions

    func requestPermissions() async -> Bool {
        state = .requestingPermission

        // Speech recognition permission
        let speechAuthorized = await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status == .authorized)
            }
        }

        guard speechAuthorized else {
            state = .error("Speech recognition permission denied. Enable in System Settings > Privacy > Speech Recognition.")
            return false
        }

        // Microphone permission
        let micAuthorized: Bool
        if #available(macOS 14.0, *) {
            micAuthorized = await AVAudioApplication.requestRecordPermission()
        } else {
            micAuthorized = await withCheckedContinuation { continuation in
                AVCaptureDevice.requestAccess(for: .audio) { granted in
                    continuation.resume(returning: granted)
                }
            }
        }

        guard micAuthorized else {
            state = .error("Microphone permission denied. Enable in System Settings > Privacy > Microphone.")
            return false
        }

        state = .idle
        return true
    }

    // MARK: - Recording

    func toggleRecording() {
        if state == .recording {
            stopRecording()
        } else {
            startRecording()
        }
    }

    func startRecording() {
        // Check permissions first
        let speechStatus = SFSpeechRecognizer.authorizationStatus()
        guard speechStatus == .authorized else {
            Task {
                let granted = await requestPermissions()
                if granted {
                    startRecording()
                }
            }
            return
        }

        guard let speechRecognizer, speechRecognizer.isAvailable else {
            state = .error("Speech recognition is not available on this device.")
            return
        }

        // Cancel any existing task
        recognitionTask?.cancel()
        recognitionTask = nil

        // Configure audio session
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        // Guard against zero-channel format (no mic connected)
        guard recordingFormat.channelCount > 0 else {
            state = .error("No microphone detected.")
            return
        }

        // Create recognition request
        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true

        // Prefer on-device recognition when available
        if #available(macOS 13, *) {
            request.requiresOnDeviceRecognition = speechRecognizer.supportsOnDeviceRecognition
        }

        self.recognitionRequest = request
        self.transcript = ""

        // Start recognition task
        recognitionTask = speechRecognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self else { return }

            if let result {
                let text = result.bestTranscription.formattedString
                DispatchQueue.main.async {
                    self.transcript = text
                    self.onTranscript?(text)
                }

                if result.isFinal {
                    DispatchQueue.main.async {
                        self.state = .idle
                    }
                    self.cleanupAudio()
                }
            }

            if let error {
                DispatchQueue.main.async {
                    // Don't show error for user-initiated cancellation
                    if (error as NSError).code != 216 { // Cancelled
                        self.state = .error(error.localizedDescription)
                    } else {
                        self.state = .idle
                    }
                }
                self.cleanupAudio()
            }
        }

        // Install audio tap
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            request.append(buffer)
        }

        // Start audio engine
        audioEngine.prepare()
        do {
            try audioEngine.start()
            state = .recording
        } catch {
            state = .error("Could not start audio engine: \(error.localizedDescription)")
            cleanupAudio()
        }
    }

    func stopRecording() {
        guard state == .recording else { return }
        state = .processing

        // End the audio input — this triggers the final recognition result
        recognitionRequest?.endAudio()

        // Stop after a brief delay to let final results arrive
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.cleanupAudio()
            if self?.state == .processing {
                self?.state = .idle
            }
        }
    }

    func cancelRecording() {
        recognitionTask?.cancel()
        cleanupAudio()
        transcript = ""
        state = .idle
    }

    // MARK: - Cleanup

    private func cleanupAudio() {
        if audioEngine.isRunning {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
        }
        recognitionRequest = nil
        recognitionTask = nil
    }
}
