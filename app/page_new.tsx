"use client";

import DarkMode from "@/components/DarkMode";
import FlipCamera from "@/components/FlipCamera";
import useInterval from "@/components/hooks/useInterval";
import FaceModelSelect from "@/components/face-model-changer/FaceModelSelect";
import ModelSelect from "@/components/model-changer/ModelSelect";
import ModelSetting from "@/components/model-settings/ModelSetting";
import { Separator } from "@/components/ui/separator";
import Drawing3d from "@/lib/Drawing3d";
import FaceLandmarkDetection from "@/mediapipe/face-landmark";
import initMediaPipVision from "@/mediapipe/mediapipe-vision";
import { CameraDevicesContext } from "@/providers/CameraDevicesProvider";
import {
    CAMERA_LOAD_STATUS_ERROR,
    CAMERA_LOAD_STATUS_NO_DEVICES,
    CAMERA_LOAD_STATUS_SUCCESS,
    ERROR_ENABLE_CAMERA_PERMISSION_MSG,
    ERROR_NO_CAMERA_DEVICE_AVAILABLE_MSG,
    FACE_DETECTION_MODE,
    FACE_LANDMARK_DETECTION_MODE,
    GESTURE_RECOGNITION_MODE,
    ModelLoadResult,
    NO_MODE,
    OBJ_DETECTION_MODE,
} from "@/utils/definitions";
import "@mediapipe/tasks-vision";
import clsx from "clsx";
import { RefObject, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Rings } from "react-loader-spinner";
import Webcam from "react-webcam";

type Props = {};

const Home = (props: Props) => {
    const cameraDeviceProvider = useContext(CameraDevicesContext);
    const webcamRef = useRef<Webcam | null>(null);
    const canvas3dRef = useRef<HTMLCanvasElement | null>(null);

    const [mirrored, setMirrored] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [currentMode, setCurrentMode] = useState<number>(NO_MODE);
    const [faceShape, setFaceShape] = useState<string | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [autoCaptured, setAutoCaptured] = useState<boolean>(false);
    const [modelLoadResult, setModelLoadResult] = useState<ModelLoadResult[]>();

    const initModels = async () => {
        const vision = await initMediaPipVision();

        if (vision) {
            const models = [
                /* ObjectDetection.initModel(vision),
                FaceDetection.initModel(vision),
                GestureRecognition.initModel(vision), */
                FaceLandmarkDetection.initModel(vision),
            ];

            const results = await Promise.all(models);
            const enabledModels = results.filter((result) => result.loadResult);

            if (enabledModels.length > 0) {
                setCurrentMode(enabledModels[0].mode);
            }
            setModelLoadResult(enabledModels);
        }
    };

    const runPrediction = () => {
        if (!webcamRef.current || !webcamRef.current.video || autoCaptured) return;

        if (currentMode === FACE_LANDMARK_DETECTION_MODE && !FaceLandmarkDetection.isModelUpdating()) {
            const prediction = FaceLandmarkDetection.detectFace(webcamRef.current.video);
            
            if (prediction?.faceLandmarks?.length) {
                try {
                    const faceShape = FaceLandmarkDetection.classifyFaceShape(prediction.faceLandmarks[0]);
                    setFaceShape(faceShape);
                    captureImage();
                } catch (error) {
                    console.error(error);
                }
            }
        }
    };

    const onModeChange = (mode: string) => {
        const newMode: number = parseInt(mode);

        if (newMode === FACE_LANDMARK_DETECTION_MODE) {
            FaceLandmarkDetection.setDrawingMode(
                FaceLandmarkDetection.CONNECTION_FACE_LANDMARKS_TESSELATION
            );
        }
        setCurrentMode(newMode);
    };

    const captureImage = () => {
        if (!webcamRef.current) return;
        const screenshot = webcamRef.current.getScreenshot();
        if (screenshot) {
            setCapturedImage(screenshot);
            setAutoCaptured(true);
        }
    };

    const restartCapture = () => {
        setCapturedImage(null);
        setAutoCaptured(false);
    };

    const webcamRefCallback = useCallback((element: any) => {
        if (element != null) {
            webcamRef.current = element;
        }
    }, []);

    useEffect(() => {
        Drawing3d.initScene(window.innerWidth, window.innerHeight);
        initModels();
    }, []);

    useEffect(() => {
        if (modelLoadResult) {
            setLoading(false);
        }
    }, [modelLoadResult]);

    useEffect(() => {
        if (!loading) {
            if (cameraDeviceProvider?.status.status === CAMERA_LOAD_STATUS_ERROR) {
                alert(ERROR_ENABLE_CAMERA_PERMISSION_MSG);
            } else if (cameraDeviceProvider?.status.status === CAMERA_LOAD_STATUS_NO_DEVICES) {
                alert(ERROR_NO_CAMERA_DEVICE_AVAILABLE_MSG);
            }
        }
    }, [loading, cameraDeviceProvider?.status.status]);

    useInterval({ callback: runPrediction, delay: autoCaptured ? 0 : 150 });

    return (
        <div className="flex flex-col h-screen w-screen items-center">
            {/* Camera Area */}
            <div className="relative h-[80%] w-[85%] border-primary/5 border-2 max-h-xs">
                {capturedImage ? (
                    <img src={capturedImage} alt="Captured Face" className="h-full w-full object-contain p-2" />
                ) : (
                    <>
                        {cameraDeviceProvider?.status.status === CAMERA_LOAD_STATUS_SUCCESS &&
                            cameraDeviceProvider?.webcamId && (
                                <Webcam
                                    ref={webcamRefCallback}
                                    mirrored={mirrored}
                                    className="h-full w-full object-contain p-2"
                                    screenshotFormat="image/png"
                                    videoConstraints={{ deviceId: cameraDeviceProvider.webcamId }}
                                />
                            )}
                    </>
                )}
            </div>

            {/* Bottom Area */}
            <div className="flex flex-col flex-1 w-[85%]">
                <div className="border-primary/5 border-2 max-h-xs flex flex-row gap-2 justify-between shadow-md rounded-md p-4">
                    <div className="flex flex-row gap-2">
                        <DarkMode />
                        <FlipCamera setMirrored={setMirrored} />
                        <Separator orientation="vertical" className="mx-2" />
                    </div>
                    <div className="flex flex-row gap-2">
                        {currentMode === FACE_LANDMARK_DETECTION_MODE && (
                            <FaceModelSelect currentMode={currentMode.toString()} />
                        )}
                        <ModelSelect
                            cameraStatus={cameraDeviceProvider?.status.status}
                            modelList={[]}
                            currentMode={currentMode.toString()}
                            onModeChange={onModeChange}
                        />
                        <ModelSetting cameraStatus={cameraDeviceProvider?.status.status} mode={currentMode} />
                        <div className="flex items-center border-primary/5 border-2 rounded-md p-2">
                            Shape: {faceShape}
                        </div>
                    </div>
                </div>

                {/* Restart Button */}
                {capturedImage && (
                    <button
                        onClick={restartCapture}
                        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md"
                    >
                        Restart Capture
                    </button>
                )}
            </div>

            {/* Loading Indicator */}
            {loading && (
                <div className="absolute z-50 w-full h-full flex flex-col items-center justify-center bg-primary-foreground">
                    Loading module...
                    <Rings height={50} color="red" />
                </div>
            )}
        </div>
    );
};

export default Home;
