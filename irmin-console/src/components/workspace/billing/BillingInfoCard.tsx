'use client';

import { useEffect } from 'react';

import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { useBilling } from '@/hooks/api/useBilling';
import { useResourceAllowed } from '@/hooks/utils';

import type { BillingInfo } from '@/types/core/Billing';

interface BillingInfoFormValues {
  name: string;
  tax_id_value: string;
  tax_id_type: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

const TAX_ID_NONE = 'none';

const TAX_ID_TYPE_OPTIONS = [
  { value: TAX_ID_NONE, label: '-' },
  { value: 'eu_vat', label: 'EU VAT' },
  { value: 'us_ein', label: 'US EIN' },
  { value: 'gb_vat', label: 'GB VAT' },
  { value: 'au_abn', label: 'AU ABN' },
  { value: 'nz_gst', label: 'NZ GST' },
  { value: 'ca_bn', label: 'CA BN' },
];

/**
 * Billing info form card for managing company name, tax ID, and billing address.
 */
const BillingInfoCard = () => {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();
  const { billingInfo, billingInfoQuery, updateBillingInfoMutation } =
    useBilling({ fetchBillingInfo: true });
  const { isResourceAllowed } = useResourceAllowed();

  const disabled = !isResourceAllowed('billing', 'update');
  const isLoading = billingInfoQuery.isPending;

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<BillingInfoFormValues>({
    defaultValues: {
      name: '',
      tax_id_value: '',
      tax_id_type: TAX_ID_NONE,
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
    },
  });

  // Sync form values when billing info loads or changes
  useEffect(() => {
    if (billingInfo) {
      reset({
        name: billingInfo.name ?? '',
        tax_id_value: billingInfo.tax_id?.[0] ?? '',
        tax_id_type: billingInfo.tax_id?.[1] ?? TAX_ID_NONE,
        line1: billingInfo.billing_address?.line1 ?? '',
        line2: billingInfo.billing_address?.line2 ?? '',
        city: billingInfo.billing_address?.city ?? '',
        state: billingInfo.billing_address?.state ?? '',
        postal_code: billingInfo.billing_address?.postal_code ?? '',
        country: billingInfo.billing_address?.country ?? '',
      });
    }
  }, [billingInfo, reset]);

  const onSubmit = (data: BillingInfoFormValues) => {
    const update: Partial<BillingInfo> = {
      name: data.name,
    };

    // Always send billing_address so clearing fields actually clears the data
    update.billing_address = {
      line1: data.line1,
      line2: data.line2,
      city: data.city,
      state: data.state,
      postal_code: data.postal_code,
      country: data.country,
    };

    // Send tax_id if both fields are set, otherwise send null to clear
    if (
      data.tax_id_value &&
      data.tax_id_type &&
      data.tax_id_type !== TAX_ID_NONE
    ) {
      update.tax_id = [data.tax_id_value, data.tax_id_type];
    } else {
      update.tax_id = null;
    }

    updateBillingInfoMutation.mutate(update, {
      onSuccess: () => {
        irminAlert('success', dict.workspace.billingInfoSaved);
      },
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className='flex items-center justify-center py-8'>
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.workspace.billingInfo}</CardTitle>
        <CardDescription>
          {dict.workspace.billingInfoDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-6'>
          {/* Company Name */}
          <div className='flex flex-col gap-2'>
            <Label>{dict.workspace.billingCompanyName}</Label>
            <Controller
              name='name'
              control={control}
              render={({ field }) => (
                <Input
                  type='text'
                  {...field}
                  disabled={disabled || updateBillingInfoMutation.isPending}
                />
              )}
            />
          </div>

          {/* Tax ID */}
          <div className='flex flex-col gap-2'>
            <Label>{dict.workspace.billingTaxID}</Label>
            <div
              className='
                grid grid-cols-1 gap-2
                sm:grid-cols-2
              '
            >
              <Controller
                name='tax_id_value'
                control={control}
                render={({ field }) => (
                  <Input
                    type='text'
                    placeholder='e.g. FI12345678'
                    {...field}
                    disabled={disabled || updateBillingInfoMutation.isPending}
                  />
                )}
              />
              <Controller
                name='tax_id_type'
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={disabled || updateBillingInfoMutation.isPending}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue>
                        {TAX_ID_TYPE_OPTIONS.find(
                          (o) => o.value === field.value
                        )?.label ?? '-'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {TAX_ID_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Billing Address */}
          <div className='flex flex-col gap-3'>
            <Label className='text-sm font-medium'>
              {dict.workspace.billingAddress}
            </Label>
            <div className='flex flex-col gap-2'>
              <Controller
                name='line1'
                control={control}
                render={({ field }) => (
                  <Input
                    type='text'
                    placeholder={dict.workspace.billingAddressLine1}
                    {...field}
                    disabled={disabled || updateBillingInfoMutation.isPending}
                  />
                )}
              />
              <Controller
                name='line2'
                control={control}
                render={({ field }) => (
                  <Input
                    type='text'
                    placeholder={dict.workspace.billingAddressLine2}
                    {...field}
                    disabled={disabled || updateBillingInfoMutation.isPending}
                  />
                )}
              />
              <div
                className='
                  grid grid-cols-1 gap-2
                  sm:grid-cols-2
                '
              >
                <Controller
                  name='city'
                  control={control}
                  render={({ field }) => (
                    <Input
                      type='text'
                      placeholder={dict.workspace.billingCity}
                      {...field}
                      disabled={disabled || updateBillingInfoMutation.isPending}
                    />
                  )}
                />
                <Controller
                  name='state'
                  control={control}
                  render={({ field }) => (
                    <Input
                      type='text'
                      placeholder={dict.workspace.billingState}
                      {...field}
                      disabled={disabled || updateBillingInfoMutation.isPending}
                    />
                  )}
                />
              </div>
              <div
                className='
                  grid grid-cols-1 gap-2
                  sm:grid-cols-2
                '
              >
                <Controller
                  name='postal_code'
                  control={control}
                  render={({ field }) => (
                    <Input
                      type='text'
                      placeholder={dict.workspace.billingPostalCode}
                      {...field}
                      disabled={disabled || updateBillingInfoMutation.isPending}
                    />
                  )}
                />
                <Controller
                  name='country'
                  control={control}
                  render={({ field }) => (
                    <Input
                      type='text'
                      placeholder={dict.workspace.billingCountry + ' (e.g. FI)'}
                      {...field}
                      disabled={disabled || updateBillingInfoMutation.isPending}
                    />
                  )}
                />
              </div>
            </div>
          </div>

          <Button
            className='
              h-11 w-full
              sm:w-auto
            '
            type='submit'
            size='sm'
            disabled={!isDirty || disabled}
            loading={updateBillingInfoMutation.isPending}
          >
            {dict.common.saveChanges}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default BillingInfoCard;
