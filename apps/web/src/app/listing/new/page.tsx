'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack, Grid } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@/components/ui';

// Types
type ProductType = 'physical_good' | 'digital_good' | 'service' | 'rwa_token';
type ProductCondition = 'new' | 'used' | 'refurbished';

interface ListingFormData {
  title: string;
  description: string;
  price: string;
  currency: string;
  productType: ProductType;
  condition: ProductCondition;
  category: string;
  subcategory: string;
  tags: string[];
  images: string[];
  stock: number;
  // Physical goods specific
  weight: string;
  shippingOptions: string[];
  // Digital goods specific
  digitalDelivery: string;
  // RWA specific
  tokenAddress: string;
  blockchain: string;
}

// Options
const productTypes: { value: ProductType; label: string; description: string }[] = [
  {
    value: 'physical_good',
    label: 'Physical Good',
    description: 'Tangible items that need shipping',
  },
  {
    value: 'digital_good',
    label: 'Digital Good',
    description: 'Downloadable files or digital content',
  },
  { value: 'service', label: 'Service', description: 'Professional services or consulting' },
  {
    value: 'rwa_token',
    label: 'RWA Token',
    description: 'Real World Asset tokenized on blockchain',
  },
];

const conditions: { value: ProductCondition; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'used', label: 'Used' },
  { value: 'refurbished', label: 'Refurbished' },
];

const categories = [
  {
    value: 'electronics',
    label: 'Electronics',
    subcategories: ['Phones', 'Computers', 'Audio', 'Accessories'],
  },
  { value: 'fashion', label: 'Fashion', subcategories: ['Men', 'Women', 'Kids', 'Accessories'] },
  {
    value: 'home',
    label: 'Home & Garden',
    subcategories: ['Furniture', 'Decor', 'Kitchen', 'Garden'],
  },
  {
    value: 'art',
    label: 'Art & Collectibles',
    subcategories: ['Paintings', 'Sculptures', 'NFTs', 'Vintage'],
  },
  {
    value: 'services',
    label: 'Services',
    subcategories: ['Consulting', 'Design', 'Development', 'Writing'],
  },
  { value: 'other', label: 'Other', subcategories: ['Miscellaneous'] },
];

const currencies = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'BTC', label: 'BTC (₿)' },
  { value: 'ETH', label: 'ETH (Ξ)' },
  { value: 'USDT', label: 'USDT (₮)' },
];

const blockchains = [
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'bsc', label: 'BNB Chain' },
  { value: 'arbitrum', label: 'Arbitrum' },
];

// Initial form state
const initialFormData: ListingFormData = {
  title: '',
  description: '',
  price: '',
  currency: 'USD',
  productType: 'physical_good',
  condition: 'new',
  category: '',
  subcategory: '',
  tags: [],
  images: [],
  stock: 1,
  weight: '',
  shippingOptions: [],
  digitalDelivery: '',
  tokenAddress: '',
  blockchain: 'ethereum',
};

