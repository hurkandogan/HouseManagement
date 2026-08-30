"use client";

import React, { useEffect, useState } from "react";
import { getContracts, createContract, updateContract, cancelContract, Contract } from "@/app/actions/contracts";
import { getProperties, Property } from "@/app/actions/properties";
import { getExpenses, Expense } from "@/app/actions/expenses";
import { getCategories, Category } from "@/app/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { cn, formatCurrency, parseDDMMYYYY, formatDateDDMMYYYY } from "@/lib/utils";
import { useToast } from "@/lib/contexts/ToastContext";
import { Plus, Receipt, FileSignature, MapPin, Loader2, FileText, Upload, CalendarIcon, ExternalLink, Edit2, Ban, History, ArrowRight, Link as LinkIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
// Will reuse the expense component later or embed form here for recording payments.
import { useRouter } from "next/navigation";

export default function ContractsPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [open, setOpen] = useState(false);
  const [showCanceled, setShowCanceled] = useState(false);
  const [contractToCancel, setContractToCancel] = useState<Contract | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [oldDocumentUrl, setOldDocumentUrl] = useState<string | null>(null);
  const [oldFileName, setOldFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form
  const [propertyId, setPropertyId] = useState("");
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [category, setCategory] = useState<string>("");
  const [startDateStr, setStartDateStr] = useState(formatDateDDMMYYYY(new Date()));
  const [endDateStr, setEndDateStr] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [c, p, e, cat] = await Promise.all([
      getContracts(),
      getProperties(),
      getExpenses(),
      getCategories()
    ]);
    setContracts(c);
    setProperties(p);
    setExpenses(e);
    setCategories(cat);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setPropertyId("");
    setTitle("");
    setProvider("");
    setContractNumber("");
    setCategory("");
    setStartDateStr(formatDateDDMMYYYY(new Date()));
    setEndDateStr("");
    setFile(null);
    setEditingId(null);
    setOldDocumentUrl(null);
    setOldFileName(null);
    setIsSubmitting(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) resetForm();
  };

  const handleEdit = (c: Contract) => {
    setPropertyId(c.propertyId);
    setTitle(c.title);
    setProvider(c.provider);
    setContractNumber(c.contractNumber);
    setCategory(c.category);
    setStartDateStr(formatDateDDMMYYYY(c.startDate));
    setEndDateStr(c.endDate ? formatDateDDMMYYYY(c.endDate) : "");
    setEditingId(c.id);
    setOldDocumentUrl(c.documentUrl);
    setOldFileName(c.fileName);
    setFile(null);
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) {
      showToast("Please select a property.", "error");
      return;
    }

    const parsedStart = parseDDMMYYYY(startDateStr);
    if (!parsedStart) {
      showToast("Invalid Start Date format. Please use DD.MM.YYYY (e.g. 01.01.2026)", "error");
      return;
    }

    let parsedEnd: Date | null = null;
    if (endDateStr.trim()) {
      parsedEnd = parseDDMMYYYY(endDateStr);
      if (!parsedEnd) {
        showToast("Invalid End Date format. Please use DD.MM.YYYY (e.g. 31.12.2026)", "error");
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("propertyId", propertyId);
      formData.append("title", title);
      formData.append("provider", provider);
      formData.append("contractNumber", contractNumber);
      formData.append("category", category);
      formData.append("startDate", parsedStart.toISOString());
      if (parsedEnd) formData.append("endDate", parsedEnd.toISOString());
      if (file) formData.append("file", file);
      if (oldFileName) formData.append("oldFileName", oldFileName);

      let res;
      if (editingId) {
        formData.append("status", "active");
        res = await updateContract(editingId, formData, oldDocumentUrl);
      } else {
        res = await createContract(formData);
      }

      if (res.success) {
        showToast(editingId ? "Contract updated successfully" : "Contract created successfully", "success");
        setOpen(false);
        resetForm();
        loadData();
      } else {
        showToast(res.error || "Failed to save contract", "error");
      }
    } catch (err: any) {
      showToast(err?.message || "An error occurred while saving the contract", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeCancel = async () => {
    if (contractToCancel) {
      try {
        const res = await cancelContract(contractToCancel.id, contractToCancel.documentUrl);
        if (res.success) {
          showToast("Contract cancelled successfully", "success");
          setContractToCancel(null);
          loadData();
        } else {
          showToast(res.error || "Failed to cancel contract", "error");
        }
      } catch (err: any) {
        showToast(err?.message || "Error cancelling contract", "error");
      }
    }
  };

  const handleRecordPayment = (contract: Contract) => {
    router.push(`/expenses?action=pay&contractId=${contract.id}&propertyId=${contract.propertyId}&category=${contract.category}`);
  };

  const visibleContracts = contracts.filter(c => showCanceled ? true : c.status === "active");

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Contracts & Insurances</h2>
          <p className="text-zinc-400 text-sm">Manage service agreements, insurance policies and warranties.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2 bg-zinc-900/50 border border-white/5 px-3 py-2 rounded-lg">
            <Switch 
              id="canceled-mode" 
              checked={showCanceled}
              onCheckedChange={setShowCanceled}
            />
            <Label htmlFor="canceled-mode" className="text-sm font-medium text-zinc-400 cursor-pointer">
              Show Canceled
            </Label>
          </div>

          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all">
                <Plus className="mr-2 h-4 w-4" /> Add Contract
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-zinc-950/95 backdrop-blur-xl border-white/10 text-zinc-100 shadow-2xl overflow-visible">
              <DialogHeader>
                <DialogTitle className="text-xl">{editingId ? "Edit Contract" : "New Contract"}</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Enter policy or agreement details.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-5 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label className="text-zinc-300 font-medium">Property</Label>
                    <Select value={propertyId} onValueChange={setPropertyId} required>
                      <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-zinc-100 rounded-lg h-11">
                        <SelectValue placeholder="Select property">
                          {properties.find(p => p.id === propertyId)?.name || "Select property"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-h-60">
                        {properties.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-zinc-300 font-medium">Title (e.g. Gebäudeversicherung)</Label>
                    <Input required value={title} onChange={e => setTitle(e.target.value)} className="bg-zinc-900 border-zinc-800 text-zinc-100 h-11" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-zinc-300 font-medium">Provider (e.g. Allianz)</Label>
                    <Input required value={provider} onChange={e => setProvider(e.target.value)} className="bg-zinc-900 border-zinc-800 text-zinc-100 h-11" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-300 font-medium">Contract/Policy Number</Label>
                    <Input required value={contractNumber} onChange={e => setContractNumber(e.target.value)} className="bg-zinc-900 border-zinc-800 text-zinc-100 h-11" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-300 font-medium">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-zinc-100 rounded-lg h-11">
                        <SelectValue placeholder="Select category">
                          {categories.find(c => c.value === category)?.label || "Select category"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 flex flex-col">
                    <Label htmlFor="start-date" className="text-zinc-300 font-medium">Start Date (DD.MM.YYYY)</Label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
                      <Input
                        id="start-date"
                        type="text"
                        value={startDateStr}
                        onChange={(e) => setStartDateStr(e.target.value)}
                        placeholder="DD.MM.YYYY (e.g. 01.01.2026)"
                        required
                        className="bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 text-zinc-100 pl-9 placeholder:text-zinc-600 rounded-lg h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 flex flex-col">
                    <Label htmlFor="end-date" className="text-zinc-300 font-medium">End Date (Optional)</Label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
                      <Input
                        id="end-date"
                        type="text"
                        value={endDateStr}
                        onChange={(e) => setEndDateStr(e.target.value)}
                        placeholder="Auto-renews or DD.MM.YYYY"
                        className="bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 text-zinc-100 pl-9 placeholder:text-zinc-600 rounded-lg h-11"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="text-zinc-300 font-medium">Original Contract Document {editingId && oldFileName ? "(Replace existing)" : "(Optional)"}</Label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-zinc-800 border-dashed rounded-lg cursor-pointer bg-zinc-900/50 hover:bg-zinc-800/50">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {file ? (
                          <>
                            <FileText className="w-8 h-8 text-indigo-400 mb-2" />
                            <p className="text-sm text-zinc-200 font-medium">{file.name}</p>
                          </>
                        ) : oldFileName && !file ? (
                          <>
                            <FileText className="w-8 h-8 text-zinc-400 mb-2" />
                            <p className="text-sm text-zinc-200 font-medium">Current: {oldFileName}</p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-zinc-500 mb-2" />
                            <p className="mb-2 text-sm text-zinc-400">Click to upload original agreement PDF</p>
                          </>
                        )}
                      </div>
                      <input type="file" className="hidden" onChange={(e) => { if (e.target.files && e.target.files[0]) setFile(e.target.files[0]); }} accept=".pdf,.png,.jpg,.jpeg,.webp" />
                    </label>
                  </div>
                </div>
                
                <DialogFooter className="pt-4 border-t border-white/5">
                  <Button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border-0 disabled:opacity-70">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingId ? "Save Changes" : "Create Contract")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border border-white/5 bg-zinc-900/40 backdrop-blur-md overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 text-center">
            <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mx-auto mb-4" />
            <p className="text-zinc-500 font-medium">Loading contracts...</p>
          </div>
        ) : contracts.length === 0 ? (
          <div className="p-16 text-center">
            <FileSignature className="h-10 w-10 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No Contracts Found</h3>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto mb-6">Manage all your property insurance and maintenance agreements here.</p>
          </div>
        ) : (
          <div className="relative w-full overflow-x-auto">
            <table className="w-full caption-bottom text-sm text-zinc-300">
              <thead className="bg-black/20">
                <tr className="border-b border-white/5 text-left text-zinc-400">
                  <th className="h-14 px-6 font-semibold w-6"></th>
                  <th className="h-14 px-6 font-semibold">Title & Provider</th>
                  <th className="h-14 px-6 font-semibold">Property</th>
                  <th className="h-14 px-6 font-semibold">Policy No.</th>
                  <th className="h-14 px-6 font-semibold">Status / Category</th>
                  <th className="h-14 px-6 font-semibold text-center">Doc</th>
                  <th className="h-14 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleContracts.map((contract) => {
                  const property = properties.find(p => p.id === contract.propertyId);
                  const isCanceled = contract.status === "canceled";
                  const isExpanded = expandedId === contract.id;
                  const contractExpenses = expenses.filter(e => e.contractId === contract.id && !e.isArchived);
                  
                  return (
                    <React.Fragment key={contract.id}>
                      <tr className={cn("border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer", isCanceled && "opacity-50 grayscale", isExpanded && "bg-white/5")} onClick={() => setExpandedId(isExpanded ? null : contract.id)}>
                        <td className="px-6 py-4">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-zinc-500">
                            <ArrowRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
                          </Button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-zinc-100">{contract.title}</div>
                          <div className="text-xs text-zinc-500">{contract.provider}</div>
                        </td>
                        <td className="px-6 py-4 text-zinc-400">
                          {property?.name || "Deleted Property"}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-indigo-300">
                          {contract.contractNumber}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 items-start">
                            {isCanceled ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-red-500/20 text-red-400 border border-red-500/30">Canceled</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-green-500/20 text-green-400 border border-green-500/30">Active</span>
                            )}
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold bg-zinc-800/80 text-zinc-400 border border-white/5">
                              {categories.find(c => c.value === contract.category)?.label || contract.category}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {contract.documentUrl ? (
                             <div className="flex items-center justify-center gap-2">
                               <a href={contract.documentUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="inline-flex items-center h-8 w-8 rounded-full bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 justify-center">
                                 <ExternalLink className="h-4 w-4" />
                               </a>
                               <button
                                 onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(contract.documentUrl!); }}
                                 className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20 hover:text-zinc-300 transition-colors"
                                 title="Copy Link"
                               >
                                 <LinkIcon className="h-4 w-4" />
                               </button>
                             </div>
                          ) : "-"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-400/10 text-xs px-2" onClick={() => handleRecordPayment(contract)}>
                              <Receipt className="h-3 w-3 mr-1" /> Pay
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(contract)} className="text-zinc-500 hover:text-indigo-400 hover:bg-indigo-400/10">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {!isCanceled && (
                              <Button variant="ghost" size="icon" onClick={() => setContractToCancel(contract)} className="text-zinc-500 hover:text-red-400 hover:bg-red-400/10">
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Expanded History Row */}
                      {isExpanded && (
                        <tr className="bg-black/40 border-b border-white/5">
                          <td colSpan={7} className="p-6">
                            <div className="ml-12 border-l-2 border-indigo-500/30 pl-6 py-2">
                              <h4 className="text-sm font-semibold text-zinc-200 flex items-center mb-4">
                                <History className="w-4 h-4 mr-2 text-indigo-400" /> Payment History (Expenses)
                              </h4>
                              {contractExpenses.length === 0 ? (
                                <p className="text-sm text-zinc-500 italic">No payments recorded for this contract yet.</p>
                              ) : (
                                <div className="space-y-3">
                                  {contractExpenses.map(exp => (
                                    <div key={exp.id} className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-white/5 max-w-2xl">
                                      <div className="flex items-center gap-4">
                                        <div className="bg-zinc-800 p-2 rounded-md">
                                          <CalendarIcon className="w-4 h-4 text-zinc-400" />
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-zinc-200">{format(new Date(exp.date), "dd.MM.yyyy")}</p>
                                          <p className="text-xs text-zinc-500">{exp.title}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-6">
                                        <p className="text-sm font-bold text-zinc-100">{formatCurrency(exp.amount)}</p>
                                        {exp.documentUrl && (
                                          <a href={exp.documentUrl} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300">
                                            <FileText className="w-4 h-4" />
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AlertDialog open={!!contractToCancel} onOpenChange={(open) => !open && setContractToCancel(null)}>
        <AlertDialogContent className="bg-zinc-950 border-white/10 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Contract?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to cancel the contract <strong>{contractToCancel?.title} ({contractToCancel?.provider})</strong>? 
              <br/><br/>This will mark it as canceled, hide it from active views, and move its document to the archive folder in storage. Old expense records will be safely preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 border-zinc-800 text-zinc-300">Keep Active</AlertDialogCancel>
            <AlertDialogAction onClick={executeCancel} className="bg-red-600 hover:bg-red-700 text-white border-0">
              Cancel Contract
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
