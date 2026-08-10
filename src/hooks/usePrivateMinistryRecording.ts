"use client";

import { useCallback, useRef, useState } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  buildRecordingFilename,
  getRecordingMimeType,
  RECORDING_CONTENT_TYPE,
  triggerBrowserDownload,
  uploadRecordingBlob,
} from "@/lib/recording";

type Options = {
  meetingToken: string;
  meetingTitle: string;
  isHost: boolean;
};

export function usePrivateMinistryRecording({ meetingToken, meetingTitle, isHost }: Options) {
  const { localParticipant } = useLocalParticipant();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingMimeRef = useRef("video/webm");

  const [isRecording, setIsRecording] = useState(false);
  const [isSavingRecording, setIsSavingRecording] = useState(false);
  const [error, setError] = useState("");

  const buildRecordingStream = useCallback(() => {
    const pub = localParticipant.getTrackPublication(Track.Source.Camera);
    const micPub = localParticipant.getTrackPublication(Track.Source.Microphone);
    const videoTrack = pub?.track?.mediaStreamTrack;
    const audioTrack = micPub?.track?.mediaStreamTrack;

    if (!videoTrack && !audioTrack) return null;

    const stream = new MediaStream();
    if (videoTrack?.readyState === "live") {
      try {
        stream.addTrack(videoTrack.clone());
      } catch {
        stream.addTrack(videoTrack);
      }
    }
    if (audioTrack?.readyState === "live") {
      try {
        stream.addTrack(audioTrack.clone());
      } catch {
        stream.addTrack(audioTrack);
      }
    }
    return stream.getTracks().length > 0 ? stream : null;
  }, [localParticipant]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;

      const buildBlob = () => {
        if (recordingChunksRef.current.length === 0) return null;
        return new Blob(recordingChunksRef.current, { type: RECORDING_CONTENT_TYPE });
      };

      const finish = (blob: Blob | null) => {
        recordingChunksRef.current = [];
        recorderRef.current = null;
        setIsRecording(false);
        resolve(blob);
      };

      if (!recorder || recorder.state === "inactive") {
        finish(buildBlob());
        return;
      }

      let settled = false;
      const settle = (blob: Blob | null) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(hardTimeout);
        finish(blob);
      };

      recorder.onstop = () => settle(buildBlob());

      const hardTimeout = window.setTimeout(() => {
        try {
          if (recorder.state !== "inactive") {
            recorder.requestData();
            recorder.stop();
          }
        } catch {
          /* ignore */
        }
        settle(buildBlob());
      }, 5000);

      try {
        if (recorder.state === "recording" || recorder.state === "paused") {
          recorder.requestData();
        }
        recorder.stop();
      } catch {
        settle(buildBlob());
      }
    });
  }, []);

  const beginRecording = useCallback(() => {
    if (!isHost || recorderRef.current?.state === "recording") return;

    const stream = buildRecordingStream();
    if (!stream) {
      setError("Could not start recording — allow camera or microphone access.");
      return;
    }

    recordingMimeRef.current = getRecordingMimeType();
    recordingChunksRef.current = [];

    try {
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, {
          mimeType: recordingMimeRef.current,
          videoBitsPerSecond: 2_500_000,
          audioBitsPerSecond: 128_000,
        });
      } catch {
        recorder = new MediaRecorder(stream, {
          videoBitsPerSecond: 2_500_000,
          audioBitsPerSecond: 128_000,
        });
        recordingMimeRef.current = recorder.mimeType.includes("webm")
          ? recorder.mimeType
          : "video/webm";
      }

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setError("Recording was interrupted by the browser.");
      };

      recorder.start(10_000);
      recorderRef.current = recorder;
      setIsRecording(true);
      setError("");
    } catch {
      setError("Could not start recording in this browser.");
    }
  }, [buildRecordingStream, isHost]);

  const finalizeRecording = useCallback(async () => {
    if (!isHost) return null;

    setIsSavingRecording(true);
    const wasRecording =
      isRecording ||
      recorderRef.current?.state === "recording" ||
      recorderRef.current?.state === "paused";

    let recordingBlob: Blob | null = null;
    const filename = buildRecordingFilename(meetingTitle, RECORDING_CONTENT_TYPE);

    try {
      if (wasRecording) {
        recordingBlob = await stopRecording();
      }

      await fetch(`/api/meetings/${meetingToken}/recording`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end", publicUrl: null }),
      });
    } catch {
      setError("Could not finalize session recording.");
    } finally {
      setIsSavingRecording(false);
    }

    if (recordingBlob && recordingBlob.size > 0) {
      try {
        const result = await uploadRecordingBlob(meetingToken, recordingBlob, filename);
        await fetch(`/api/meetings/${meetingToken}/recording`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicUrl: result.publicUrl }),
        });
        setError("");
        return result.publicUrl;
      } catch (uploadError) {
        triggerBrowserDownload(recordingBlob, filename);
        const message = uploadError instanceof Error ? uploadError.message : "Upload failed";
        setError(
          `Recording could not be saved to the library (${message}). A copy was downloaded to your device.`,
        );
      }
    }

    return null;
  }, [isHost, isRecording, meetingTitle, meetingToken, stopRecording]);

  return {
    isRecording,
    isSavingRecording,
    error,
    setError,
    beginRecording,
    finalizeRecording,
  };
}
