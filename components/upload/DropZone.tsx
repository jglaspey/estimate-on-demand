"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react"
import clsx from "clsx"

interface DropZoneProps {
  onFileSelect: (file: File) => void
  title: string
  description: string
  icon: "document" | "house" | "clipboard"
  accept?: Record<string, string[]>
  maxSize?: number
  disabled?: boolean
  file?: File | null
  error?: string | null
}

const iconMap = {
  document: "📄",
  house: "🏠", 
  clipboard: "📋"
}

export function DropZone({
  onFileSelect,
  title,
  description,
  icon,
  accept = { "application/pdf": [".pdf"] },
  maxSize = 50 * 1024 * 1024, // 50MB
  disabled = false,
  file = null,
  error = null
}: DropZoneProps) {
  const [dragError, setDragError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setDragError(null)
    
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.errors[0]?.code === "file-too-large") {
        setDragError(`File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`)
      } else if (rejection.errors[0]?.code === "file-invalid-type") {
        setDragError("Only PDF files are allowed")
      } else {
        setDragError("Invalid file")
      }
      return
    }

    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0])
    }
  }, [onFileSelect, maxSize])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    disabled
  })

  const hasError = error || dragError
  const hasFile = file && !hasError

  return (
    <div className="rounded-lg border border-zinc-950/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <h3 className="text-lg font-semibold text-zinc-950 dark:text-white">{title}</h3>
      
      <div
        {...getRootProps()}
        className={clsx(
          "mt-4 rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer",
          isDragActive && "border-blue-500 bg-blue-50 dark:bg-blue-950/10",
          hasError && "border-red-500 bg-red-50 dark:bg-red-950/10",
          hasFile && "border-green-500 bg-green-50 dark:bg-green-950/10",
          disabled && "cursor-not-allowed opacity-50",
          !isDragActive && !hasError && !hasFile && "border-zinc-300 hover:border-blue-500 dark:border-zinc-700 dark:hover:border-blue-400"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
          {hasFile ? (
            <CheckCircle className="h-6 w-6 text-green-600" />
          ) : hasError ? (
            <AlertCircle className="h-6 w-6 text-red-600" />
          ) : (
            <span className="text-xl">{iconMap[icon]}</span>
          )}
        </div>

        {hasFile ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">{file.name}</p>
            <p className="text-xs text-green-600 dark:text-green-500">
              {(file.size / 1024 / 1024).toFixed(1)} MB • Ready for upload
            </p>
          </div>
        ) : hasError ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">{hasError}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Try again with a valid PDF file
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {isDragActive ? "Drop the PDF here" : `Drop ${title.toLowerCase()} PDF here or click to browse`}
            </p>
            <button 
              type="button"
              className="mt-2 text-xs text-blue-600 hover:underline dark:text-blue-400"
              disabled={disabled}
            >
              Browse Files
            </button>
          </div>
        )}
      </div>
      
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
    </div>
  )
}