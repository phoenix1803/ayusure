"use client"

import { useEffect, useRef, useState } from "react"
import { X, Camera, CheckCircle, AlertCircle } from "lucide-react"

interface BarcodeScannerProps {
    isOpen: boolean
    onClose: () => void
    onScanSuccess: (sampleNo: string) => void
}

export default function BarcodeScanner({ isOpen, onClose, onScanSuccess }: BarcodeScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const animationRef = useRef<number | null>(null)
    const [isScanning, setIsScanning] = useState(false)
    const [error, setError] = useState("")
    const [scanResult, setScanResult] = useState("")
    const [cameraReady, setCameraReady] = useState(false)
    const [isInitializing, setIsInitializing] = useState(false)

    useEffect(() => {
        if (isOpen && !isInitializing) {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                initCamera()
            }, 100)
        } else if (!isOpen) {
            cleanup()
        }

        return () => cleanup()
    }, [isOpen])

    const initCamera = async () => {
        if (isInitializing) return

        try {
            setIsInitializing(true)
            setError("")
            setCameraReady(false)

            // Clean up any existing streams
            cleanup()

            // Verify video element exists
            if (!videoRef.current) {
                console.error("Video ref not available, waiting...")
                await new Promise(resolve => setTimeout(resolve, 200))

                if (!videoRef.current) {
                    throw new Error("Video element failed to mount")
                }
            }

            console.log("Requesting camera access...")

            // Request camera access
            let stream: MediaStream | null = null

            try {
                // Try back camera first
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "environment",
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: false
                })
            } catch (e) {
                console.log("Back camera failed, trying any camera:", e)
                // Fallback to any camera
                stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false
                })
            }

            if (!stream) {
                throw new Error("Failed to get camera stream")
            }

            console.log("Got camera stream")
            streamRef.current = stream

            const video = videoRef.current
            if (!video) {
                throw new Error("Video element lost during initialization")
            }

            // Attach stream to video
            video.srcObject = stream

            // Wait for video to be ready
            const waitForVideo = new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error("Video loading timeout - try refreshing the page"))
                }, 8000)

                const handleLoaded = async () => {
                    clearTimeout(timeout)
                    try {
                        await video.play()
                        console.log("Video playing successfully")
                        resolve()
                    } catch (err) {
                        reject(err)
                    }
                }

                if (video.readyState >= 2) {
                    handleLoaded()
                } else {
                    video.addEventListener('loadeddata', handleLoaded, { once: true })
                }
            })

            await waitForVideo

            setCameraReady(true)
            setIsScanning(true)
            setIsInitializing(false)
            startBarcodeDetection()

        } catch (err) {
            console.error("Camera initialization error:", err)
            setIsInitializing(false)

            let errorMessage = "Unable to access camera"
            if (err instanceof Error) {
                if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                    errorMessage = "Camera permission denied. Please allow camera access and refresh."
                } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                    errorMessage = "No camera found on this device."
                } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
                    errorMessage = "Camera is in use by another app. Please close other camera apps."
                } else if (err.message.includes("timeout")) {
                    errorMessage = "Camera took too long to start. Please refresh and try again."
                } else if (err.message.includes("Video element")) {
                    errorMessage = "Camera interface failed to load. Please refresh the page."
                } else {
                    errorMessage = err.message
                }
            }

            setError(errorMessage)
            setCameraReady(false)
        }
    }

    const startBarcodeDetection = () => {
        if ('BarcodeDetector' in window) {
            detectBarcodesNative()
        } else {
            console.log("Native BarcodeDetector not available")
        }
    }

    const detectBarcodesNative = async () => {
        try {
            const barcodeDetector = new (window as any).BarcodeDetector({
                formats: ['code_128', 'code_39', 'code_93', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e']
            })

            const scan = async () => {
                if (!videoRef.current || !canvasRef.current || !isScanning) return

                const video = videoRef.current
                const canvas = canvasRef.current
                const ctx = canvas.getContext('2d')

                if (!ctx || video.readyState < 2) {
                    animationRef.current = requestAnimationFrame(scan)
                    return
                }

                canvas.width = video.videoWidth
                canvas.height = video.videoHeight
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

                try {
                    const barcodes = await barcodeDetector.detect(canvas)
                    if (barcodes.length > 0) {
                        const barcode = barcodes[0]
                        console.log("Barcode detected:", barcode.rawValue)
                        setScanResult(barcode.rawValue)
                        onScanSuccess(barcode.rawValue)
                        setTimeout(() => {
                            handleClose()
                        }, 500)
                        return
                    }
                } catch (e) {
                    console.error("Detection error:", e)
                }

                animationRef.current = requestAnimationFrame(scan)
            }

            scan()
        } catch (e) {
            console.error("BarcodeDetector error:", e)
        }
    }

    const cleanup = () => {
        console.log("Cleaning up camera...")

        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
            animationRef.current = null
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop()
                console.log("Stopped:", track.label)
            })
            streamRef.current = null
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null
        }

        setIsScanning(false)
        setScanResult("")
        setCameraReady(false)
    }

    const handleClose = () => {
        cleanup()
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
            <div className="relative w-full h-full max-w-2xl mx-auto">
                <canvas ref={canvasRef} className="hidden" />

                {/* Header */}
                <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
                    <div className="flex items-center justify-between max-w-md mx-auto">
                        <div className="flex items-center gap-2 text-white">
                            <Camera className="h-5 w-5 text-blue-500" />
                            <span className="font-medium">Scan Barcode</span>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Camera Area */}
                <div className="relative w-full h-full flex items-center justify-center">
                    {/* Always render video element */}
                    <video
                        ref={videoRef}
                        className={`w-full h-full object-cover ${cameraReady ? 'block' : 'hidden'}`}
                        playsInline
                        muted
                        autoPlay
                    />

                    {error ? (
                        <div className="absolute inset-0 flex items-center justify-center text-white p-6">
                            <div className="text-center max-w-md">
                                <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
                                <p className="text-xl font-medium mb-3">Camera Error</p>
                                <p className="text-sm opacity-90 mb-6 leading-relaxed">{error}</p>
                                <button
                                    onClick={() => {
                                        setError("")
                                        initCamera()
                                    }}
                                    className="bg-blue-500 text-white hover:bg-blue-600 px-6 py-3 rounded-lg flex items-center gap-2 mx-auto transition-colors"
                                >
                                    <Camera className="h-5 w-5" />
                                    Try Again
                                </button>
                            </div>
                        </div>
                    ) : !cameraReady ? (
                        <div className="absolute inset-0 flex items-center justify-center text-white p-6">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                                <p className="text-xl font-medium mb-2">Starting Camera</p>
                                <p className="text-sm opacity-75">Please allow camera access...</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="relative">
                                    <div className="w-80 h-56 border-4 border-white rounded-xl relative overflow-hidden shadow-2xl">
                                        <div className="absolute inset-0 border-4 border-blue-500/30 rounded-xl"></div>
                                        {isScanning && !scanResult && (
                                            <div className="absolute inset-x-0 top-1/2 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse shadow-lg shadow-blue-500/50" />
                                        )}
                                        {scanResult && (
                                            <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center backdrop-blur-sm">
                                                <CheckCircle className="h-16 w-16 text-green-500 drop-shadow-lg" />
                                            </div>
                                        )}
                                        {/* Corner brackets */}
                                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white"></div>
                                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white"></div>
                                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white"></div>
                                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white"></div>
                                    </div>
                                    <div className="text-center mt-6 text-white text-base bg-black/70 px-6 py-3 rounded-xl backdrop-blur-sm">
                                        {scanResult || "Position barcode inside the frame"}
                                    </div>
                                </div>
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                                <div className="max-w-md mx-auto bg-black/50 rounded-xl p-4 text-white text-center backdrop-blur-sm">
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
                                        <span className="text-sm font-medium">Camera Ready - Scanning...</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}