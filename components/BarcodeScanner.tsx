"use client"

import { useEffect, useRef, useState } from "react"
import { X, Camera, CheckCircle, AlertCircle } from "lucide-react"
import { BrowserMultiFormatReader } from '@zxing/browser'

interface BarcodeScannerProps {
    isOpen: boolean
    onClose: () => void
    onScanSuccess: (sampleNo: string) => void
}

export default function BarcodeScanner({ isOpen, onClose, onScanSuccess }: BarcodeScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const readerRef = useRef<BrowserMultiFormatReader | null>(null)
    const [isScanning, setIsScanning] = useState(false)
    const [error, setError] = useState("")
    const [scanResult, setScanResult] = useState("")
    const [cameraReady, setCameraReady] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                initCamera()
            }, 100)
        } else {
            cleanup()
        }

        return () => cleanup()
    }, [isOpen])

    const initCamera = async () => {
        try {
            setError("")
            setCameraReady(false)
            cleanup()

            if (!videoRef.current) {
                await new Promise(resolve => setTimeout(resolve, 200))
                if (!videoRef.current) {
                    throw new Error("Video element failed to mount")
                }
            }

            console.log("Requesting camera access...")

            // Get camera stream
            let stream: MediaStream | null = null

            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "environment",
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    },
                    audio: false
                })
            } catch (e) {
                console.log("Back camera failed, trying any camera:", e)
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
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

            video.srcObject = stream

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error("Video loading timeout"))
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

            setCameraReady(true)
            setIsScanning(true)

            // Start ZXing scanner
            console.log("Starting ZXing barcode scanner...")
            startZXingScanner()

        } catch (err) {
            console.error("Camera initialization error:", err)

            let errorMessage = "Unable to access camera"
            if (err instanceof Error) {
                if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                    errorMessage = "Camera permission denied. Please allow camera access."
                } else if (err.name === "NotFoundError") {
                    errorMessage = "No camera found on this device."
                } else if (err.name === "NotReadableError") {
                    errorMessage = "Camera is in use by another app."
                } else {
                    errorMessage = err.message
                }
            }

            setError(errorMessage)
            setCameraReady(false)
        }
    }

    const startZXingScanner = async () => {
        try {
            const codeReader = new BrowserMultiFormatReader()
            readerRef.current = codeReader

            console.log("ZXing reader initialized, starting continuous scan...")

            // Continuous decode from video element
            await codeReader.decodeFromVideoElement(
                videoRef.current!,
                (result, error) => {
                    if (result) {
                        const scannedValue = result.getText()
                        console.log("✅ BARCODE DETECTED:", scannedValue)
                        console.log("Format:", result.getBarcodeFormat())

                        // Stop scanning immediately
                        setIsScanning(false)
                        setScanResult(`Found: ${scannedValue}`)

                        // Success callback
                        setTimeout(() => {
                            onScanSuccess(scannedValue)
                            handleClose()
                        }, 800)
                    }

                    if (error) {
                        // Ignore common "not found" errors during scanning
                        if (!error.message?.includes('No MultiFormat Readers')) {
                            console.error("Scan error:", error)
                        }
                    }
                }
            )

        } catch (err) {
            console.error("ZXing scanner error:", err)
            setError("Failed to initialize barcode scanner")
        }
    }

    const cleanup = () => {
        console.log("Cleaning up camera...")

        // Clear ZXing reader
        if (readerRef.current) {
            readerRef.current = null
        }

        // Stop camera stream
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
                                        <span className="text-sm font-medium">Scanning continuously...</span>
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
