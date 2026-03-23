// VoiceInputManager.swift — Voice-to-text using WhisperKit (on-device Whisper)
// Phase 4 — Provides push-to-talk and toggle recording for voice input
//
// Uses WhisperKit for fully on-device transcription via Core ML.
// Records audio with AVAudioEngine, transcribes when recording stops.

import Foundation
import AVFoundation
import WhisperKit

@MainActor @Observable
class VoiceInputManager: @unchecked Sendable {
    enum RecordingState: Equatable, Sendable {
        case idle
        case requestingPermission
        case loading        // WhisperKit model loading
        case recording
        case processing
        case error(String)
    }

    var state: RecordingState = .idle
    var transcript: String = ""
    var isAvailable: Bool = true

    // Callback fired when transcription completes
    var onTranscript: (@MainActor (String) -> Void)?

    private var whisperKit: WhisperKit?
    private let audioEngine = AVAudioEngine()
    private var audioSamples: [Float] = []
    private var loadTask: Task<Void, Never>?

    init() {
        // Preload WhisperKit model in background
        loadTask = Task { [weak self] in
            do {
                let kit = try await WhisperKit(WhisperKitConfig(model: "base"))
                self?.whisperKit = kit
            } catch {
                print("[VoiceInput] WhisperKit init failed: \(error.localizedDescription)")
                self?.isAvailable = false
            }
        }
    }

    // MARK: - Permissions

    func requestPermissions() async -> Bool {
        state = .requestingPermission

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
        // Check mic permission
        let micStatus: AVAuthorizationStatus = AVCaptureDevice.authorizationStatus(for: .audio)
        guard micStatus == .authorized else {
            Task {
                let granted = await requestPermissions()
                if granted { startRecording() }
            }
            return
        }

        // Wait for WhisperKit if still loading
        guard whisperKit != nil else {
            if loadTask != nil {
                state = .loading
                Task { [weak self] in
                    await self?.loadTask?.value
                    self?.loadTask = nil
                    if self?.whisperKit != nil {
                        self?.startRecording()
                    } else {
                        self?.state = .error("Failed to load speech model.")
                    }
                }
            } else {
                state = .error("Speech model not available.")
            }
            return
        }

        // Configure audio engine
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        guard recordingFormat.channelCount > 0 else {
            state = .error("No microphone detected.")
            return
        }

        audioSamples = []
        transcript = ""

        // Install tap — convert to mono 16kHz Float samples for Whisper
        let targetSampleRate: Double = 16000
        let srcSampleRate = recordingFormat.sampleRate

        inputNode.installTap(onBus: 0, bufferSize: 4096, format: recordingFormat) { [weak self] buffer, _ in
            guard let channelData = buffer.floatChannelData?[0] else { return }
            let frameCount = Int(buffer.frameLength)

            // Simple downsampling if needed
            if srcSampleRate != targetSampleRate {
                let ratio = srcSampleRate / targetSampleRate
                let outputCount = Int(Double(frameCount) / ratio)
                var downsampled = [Float](repeating: 0, count: outputCount)
                for i in 0..<outputCount {
                    let srcIdx = min(Int(Double(i) * ratio), frameCount - 1)
                    downsampled[i] = channelData[srcIdx]
                }
                Task { @MainActor in
                    self?.audioSamples.append(contentsOf: downsampled)
                }
            } else {
                let samples = Array(UnsafeBufferPointer(start: channelData, count: frameCount))
                Task { @MainActor in
                    self?.audioSamples.append(contentsOf: samples)
                }
            }
        }

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

        cleanupAudio()

        let samples = audioSamples
        let kit = whisperKit

        Task { @MainActor [weak self] in
            guard let kit, !samples.isEmpty else {
                self?.state = .idle
                return
            }

            do {
                let results = try await kit.transcribe(audioArray: samples)
                let text = results.map { $0.text }.joined(separator: " ").trimmingCharacters(in: .whitespacesAndNewlines)
                self?.transcript = text
                if !text.isEmpty {
                    self?.onTranscript?(text)
                }
            } catch {
                self?.state = .error("Transcription failed: \(error.localizedDescription)")
                return
            }

            self?.state = .idle
        }
    }

    func cancelRecording() {
        cleanupAudio()
        transcript = ""
        audioSamples = []
        state = .idle
    }

    // MARK: - Cleanup

    private func cleanupAudio() {
        if audioEngine.isRunning {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
        }
    }
}