export default function CreateListingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [formData, setFormData] = useState<ListingFormData>(initialFormData);
  const [currentTag, setCurrentTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ListingFormData, string>>>({});

  // Form handlers
  const handleChange = useCallback(
    (field: keyof ListingFormData, value: ListingFormData[keyof ListingFormData]) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      // Clear error when field is modified
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

  const handleAddTag = useCallback(() => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      handleChange('tags', [...formData.tags, currentTag.trim()]);
      setCurrentTag('');
    }
  }, [currentTag, formData.tags, handleChange]);

  const handleRemoveTag = useCallback(
    (tag: string) => {
      handleChange(
        'tags',
        formData.tags.filter(t => t !== tag)
      );
    },
    [formData.tags, handleChange]
  );

  const handleImageUpload = useCallback(() => {
    // Mock image upload - in real app, this would open file picker
    const mockImages = [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop',
    ];
    const randomImage = mockImages[Math.floor(Math.random() * mockImages.length)];
    handleChange('images', [...formData.images, randomImage]);
  }, [formData.images, handleChange]);

  const handleRemoveImage = useCallback(
    (index: number) => {
      handleChange(
        'images',
        formData.images.filter((_, i) => i !== index)
      );
    },
    [formData.images, handleChange]
  );

  // Validation
  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof ListingFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Valid price is required';
    }
    if (formData.images.length === 0) {
      newErrors.images = 'At least one image is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Submit handler
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      setIsSubmitting(true);

      try {
        // Mock API call - in real app, this would call the API
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Success - redirect to profile/store
        toast({
          title: 'Success',
          description: 'Listing created successfully!',
        });
        router.push('/profile');
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to create listing. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [validateForm, router, toast]
  );

  const selectedCategory = categories.find(c => c.value === formData.category);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main className="py-8">
        <Container size="lg">
          {/* Page Header */}
          <HStack gap="md" align="center" className="mb-8">
            <Link
              href="/profile"
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Create New Listing
              </h1>
              <p className="text-slate-500">Add a new product or service to your store</p>
            </div>
          </HStack>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Images */}
                <Card>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    Images *
                  </h2>
                  {errors.images && <p className="text-red-500 text-sm mb-2">{errors.images}</p>}
                  <div className="grid grid-cols-4 gap-4">
                    {formData.images.map((image, index) => (
                      <div
                        key={index}
                        className="relative aspect-square rounded-lg overflow-hidden group"
                      >
                        <img src={image} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          ×
                        </button>
                        {index === 0 && (
                          <span className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded">
                            Cover
                          </span>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleImageUpload}
                      className="aspect-square rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-emerald-500"
                    >
                      <svg
                        className="w-8 h-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      <span className="text-sm">Add Image</span>
                    </button>
                  </div>
                </Card>

                {/* Basic Info */}
                <Card>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    Basic Information
                  </h2>
                  <VStack gap="md">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={e => handleChange('title', e.target.value)}
                        className={`w-full px-4 py-2 rounded-lg border ${
                          errors.title ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                        } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                        placeholder="Enter product title"
                        maxLength={120}
                      />
                      {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={e => handleChange('description', e.target.value)}
                        rows={6}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                        placeholder="Describe your product in detail..."
                      />
                    </div>

                    {/* Price & Currency */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Price *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.price}
                          onChange={e => handleChange('price', e.target.value)}
                          className={`w-full px-4 py-2 rounded-lg border ${
                            errors.price
                              ? 'border-red-500'
                              : 'border-slate-200 dark:border-slate-700'
                          } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                          placeholder="0.00"
                        />
                        {errors.price && (
                          <p className="text-red-500 text-sm mt-1">{errors.price}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Currency
                        </label>
                        <Select
                          value={formData.currency}
                          onValueChange={value => handleChange('currency', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map(c => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </VStack>
                </Card>

                {/* Product Type */}
                <Card>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    Product Type
                  </h2>
                  <Grid cols={2} colsMobile={2} gap="sm">
                    {productTypes.map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleChange('productType', type.value)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          formData.productType === type.value
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <p className="font-medium text-slate-900 dark:text-white text-sm">
                          {type.label}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {type.description}
                        </p>
                      </button>
                    ))}
                  </Grid>
                </Card>

                {/* Type-specific fields */}
                {formData.productType === 'physical_good' && (
                  <Card>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                      Physical Good Details
                    </h2>
                    <VStack gap="md">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Condition
                          </label>
                          <Select
                            value={formData.condition}
                            onValueChange={value =>
                              handleChange('condition', value as ProductCondition)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                            <SelectContent>
                              {conditions.map(c => (
                                <SelectItem key={c.value} value={c.value}>
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Weight (grams)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.weight}
                            onChange={e => handleChange('weight', e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Stock Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.stock}
                          onChange={e => handleChange('stock', parseInt(e.target.value) || 1)}
                          className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </VStack>
                  </Card>
                )}

                {formData.productType === 'rwa_token' && (
                  <Card>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                      RWA Token Details
                    </h2>
                    <VStack gap="md">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Token Contract Address
                        </label>
                        <input
                          type="text"
                          value={formData.tokenAddress}
                          onChange={e => handleChange('tokenAddress', e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                          placeholder="0x..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Blockchain
                        </label>
                        <Select
                          value={formData.blockchain}
                          onValueChange={value => handleChange('blockchain', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select blockchain" />
                          </SelectTrigger>
                          <SelectContent>
                            {blockchains.map(b => (
                              <SelectItem key={b.value} value={b.value}>
                                {b.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </VStack>
                  </Card>
                )}

                {/* Tags */}
                <Card>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    Tags
                  </h2>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={currentTag}
                      onChange={e => setCurrentTag(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Add a tag..."
                    />
                    <Button type="button" onClick={handleAddTag}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-sm"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="w-4 h-4 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Category */}
                <Card>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    Category *
                  </h2>
                  {errors.category && (
                    <p className="text-red-500 text-sm mb-2">{errors.category}</p>
                  )}
                  <VStack gap="sm">
                    <Select
                      value={formData.category}
                      onValueChange={value => {
                        handleChange('category', value);
                        handleChange('subcategory', '');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(c => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedCategory && (
                      <Select
                        value={formData.subcategory}
                        onValueChange={value => handleChange('subcategory', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subcategory" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedCategory.subcategories.map(sub => (
                            <SelectItem key={sub} value={sub}>
                              {sub}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </VStack>
                </Card>

                {/* Preview */}
                <Card>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    Preview
                  </h2>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="aspect-square bg-slate-100 dark:bg-slate-800">
                      {formData.images[0] ? (
                        <img
                          src={formData.images[0]}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-slate-900 dark:text-white line-clamp-2">
                        {formData.title || 'Product Title'}
                      </h3>
                      <p className="text-lg font-bold text-emerald-600 mt-2">
                        {formData.price
                          ? `${formData.currency === 'USD' ? '$' : formData.currency + ' '}${formData.price}`
                          : '$0.00'}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Actions */}
                <Card>
                  <VStack gap="sm">
                    <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                      {isSubmitting ? 'Creating...' : 'Create Listing'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => router.back()}
                    >
                      Cancel
                    </Button>
                  </VStack>
                </Card>
              </div>
            </div>
          </form>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
