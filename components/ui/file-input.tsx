"use client"

import * as React from "react"
import { UploadCloud } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onFileSelect: (file: File) => void
  previewUrl?: string
}

export function FileInput({ className, onFileSelect, previewUrl, ...props }: FileInputProps) {
  const [preview, setPreview] = React.useState<string | undefined>(previewUrl)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreview(reader.result as string)
        }
        reader.readAsDataURL(file)
        onFileSelect(file)
      } else {
        alert('Please select an image file')
      }
    }
  }

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div 
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex h-24 w-24 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-muted-foreground/50",
          preview && "border-none"
        )}
      >
        {preview ? (
          <img 
            src={preview} 
            alt="Avatar preview" 
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <UploadCloud className="h-8 w-8 text-muted-foreground/50" />
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        {...props}
      />
    </div>
  )
} 