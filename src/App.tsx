import { useEffect, useRef } from "react";
import "./App.css";
import * as faceapi from "face-api.js";
import image from "./1.jpeg";

function App() {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleImage = async () => {
    if (!imgRef.current) return;

    // 1) detect
    const detections = await faceapi
      .detectAllFaces(imgRef.current, new faceapi.TinyFaceDetectorOptions())
      .withAgeAndGender()
      .withFaceExpressions();
    console.log(detections);

    // 2) draw
    if (canvasRef.current) {
      // match dimensions so overlay aligns
      faceapi.matchDimensions(canvasRef.current, {
        width: imgRef.current.width,
        height: imgRef.current.height,
      });
      const resized = faceapi.resizeResults(detections, {
        width: imgRef.current.width,
        height: imgRef.current.height,
      });
      faceapi.draw.drawDetections(canvasRef.current, resized);
    }
  };

  useEffect(() => {
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      faceapi.nets.faceExpressionNet.loadFromUri("/models"),
      faceapi.nets.ageGenderNet.loadFromUri("/models"),
    ])
      .then(handleImage)
      .catch(console.error);
  }, []);

  return (
    <div className="App">
      <header className="App-header"></header>
      <img
        ref={imgRef}
        src="https://encrypted-tbn3.gstatic.com/licensed-image?q=tbn:ANd9GcQBlt-HZo5JA3T0KuFY9r52DK2NjePZ5NF_G-Sc0TdisUKUhXXk_ZESxxt0JND42mkqHC9Gs-W3lSiVEXU"
        alt="face-api input"
        crossOrigin="anonymous"
        onLoad={handleImage} // also trigger when image actually loads
      />
      <canvas ref={canvasRef} width={940} height={640} />
    </div>
  );
}

export default App;
