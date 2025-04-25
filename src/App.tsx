// import { useEffect, useRef } from "react";
// import "./App.css";
// import * as faceapi from "face-api.js";

// function App() {
//   const imgRef = useRef<HTMLImageElement | null>(null);
//   const canvasRef = useRef<HTMLCanvasElement | null>(null);

//   const handleImage = async () => {
//     if (!imgRef.current || !canvasRef.current) return;

//     // 1) detect
//     const detections = await faceapi
//       .detectAllFaces(imgRef.current, new faceapi.TinyFaceDetectorOptions())
//       .withAgeAndGender()
//       .withFaceExpressions();
//     console.log(detections);
//     const displaySize = {
//       width: imgRef.current.width,
//       height: imgRef.current.height,
//     };

//     faceapi.matchDimensions(canvasRef.current, displaySize);
//     const resized = faceapi.resizeResults(detections, displaySize);
//     faceapi.draw.drawDetections(canvasRef.current, resized);
//     faceapi.draw.drawFaceExpressions(canvasRef.current, resized);
//   };

//   useEffect(() => {
//     Promise.all([
//       faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
//       faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
//       faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
//       faceapi.nets.faceExpressionNet.loadFromUri("/models"),
//       faceapi.nets.ageGenderNet.loadFromUri("/models"),
//     ])
//       .then(handleImage)
//       .catch(console.error);
//   }, []);

//   return (
//     <div className="App">
//       <div style={{ position: "relative", display: "inline-block" }}>
//         <img
//           ref={imgRef}
//           src="https://c8.alamy.com/zooms/9/e30cc776672b452988de7753b16a17fd/ae7px9.jpg"
//           alt="face-api input"
//           crossOrigin="anonymous"
//           style={{ position: "absolute", top: 0, left: 0 }}
//           onLoad={handleImage}
//         />
//         <canvas
//           ref={canvasRef}
//           width={940}
//           height={640}
//           style={{ position: "absolute", top: 0, left: 0 }}
//         />
//       </div>
//     </div>
//   );
// }

// export default App;

// App.tsx  (React + TypeScript)
// src/App.tsx
import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import "./App.css";

export default function App() {
  /* ------------------------------------------------------------------ */
  /* Refs to the DOM elements                                           */
  /* ------------------------------------------------------------------ */
  const videoRef = useRef<HTMLVideoElement>(null); // live webcam preview
  const imgRef = useRef<HTMLImageElement>(null); // frozen snapshot
  const canvasRef = useRef<HTMLCanvasElement>(null); // overlay drawings

  /* ------------------------------------------------------------------ */
  /* State                                                               */
  /* ------------------------------------------------------------------ */
  const [photoSrc, setPhotoSrc] = useState<string | null>(null); // data-URL of last capture
  const [buttonClick, setButtonClick] = useState(0);
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(
    null
  ); // frame size

  /* ------------------------------------------------------------------ */
  /* 1. Load Face-API models once                                        */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceExpressionNet.loadFromUri("/models"),
      faceapi.nets.ageGenderNet.loadFromUri("/models"),
    ]).catch(console.error);
  }, [buttonClick]);

  /* ------------------------------------------------------------------ */
  /* 2. Start the webcam on mount                                        */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        alert("Could not access the camera.");
        console.error(err);
      }
    })();

    /* stop tracks when component unmounts */
    return () => {
      (videoRef.current?.srcObject as MediaStream | null)
        ?.getTracks()
        .forEach((t) => t.stop());
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /* 3. Capture the current frame and run detection                      */
  /* ------------------------------------------------------------------ */
  const capture = async () => {
    if (!videoRef.current) return;
    setButtonClick(buttonClick + 1);
    /* Ensure metadata is loaded so width/height are non-zero */
    if (videoRef.current.readyState < 2) {
      await new Promise((res) => {
        const handler = () => {
          videoRef.current?.removeEventListener("loadedmetadata", handler);
          res(null);
        };
        videoRef.current?.addEventListener("loadedmetadata", handler);
      });
    }

    const w = videoRef.current.videoWidth;
    const h = videoRef.current.videoHeight;
    setDimensions({ w, h });

    /* Draw the current video frame onto a temp canvas */
    const temp = document.createElement("canvas");
    temp.width = w;
    temp.height = h;
    temp.getContext("2d")!.drawImage(videoRef.current, 0, 0, w, h);

    /* Convert to PNG data-URL so we can show it in <img> */
    const dataURL = temp.toDataURL("image/png");
    setPhotoSrc(dataURL);

    /* Wait until <img> is rendered & pixels are ready */
    await imgRef.current?.decode();

    /* Run Face-API on the captured frame */
    const detections = await faceapi
      .detectAllFaces(temp, new faceapi.TinyFaceDetectorOptions())
      .withAgeAndGender()
      .withFaceExpressions();

    /* Resize & draw overlays */
    if (!canvasRef.current) return;

    faceapi.matchDimensions(canvasRef.current, { width: w, height: h });
    const resized = faceapi.resizeResults(detections, { width: w, height: h });

    const ctx = canvasRef.current.getContext("2d")!;
    ctx.clearRect(0, 0, w, h);
    faceapi.draw.drawDetections(canvasRef.current, resized);
    faceapi.draw.drawFaceExpressions(canvasRef.current, resized);

    /* Draw age & gender text fields */
    detections.forEach((det) => {
      const anchor = det.detection.box.bottomRight;
      new faceapi.draw.DrawTextField(
        [det.gender, `${Math.round(det.age)} yrs`],
        anchor
      ).draw(canvasRef.current!);
    });
  };

  /* ------------------------------------------------------------------ */
  /* JSX                                                                 */
  /* ------------------------------------------------------------------ */
  return (
    <div className="App">
      {/* webcam preview */}
      <video
        ref={videoRef}
        autoPlay
        muted
        style={{
          width: 480,
          height: 360,
          border: "1px solid #ccc",
          borderRadius: 8,
        }}
      />

      {/* capture button */}
      <div style={{ margin: "8px 0 16px" }}>
        <button onClick={capture}>Capture</button>
      </div>

      {/* frozen photo + overlay */}
      {photoSrc && dimensions && (
        <div style={{ position: "relative", display: "inline-block" }}>
          <img
            ref={imgRef}
            src={photoSrc}
            alt="snapshot"
            style={{ position: "absolute", top: 0, left: 0 }}
          />
          <canvas
            ref={canvasRef}
            width={dimensions.w}
            height={dimensions.h}
            style={{ position: "absolute", top: 0, left: 0 }}
          />
        </div>
      )}
    </div>
  );
}
