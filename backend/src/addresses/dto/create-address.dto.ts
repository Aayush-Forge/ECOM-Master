export class CreateAddressDto {
  label: string;
  name?: string;
  fullName?: string;
  phone: string;
  line1?: string;
  addressLine1?: string;
  line2?: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
}
