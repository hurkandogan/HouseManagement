"use client";

import { useEffect, useState } from "react";
import { getProperties, createProperty, updateProperty, deleteProperty, Property } from "@/app/actions/properties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit2, MapPin, Building, Building2, Home, Briefcase, User as UserIcon, Loader2, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
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
import { useToast } from "@/lib/contexts/ToastContext";

export default function PropertiesPage() {
  const { showToast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form states
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState<Property["type"]>("building");
  const [parentId, setParentId] = useState<string>("none");

  const loadProperties = async () => {
    const data = await getProperties();
    setProperties(data);
    setLoading(false);
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const resetForm = () => {
    setName("");
    setAddress("");
    setType("building");
    setParentId("none");
    setEditingId(null);
    setIsSubmitting(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const handleEdit = (property: Property) => {
    setName(property.name);
    setAddress(property.address || "");
    setType(property.type);
    setParentId(property.parentId || "none");
    setEditingId(property.id);
    setOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Please enter a property name.", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: name.trim(),
        address: address.trim(),
        type,
        parentId: parentId === "none" ? null : parentId
      };

      let res;
      if (editingId) {
        res = await updateProperty(editingId, payload);
      } else {
        res = await createProperty(payload);
      }
      
      if (res.success) {
        showToast(editingId ? "Property updated successfully" : "Property created successfully", "success");
        setOpen(false);
        resetForm();
        loadProperties();
      } else {
        showToast(res.error || "Failed to save property", "error");
      }
    } catch (err: any) {
      showToast(err?.message || "An error occurred while saving property", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDelete = async () => {
    if (propertyToDelete) {
      try {
        const res = await deleteProperty(propertyToDelete);
        if (res.success) {
          showToast("Property deleted successfully", "success");
          setPropertyToDelete(null);
          loadProperties();
        } else {
          showToast(res.error || "Failed to delete property", "error");
        }
      } catch (err: any) {
        showToast(err?.message || "Error deleting property", "error");
      }
    }
  };

  const getTypeIcon = (t: string) => {
    switch(t) {
      case 'building': return <Building className="h-4 w-4" />;
      case 'apartment': return <Home className="h-4 w-4" />;
      case 'private': return <UserIcon className="h-4 w-4" />;
      case 'corporate': return <Briefcase className="h-4 w-4" />;
      default: return <Building2 className="h-4 w-4" />;
    }
  };

  const typeLabels = {
    building: "Building",
    apartment: "Apartment",
    private: "Private",
    corporate: "Corporate"
  };

  const buildings = properties.filter(p => !p.parentId);

  // Group properties into a tree structure
  const sortedProperties = (() => {
    const sorted: (Property & { level: number })[] = [];
    const roots = properties.filter(p => !p.parentId);
    
    roots.forEach(root => {
      sorted.push({ ...root, level: 0 });
      const children = properties.filter(p => p.parentId === root.id);
      children.forEach(child => {
        sorted.push({ ...child, level: 1 });
      });
    });
    
    // Add any orphans (children whose parent was deleted or not found)
    const orphans = properties.filter(p => p.parentId && !roots.find(r => r.id === p.parentId));
    orphans.forEach(o => sorted.push({ ...o, level: 0 }));
    
    return sorted;
  })();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Properties</h2>
          <p className="text-zinc-400 text-sm">Manage buildings, apartments, and portfolios.</p>
        </div>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all">
              <Plus className="mr-2 h-4 w-4" /> Add Property
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px] bg-zinc-950/95 backdrop-blur-xl border-white/10 text-zinc-100 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">{editingId ? "Edit Property" : "New Property"}</DialogTitle>
              <DialogDescription className="text-zinc-400">
                {editingId ? "Update the details of your property." : "Add a new building, apartment, or private account."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-300 font-medium">Name</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g. Gaisbergstr. 10" 
                  required 
                  className="bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 focus-visible:ring-offset-0 focus-visible:border-indigo-500 text-zinc-100 placeholder:text-zinc-600 rounded-lg h-11"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address" className="text-zinc-300 font-medium">Address (Optional)</Label>
                <div className="relative flex items-center">
                  <MapPin className="absolute left-3.5 h-4 w-4 text-zinc-500 pointer-events-none" />
                  <Input 
                    id="address" 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                    placeholder="Full address" 
                    className="bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 focus-visible:ring-offset-0 focus-visible:border-indigo-500 text-zinc-100 pl-10 placeholder:text-zinc-600 rounded-lg h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300 font-medium">Property Type</Label>
                <Select value={type} onValueChange={(val) => setType(val as any)}>
                  <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 focus:ring-indigo-500 focus:ring-offset-0 text-zinc-100 rounded-lg h-11">
                    <SelectValue placeholder="Select type">
                      {typeLabels[type as keyof typeof typeLabels]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false} className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <SelectItem value="building" className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer">Building</SelectItem>
                    <SelectItem value="apartment" className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer">Apartment</SelectItem>
                    <SelectItem value="private" className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer">Private Account</SelectItem>
                    <SelectItem value="corporate" className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer">Corporate Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {type === "apartment" && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <Label className="text-zinc-300 font-medium">Parent Building</Label>
                  <Select value={parentId} onValueChange={setParentId}>
                    <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 focus:ring-indigo-500 focus:ring-offset-0 text-zinc-100 rounded-lg h-11">
                      <SelectValue placeholder="Select Building">
                        {parentId === "none" ? "-- None --" : properties.find(p => p.id === parentId)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false} className="bg-zinc-900 border-zinc-800 text-zinc-100 max-h-60">
                      <SelectItem value="none" className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer">-- None --</SelectItem>
                      {buildings.map(b => (
                        <SelectItem key={b.id} value={b.id} className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer">{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <DialogFooter className="pt-4 border-t border-white/5">
                <Button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-0">
                  {editingId ? "Save Changes" : "Save Property"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border border-white/5 bg-zinc-900/40 backdrop-blur-md overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
            <p className="text-zinc-500 font-medium">Loading properties...</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="h-20 w-20 bg-zinc-800/50 rounded-full flex items-center justify-center mb-6 border border-white/5">
               <Building2 className="h-10 w-10 text-zinc-600" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No Properties Found</h3>
            <p className="text-zinc-500 text-sm max-w-sm mb-6">You haven&apos;t added any properties yet. Get started by adding your first building or apartment.</p>
            <Button onClick={() => setOpen(true)} variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white">
              Add First Property
            </Button>
          </div>
        ) : (
          <div className="relative w-full overflow-x-auto">
            <table className="w-full caption-bottom text-sm text-zinc-300">
              <thead className="[&_tr]:border-b [&_tr]:border-white/5 bg-black/20">
                <tr className="border-b transition-colors hover:bg-white/5 data-[state=selected]:bg-zinc-800">
                  <th className="h-14 px-6 text-left align-middle font-semibold text-zinc-400">Name</th>
                  <th className="h-14 px-6 text-left align-middle font-semibold text-zinc-400">Address</th>
                  <th className="h-14 px-6 text-left align-middle font-semibold text-zinc-400">Type</th>
                  <th className="h-14 px-6 text-left align-middle font-semibold text-zinc-400">Parent</th>
                  <th className="h-14 px-6 text-right align-middle font-semibold text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {sortedProperties.map((property) => (
                  <tr key={property.id} className="border-b border-white/5 transition-colors hover:bg-white/5 group">
                    <td className="p-6 align-middle font-medium text-zinc-100">
                      <div className="flex items-center gap-3" style={{ paddingLeft: `${property.level * 2}rem` }}>
                        {property.level > 0 && (
                          <div className="w-4 h-[1px] bg-zinc-700 shrink-0" />
                        )}
                        <div className="h-8 w-8 rounded-md bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
                          {getTypeIcon(property.type)}
                        </div>
                        <span className="truncate">{property.name}</span>
                      </div>
                    </td>
                    <td className="p-6 align-middle text-zinc-400 max-w-[200px] truncate">
                      {property.address ? (
                        <div className="flex items-center gap-2">
                           <MapPin className="h-3 w-3 text-zinc-500 flex-shrink-0" />
                           <span className="truncate">{property.address}</span>
                        </div>
                      ) : <span className="text-zinc-600">-</span>}
                    </td>
                    <td className="p-6 align-middle">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold bg-zinc-800/80 text-zinc-300 border border-white/10">
                        {typeLabels[property.type]}
                      </span>
                    </td>
                    <td className="p-6 align-middle text-zinc-500">
                      {property.parentId ? (
                         <span className="inline-flex items-center gap-2 text-zinc-400">
                           <Building className="h-3 w-3" />
                           {properties.find(p => p.id === property.parentId)?.name || '-'}
                         </span>
                      ) : '-'}
                    </td>
                    <td className="p-6 align-middle text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/properties/${property.id}`} passHref>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                            title="View Dashboard"
                          >
                            <LayoutDashboard className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEdit(property)} 
                          className="text-zinc-500 hover:text-indigo-400 hover:bg-indigo-400/10 transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setPropertyToDelete(property.id)} 
                          className="text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
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
      <AlertDialog open={!!propertyToDelete} onOpenChange={(open) => !open && setPropertyToDelete(null)}>
        <AlertDialogContent className="bg-zinc-950 border-white/10 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This action cannot be undone. This will permanently delete the property.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100 text-zinc-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-red-600 hover:bg-red-700 text-white border-0">
              Delete Property
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
