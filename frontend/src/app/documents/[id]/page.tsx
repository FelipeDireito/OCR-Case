"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import DocumentChat from "@/components/DocumentChat";

interface DocumentViewProps {
  params: {
    id: string;
  };
}

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

export default function DocumentView({ params }: DocumentViewProps) {
  const { id } = params;
  const { data: session, status } = useSession();
  const router = useRouter();
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingOcr, setProcessingOcr] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("text");

  useEffect(() => {
    // Redirect to login if not authenticated
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    // Fetch document details
    const fetchDocument = async () => {
      if (status !== "authenticated" || !id) return;

      try {
        setLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/${id}`, {
          headers: {
            Authorization: `Bearer ${session?.user?.token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Document not found");
          } else if (response.status === 403) {
            throw new Error("You don't have permission to view this document");
          } else {
            throw new Error("Failed to fetch document");
          }
        }

        const data = await response.json();
        setDocument(data);
        setError("");
      } catch (err: any) {
        console.error("Error fetching document:", err);
        setError(err.message || "Failed to load document. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id, session, status]);

  const handleProcessOcr = async () => {
    if (!document || !session) return;

    try {
      setProcessingOcr(true);
      setOcrSuccess(false);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ocr/process/${document.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to process document with OCR");
      }

      const updatedDocument = await response.json();
      setDocument(updatedDocument);
      setOcrSuccess(true);
    } catch (err: any) {
      console.error("OCR processing error:", err);
      setError(err.message || "Failed to process document with OCR");
    } finally {
      setProcessingOcr(false);
    }
  };

  // Format file size to human-readable format
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Format date to readable format
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  // Determine if the file is an image
  const isImage = (fileType: string): boolean => {
    return ["image/jpeg", "image/png", "image/tiff"].includes(fileType);
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Loading...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            &larr; Back to Dashboard
          </Link>
        </div>
        <div className="rounded-lg bg-red-50 p-6 text-red-700">
          <h1 className="mb-2 text-xl font-bold">Error</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            &larr; Back to Dashboard
          </Link>
        </div>
        <div className="rounded-lg bg-yellow-50 p-6 text-yellow-700">
          <h1 className="mb-2 text-xl font-bold">Document Not Found</h1>
          <p>The requested document could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">{document.fileName}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div>Type: {document.fileType}</div>
          <div>Size: {formatFileSize(document.fileSize)}</div>
          <div>Uploaded: {formatDate(document.createdAt)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Document Preview */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Document Preview</h2>
          <div className="flex items-center justify-center rounded border border-gray-300 bg-gray-100 p-4">
            {isImage(document.fileType) ? (
              <div className="relative h-[500px] w-full">
                <Image
                  src={`${process.env.NEXT_PUBLIC_API_URL}/${document.fileUrl}`}
                  alt={document.fileName}
                  fill
                  style={{ objectFit: "contain" }}
                  unoptimized={true}
                />
              </div>
            ) : document.fileType === "application/pdf" ? (
              <iframe
                src={`${process.env.NEXT_PUBLIC_API_URL}/${document.fileUrl}`}
                className="h-[500px] w-full"
                title={document.fileName}
              />
            ) : (
              <div className="text-center">
                <p className="mb-4">Preview not available for this file type.</p>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL}/${document.fileUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Download File
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Tabs for Extracted Text and Chat */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex">
                <button
                  onClick={() => setActiveTab("text")}
                  className={`w-1/2 border-b-2 py-2 px-1 text-center text-sm font-medium ${
                    activeTab === "text"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  Extracted Text
                </button>
                <button
                  onClick={() => setActiveTab("chat")}
                  className={`w-1/2 border-b-2 py-2 px-1 text-center text-sm font-medium ${
                    activeTab === "chat"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  Chat with Document
                </button>
              </nav>
            </div>
          </div>

          {activeTab === "text" ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Extracted Text</h2>
                {!document.extractedText && (
                  <button
                    onClick={handleProcessOcr}
                    disabled={processingOcr}
                    className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {processingOcr ? "Processing..." : "Extract Text with OCR"}
                  </button>
                )}
              </div>
              
              {ocrSuccess && (
                <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
                  Text extraction completed successfully!
                </div>
              )}
              
              <div className="h-[500px] overflow-auto rounded border border-gray-300 bg-gray-50 p-4">
                {document.extractedText ? (
                  <pre className="whitespace-pre-wrap font-sans text-sm">{document.extractedText}</pre>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center">
                    <p className="mb-4 text-gray-500">
                      {processingOcr
                        ? "Processing document with OCR. This may take a moment..."
                        : "No text has been extracted from this document yet."}
                    </p>
                    {!processingOcr && !document.extractedText && (
                      <p className="text-sm text-gray-400">
                        Click the "Extract Text with OCR" button above to process this document.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-[600px]">
              <DocumentChat documentId={document.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
