// src/App.tsx
import { useEffect, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import "./App.css";

export default function App() {
  /* ------------------------------------------------------------------ */
  /* DOM element kept in state (callback ref)                            */
  /* ------------------------------------------------------------------ */
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  /* gallery of finished captures (data URLs) -------------------------- */
  const [gallery, setGallery] = useState<string[]>([]);

  /* 1. Load Face-API models once -------------------------------------- */
  useEffect(() => {
    (async () => {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceExpressionNet.loadFromUri("/models"),
        faceapi.nets.ageGenderNet.loadFromUri("/models"),
      ]);
      console.log("models ready");
    })().catch(console.error);
  }, []);

  /* 2. Start webcam when <video> is mounted --------------------------- */
  useEffect(() => {
    if (!videoEl) return;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        videoEl.srcObject = stream;
      } catch (e) {
        alert("Camera access denied.");
        console.error(e);
      }
    })();

    return () =>
      (videoEl.srcObject as MediaStream | null)
        ?.getTracks()
        .forEach((t) => t.stop());
  }, [videoEl]);

  /* 3. Capture button handler ---------------------------------------- */
  const capture = useCallback(async () => {
    if (!videoEl) return;

    /* wait for metadata so videoWidth/Height aren’t 0 */
    if (videoEl.readyState < 2) {
      await new Promise((res) =>
        videoEl.addEventListener("loadedmetadata", () => res(null), {
          once: true,
        })
      );
    }

    const w = videoEl.videoWidth;
    const h = videoEl.videoHeight;

    /* draw current frame to an off-screen canvas */
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(videoEl, 0, 0, w, h);

    /* run detection on that canvas */
    const detections = await faceapi
      .detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions())
      .withAgeAndGender()
      .withFaceExpressions();

    /* draw detections ON THE SAME canvas */
    faceapi.draw.drawDetections(canvas, detections);
    faceapi.draw.drawFaceExpressions(
      canvas,
      faceapi.resizeResults(detections, { width: w, height: h })
    );
    detections.forEach((det) => {
      new faceapi.draw.DrawTextField(
        [det.gender, `${Math.round(det.age)} yrs`],
        det.detection.box.bottomLeft
      ).draw(canvas);
    });

    /* add finished picture to gallery */
    const url = canvas.toDataURL("image/png");
    setGallery((prev) => [...prev, url]);
  }, [videoEl]);

  /* ------------------------------------------------------------------ */
  /* JSX                                                                 */
  /* ------------------------------------------------------------------ */
  return (
    <div className="App" style={{ textAlign: "center", paddingTop: 16 }}>
      {/* live preview */}
      <video
        ref={setVideoEl}
        autoPlay
        muted
        style={{
          width: 480,
          height: 360,
          borderRadius: 8,
          border: "1px solid #ccc",
        }}
      />

      {/* capture control */}
      <div style={{ margin: "12px 0 20px" }}>
        <button onClick={capture}>Capture</button>
      </div>

      {/* gallery of all snapshots */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          justifyContent: "center",
        }}>
        {gallery.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`capture-${i}`}
            style={{
              width: 240,
              height: "auto",
              border: "1px solid #aaa",
              borderRadius: 4,
            }}
          />
        ))}
      </div>
    </div>
  );
}
