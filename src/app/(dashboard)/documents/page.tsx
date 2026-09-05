"use client";

import { useState, useEffect } from "react";
import { getDocuments, createDocument, deleteDocument, Document } from "@/app/actions/documents";
import { getProperties, Property } from "@/app/actions/properties";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Folder, Plus, Search, FileText, Download, Trash2, 
  Building2, Loader2, Image as ImageIcon, File, Calendar, Upload
} from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger 
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { useYear } from "@/lib/contexts/YearContext";
import { useToast } from "@/lib/contexts/ToastContext";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";

export default function DocumentsPage() {
  const { selectedYear } = useYear();
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");

  // Upload state
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [propertyId, setPropertyId] = useState("general");
  const [file, setFile] = useState<File | null>(null);

  // Delete state
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);

  const resetForm = () => {
    setTitle("");
    setPropertyId("general");
    setFile(null);
    setUploading(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) resetForm();
  };

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [docs, props] = await Promise.all([
        getDocuments(),
        getProperties()
      ]);
      setDocuments(docs);
      setProperties(props);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) {
      showToast("Please select a file and enter a title.", "error");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("propertyId", propertyId);
      formData.append("file", file);

      const result = await createDocument(formData);
      if (result.success) {
        showToast("Document uploaded successfully", "success");
        setOpen(false);
        resetForm();
        loadData();
      } else {
        showToast(result.error || "Failed to upload document", "error");
      }
    } catch (error: any) {
      console.error("Upload failed", error);
      showToast(error?.message || "Failed to upload document", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!docToDelete) return;
    
    try {
      const res = await deleteDocument(docToDelete.id);
      if (res.success) {
        showToast("Document deleted successfully", "success");
        loadData();
      } else {
        showToast(res.error || "Failed to delete document", "error");
      }
    } catch (error: any) {
      console.error(error);
      showToast(error?.message || "Failed to delete document", "error");
    } finally {
      setDocToDelete(null);
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase()) || 
                          doc.fileName.toLowerCase().includes(search.toLowerCase());
    const matchesProperty = propertyFilter === "all" ? true : 
                           (propertyFilter === "general" ? doc.propertyId === null : doc.propertyId === propertyFilter);
    // Optionally filter by selectedYear if you want, but docs might be timeless. 
    // Let's filter by uploadedAt year just to be consistent with the app's global state,
    // or maybe documents are timeless. Let's make them timeless unless requested otherwise, 
    // since old contracts are still valid. 
    return matchesSearch && matchesProperty;
  });

  const getFileIcon = (type: string) => {
    if (type.includes("image")) return <ImageIcon className="h-5 w-5 text-sky-400" />;
    if (type.includes("pdf")) return <FileText className="h-5 w-5 text-rose-400" />;
    return <File className="h-5 w-5 text-zinc-400" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Documents</h2>
          <p className="text-zinc-400 text-sm">Manage contracts, invoices, and general files.</p>
        </div>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all">
              <Plus className="mr-2 h-4 w-4" /> Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px] bg-zinc-950/95 backdrop-blur-xl border-white/10 text-zinc-100 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">Upload Document</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Upload a new file and optionally assign it to a property.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-zinc-300 font-medium">Document Title</Label>
                <Input 
                  id="title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="e.g. 2026 Insurance Policy" 
                  required 
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 rounded-lg h-11"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300 font-medium">Assign to Property</Label>
                <Select value={propertyId} onValueChange={setPropertyId}>
                  <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-zinc-100 rounded-lg h-11">
                    <SelectValue>
                      {propertyId === 'general' 
                        ? '-- General (No Property) --' 
                        : properties.find(p => p.id === propertyId)?.name || 'Select Property'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-h-60">
                    <SelectItem value="general" className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer">
                      -- General (No Property) --
                    </SelectItem>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={p.id} className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-zinc-300 font-medium">File</Label>
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-28 border-2 border-zinc-800 border-dashed rounded-lg cursor-pointer bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {file ? (
                        <>
                          <FileText className="w-8 h-8 text-indigo-400 mb-2" />
                          <p className="text-sm text-zinc-200 font-medium">{file.name}</p>
                          <p className="text-xs text-zinc-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-zinc-500 mb-2" />
                          <p className="mb-2 text-sm text-zinc-400"><span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop</p>
                          <p className="text-xs text-zinc-500">PDF, PNG, JPG or WEBP (MAX. 100MB)</p>
                        </>
                      )}
                    </div>
                    <input 
                      id="dropzone-file" 
                      type="file" 
                      className="hidden" 
                      onChange={handleFileChange}
                      accept=".pdf,.png,.jpg,.jpeg,.webp" 
                    />
                  </label>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-white/5">
                <Button 
                  type="submit" 
                  disabled={uploading || !file || !title}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-0"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {uploading ? "Uploading..." : "Upload Document"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-zinc-900/40 p-4 rounded-xl border border-white/5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input 
            placeholder="Search documents..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-zinc-950/50 border-white/10 text-zinc-200 w-full focus-visible:ring-indigo-500 focus-visible:border-indigo-500 h-10"
          />
        </div>
        
        <div className="w-full sm:w-64">
          <Select value={propertyFilter} onValueChange={setPropertyFilter}>
            <SelectTrigger className="w-full bg-zinc-950/50 border-white/10 text-zinc-200 h-10">
              <SelectValue>
                {propertyFilter === 'all' 
                  ? 'All Documents' 
                  : propertyFilter === 'general' 
                    ? 'General Documents' 
                    : properties.find(p => p.id === propertyFilter)?.name || 'Filter by Property'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-h-60">
              <SelectItem value="all" className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer">All Documents</SelectItem>
              <SelectItem value="general" className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer">General Documents</SelectItem>
              {properties.map(p => (
                <SelectItem key={p.id} value={p.id} className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer">{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content Area */}
      <Card className="border border-white/5 bg-zinc-900/40 backdrop-blur-md overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
            <p className="text-zinc-500 font-medium">Loading documents...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="h-20 w-20 bg-zinc-800/50 rounded-full flex items-center justify-center mb-6 border border-white/5">
               <Folder className="h-10 w-10 text-zinc-600" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No Documents Found</h3>
            <p className="text-zinc-500 text-sm max-w-sm mb-6">No files match your current filters. Upload a new document to get started.</p>
          </div>
        ) : (
          <div className="relative w-full overflow-x-auto">
            <table className="w-full caption-bottom text-sm text-zinc-300">
              <thead className="[&_tr]:border-b [&_tr]:border-white/5 bg-black/20">
                <tr className="border-b transition-colors hover:bg-white/5">
                  <th className="h-14 px-6 text-left align-middle font-semibold text-zinc-400">Document</th>
                  <th className="h-14 px-6 text-left align-middle font-semibold text-zinc-400">Property</th>
                  <th className="h-14 px-6 text-left align-middle font-semibold text-zinc-400">Size</th>
                  <th className="h-14 px-6 text-left align-middle font-semibold text-zinc-400">Date Uploaded</th>
                  <th className="h-14 px-6 text-right align-middle font-semibold text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="border-b border-white/5 transition-colors hover:bg-white/5 group">
                    <td className="p-6 align-middle font-medium text-zinc-100">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-black/40 flex items-center justify-center shrink-0 border border-white/5">
                          {getFileIcon(doc.fileType)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{doc.title}</p>
                          <p className="text-xs text-zinc-500 truncate max-w-[250px]">{doc.fileName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 align-middle">
                      {doc.propertyId ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          <Building2 className="h-3 w-3" />
                          {properties.find(p => p.id === doc.propertyId)?.name || 'Unknown'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-800 text-zinc-400 border border-white/10">
                          <Folder className="h-3 w-3" />
                          General
                        </span>
                      )}
                    </td>
                    <td className="p-6 align-middle text-zinc-400 text-xs font-medium">
                      {formatSize(doc.size)}
                    </td>
                    <td className="p-6 align-middle text-zinc-400 text-xs">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(doc.uploadedAt), "dd MMM yyyy, HH:mm")}
                      </div>
                    </td>
                    <td className="p-6 align-middle text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-zinc-500 hover:text-sky-400 hover:bg-sky-400/10 transition-colors"
                            title="Download/View"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setDocToDelete(doc)} 
                          className="text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <AlertDialogContent className="bg-zinc-950 border-white/10 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete <span className="text-white font-semibold">{docToDelete?.title}</span>? 
              This action cannot be undone and the file will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100 text-zinc-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white border-0">
              Delete File
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
