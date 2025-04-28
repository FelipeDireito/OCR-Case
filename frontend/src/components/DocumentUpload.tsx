"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

// Define the DocumentData interface to match the one in dashboard
interface DocumentData {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  extractedText: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DocumentUploadProps {
  onDocumentUploaded: (document: DocumentData) => void;
}

export default function DocumentUpload({ onDocumentUploaded }: DocumentUploadProps) {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    // Check file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/tiff"];
    if (!allowedTypes.includes(file.type)) {
      setError("File type not supported. Please upload a PDF, JPEG, PNG, or TIFF file.");
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.user?.token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload document");
      }

      const documentData = await response.json() as DocumentData;
      setSuccess("Document uploaded successfully!");
      onDocumentUploaded(documentData);
      setFile(null);
      
      // Reset the file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload document. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-xl font-semibold">Upload New Document</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Select Document
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            className="block w-full cursor-pointer rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-900 focus:outline-none"
            accept=".pdf,.jpg,.jpeg,.png,.tiff"
            disabled={uploading}
          />
          <p className="mt-1 text-xs text-gray-500">
            Supported formats: PDF, JPEG, PNG, TIFF (Max 10MB)
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={uploading || !file}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300"
        >
          {uploading ? "Uploading..." : "Upload Document"}
        </button>
      </form>
    </div>
  );
}
