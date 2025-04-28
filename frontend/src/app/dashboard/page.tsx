"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DocumentUpload from "@/components/DocumentUpload";
import DocumentList from "@/components/DocumentList";

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

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (status !== "authenticated") return;

      try {
        setLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents`, {
          headers: {
            Authorization: `Bearer ${session?.user?.token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch documents");
        }

        const data = await response.json();
        setDocuments(data);
        setError("");
      } catch (err) {
        console.error("Error fetching documents:", err);
        setError("Failed to load documents. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [session, status]);

  const handleDocumentUploaded = (newDocument: DocumentData) => {
    setDocuments((prevDocuments) => [...prevDocuments, newDocument]);
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.user?.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      // Remove the document from the state
      setDocuments((prevDocuments) => 
        prevDocuments.filter((doc) => doc.id !== id)
      );
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Document Dashboard</h1>

      <div className="mb-8">
        <DocumentUpload onDocumentUploaded={handleDocumentUploaded} />
      </div>

      <div>
        <h2 className="mb-4 text-2xl font-semibold">Your Documents</h2>
        {loading ? (
          <p>Loading documents...</p>
        ) : error ? (
          <div className="rounded bg-red-100 p-4 text-red-700">{error}</div>
        ) : documents.length === 0 ? (
          <p>You haven't uploaded any documents yet.</p>
        ) : (
          <DocumentList 
            documents={documents} 
            onDelete={handleDeleteDocument} 
          />
        )}
      </div>
    </div>
  );
}
