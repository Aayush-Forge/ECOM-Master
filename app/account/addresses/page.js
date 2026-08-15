'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getAddresses, getAddressesSync, addAddress, updateAddress, deleteAddress, setDefaultAddress } from '@/lib/api/addresses';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { MapPin, Plus, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { isValidPhoneNumber } from 'libphonenumber-js';

const pincodeRegex = /^\d{6}$/;
const phoneSchema = z
  .string()
  .trim()
  .min(1, { message: 'Phone number is required.' })
  .refine(
    (val) => isValidPhoneNumber(val, 'IN'),
    {
      message: 'Please enter a valid phone number (e.g. 9876543210 or +91 98765 43210).',
    }
  );

const addressSchema = z.object({
  label: z.string().trim().min(1, { message: 'Label is required.' }),
  name: z.string().trim().min(1, { message: 'Full Name is required.' }),
  line1: z.string().trim().min(1, { message: 'Address Line 1 is required.' }),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(1, { message: 'City is required.' }),
  state: z.string().trim().min(1, { message: 'State is required.' }),
  pincode: z
    .string()
    .trim()
    .min(1, { message: 'Pincode is required.' })
    .regex(pincodeRegex, { message: 'Pincode must be exactly 6 digits.' }),
  phone: phoneSchema,
});

export default function AddressesPage() {
  const [addresses, setAddresses] = useState(() => getAddressesSync());
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressToDelete, setAddressToDelete] = useState(null);

  const form = useForm({
    resolver: zodResolver(addressSchema),
    mode: 'onChange',
    defaultValues: {
      label: 'Home',
      name: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
    },
  });

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const data = await getAddresses();
      setAddresses(data || []);
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleOpenAdd = () => {
    setEditingAddress(null);
    form.reset({
      label: 'Home',
      name: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (addr) => {
    setEditingAddress(addr);
    form.reset({
      label: addr.label || 'Home',
      name: addr.name || '',
      line1: addr.line1 || addr.addressLine1 || '',
      line2: addr.line2 || addr.addressLine2 || '',
      city: addr.city || '',
      state: addr.state || '',
      pincode: addr.pincode || '',
      phone: addr.phone || '',
    });
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (addr) => {
    setAddressToDelete(addr);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async (values) => {
    try {
      if (editingAddress) {
        await updateAddress(editingAddress.id, values);
        toast.success('Address updated successfully');
      } else {
        await addAddress(values);
        toast.success('Address added successfully');
      }
      setIsDialogOpen(false);
      fetchAddresses();
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error('Failed to save address');
    }
  };

  const handleDelete = async () => {
    if (!addressToDelete) return;
    try {
      await deleteAddress(addressToDelete.id);
      toast.success('Address deleted successfully');
      setIsDeleteDialogOpen(false);
      fetchAddresses();
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultAddress(id);
      toast.success('Default address updated');
      fetchAddresses();
    } catch (error) {
      console.error('Error setting default address:', error);
      toast.error('Failed to set default address');
    }
  };

  const { isValid, isSubmitting } = form.formState;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-stone-900">Saved Addresses</h2>
        <Button onClick={handleOpenAdd} className="bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold shadow-xs">
          <Plus className="w-4 h-4 mr-1.5" /> Add New Address
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-44 w-full rounded-lg" />
          <Skeleton className="h-44 w-full rounded-lg" />
        </div>
      ) : addresses.length === 0 ? (
        <Card className="bg-white border border-stone-200/80 shadow-xs flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="bg-stone-100 p-4 rounded-full mb-4">
            <MapPin className="w-8 h-8 text-stone-400" />
          </div>
          <h3 className="text-lg font-semibold font-inter text-stone-900 mb-1">No saved addresses</h3>
          <p className="text-stone-600 font-inter text-sm mb-6 max-w-sm">Add a shipping address for faster checkout.</p>
          <Button onClick={handleOpenAdd} className="bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold shadow-xs">
            <Plus className="w-4 h-4 mr-1.5" /> Add Address
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((addr) => (
            <Card key={addr.id} className="bg-white border border-stone-200/80 shadow-xs p-6 flex flex-col justify-between relative">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-lg text-stone-900">{addr.label || 'Address'}</span>
                    {addr.isDefault && (
                      <Badge variant="secondary" className="bg-saffron/10 text-saffron font-inter text-xs border border-saffron/20">
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-500 hover:text-stone-900" onClick={() => handleOpenEdit(addr)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-500 hover:text-red-600" onClick={() => handleOpenDelete(addr)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="font-inter text-sm text-stone-600 space-y-1">
                  <p className="font-medium text-stone-900">{addr.name}</p>
                  <p>{addr.line1 || addr.addressLine1}</p>
                  {(addr.line2 || addr.addressLine2) && <p>{addr.line2 || addr.addressLine2}</p>}
                  <p>{addr.city}, {addr.state} - {addr.pincode}</p>
                  <p className="pt-1 text-stone-500 font-medium">Phone: {addr.phone}</p>
                </div>
              </div>

              {!addr.isDefault && (
                <div className="pt-4 mt-4 border-t border-stone-100">
                  <Button variant="outline" size="sm" onClick={() => handleSetDefault(addr.id)} className="w-full font-inter text-xs text-stone-700 hover:text-stone-900 border-stone-200">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-stone-400" /> Set as Default
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Address Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-stone-900">
              {editingAddress ? 'Edit Address' : 'Add New Address'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-inter text-xs text-stone-700 font-medium">Label</FormLabel>
                      <FormControl>
                        <Input placeholder="Home, Office..." {...field} />
                      </FormControl>
                      <FormMessage className="font-inter text-xs text-red-600 font-medium" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-inter text-xs text-stone-700 font-medium">Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Recipient Name" {...field} />
                      </FormControl>
                      <FormMessage className="font-inter text-xs text-red-600 font-medium" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="line1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-inter text-xs text-stone-700 font-medium">Address Line 1</FormLabel>
                    <FormControl>
                      <Input placeholder="House / Flat No., Building, Street" {...field} />
                    </FormControl>
                    <FormMessage className="font-inter text-xs text-red-600 font-medium" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="line2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-inter text-xs text-stone-700 font-medium">Address Line 2 (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Locality, Landmark" {...field} />
                    </FormControl>
                    <FormMessage className="font-inter text-xs text-red-600 font-medium" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-inter text-xs text-stone-700 font-medium">City</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage className="font-inter text-xs text-red-600 font-medium" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-inter text-xs text-stone-700 font-medium">State</FormLabel>
                      <FormControl>
                        <Input placeholder="State" {...field} />
                      </FormControl>
                      <FormMessage className="font-inter text-xs text-red-600 font-medium" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-inter text-xs text-stone-700 font-medium">Pincode</FormLabel>
                      <FormControl>
                        <Input placeholder="6-digit pincode" {...field} />
                      </FormControl>
                      <FormMessage className="font-inter text-xs text-red-600 font-medium" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-inter text-xs text-stone-700 font-medium">Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="10-digit mobile number" {...field} />
                    </FormControl>
                    <FormMessage className="font-inter text-xs text-red-600 font-medium" />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!isValid || isSubmitting}
                  className="bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold px-5 disabled:bg-stone-200 disabled:text-stone-500 disabled:opacity-100 cursor-pointer disabled:cursor-not-allowed"
                >
                  {editingAddress ? 'Update Address' : 'Save Address'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl text-stone-900">Delete Address</AlertDialogTitle>
            <AlertDialogDescription className="font-inter text-stone-600">
              Are you sure you want to delete this address? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white font-inter">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
