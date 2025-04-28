"use client";

import { useState } from "react";
import Link from "next/link";

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

interface DocumentListProps {
  documents: DocumentData[];
  onDelete: (id: string) => void;
}

export default function DocumentList({ documents, onDelete }: DocumentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }
    
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  };

  const getFileIcon = (fileType: string): string => {
    if (fileType.includes("pdf")) return "";
    if (fileType.includes("image")) return "";
    if (fileType.includes("text")) return "";
    return "";
  };

  const hasExtractedText = (document: DocumentData): boolean => {
    return !!document.extractedText;
  };

  if (documents.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-center text-gray-500">No documents uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Size
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Uploaded
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                OCR Status
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {documents.map((document) => (
              <tr key={document.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4 text-xl">
                  {getFileIcon(document.fileType)}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <Link href={`/documents/${document.id}`} className="text-blue-600 hover:underline">
                    {document.fileName}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {formatFileSize(document.fileSize)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {formatDate(document.createdAt)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  {hasExtractedText(document) ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      Processed
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                      Not Processed
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <Link
                      href={`/documents/${document.id}`}
                      className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                    >
                      View
                    </Link>
                    <a
                      href={`${process.env.NEXT_PUBLIC_API_URL}/${document.fileUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded bg-green-50 px-2 py-1 text-xs text-green-700 hover:bg-green-100"
                    >
                      Download
                    </a>
                    <button
                      onClick={() => handleDelete(document.id)}
                      disabled={deletingId === document.id}
                      className="rounded bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      {deletingId === document.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
