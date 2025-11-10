
import React, { useState } from 'react';
import { ProductImage } from '../types';
import { GradientInput } from './GradientInput';
import { ImageIcon } from './icons';

interface ProductInputProps {
  onGenerateBriefs: (description: string, image: ProductImage | null, inspirationImage: ProductImage | null) => void;
  initialDescription: string;
  error: string | null;
}

const placeholders = [
    "A productivity app for small teams that integrates project management, chat, and document sharing.",
    "A single-origin, artisan-roasted coffee brand targeting connoisseurs.",
    "Eco-friendly sneakers made from recycled materials for environmentally conscious consumers.",
    "A gourmet meal kit subscription service for busy couples.",
    "An organic, vegan skincare line with sustainable packaging.",
];

const ProductInput: React.FC<ProductInputProps> = ({ onGenerateBriefs, initialDescription, error }) => {
  const [description, setDescription] = useState<string>(initialDescription);
  const [productImage, setProductImage] = useState<ProductImage | null>(null);
  const [inspirationImage, setInspirationImage] = useState<ProductImage | null>(null);
  const [productFileName, setProductFileName] = useState<string>('');
  const [inspirationFileName, setInspirationFileName] = useState<string>('');
  
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setImage: React.Dispatch<React.SetStateAction<ProductImage | null>>,
    setFileName: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setImage({
            base64: base64Data,
            mimeType: file.type,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim()) {
      onGenerateBriefs(description, productImage, inspirationImage);
    }
  };

  return (
    <div className="w-full max-w-2xl p-4 animate-fade-in">
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-8">
        <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800">Describe Your Product</h2>
            <p className="text-gray-600 mt-2 max-w-xl">
            Provide a description and optionally, an image of your product and one for inspiration to create a tailored marketing strategy.
            </p>
        </div>

        <GradientInput>
          <div className="relative">
            {description.length === 0 && (
                 <div className="absolute inset-0 p-1 text-gray-400 pointer-events-none" aria-hidden="true">
                    {placeholders.map((text, index) => (
                        <p
                            key={index}
                            className="absolute inset-0"
                            style={{
                                animation: `cycle-placeholders 20s linear infinite`,
                                animationDelay: `${index * 4}s`,
                                opacity: 0,
                            }}
                        >
                            For example: '{text}'
                        </p>
                    ))}
                </div>
            )}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none border-0 bg-transparent text-gray-800 placeholder:text-transparent text-base leading-6 p-1 focus:outline-none focus:ring-0 relative z-10"
              rows={4}
              onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
              }}
              style={{ minHeight: '96px', maxHeight: '160px' }}
              aria-label="Product description input"
            />
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-wrap items-center gap-3">
            {/* Product Image Input */}
            <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 rounded-full transition-colors cursor-pointer bg-slate-100 hover:bg-slate-200 border border-slate-300">
                    <ImageIcon className="w-4 h-4" />
                    <span className="truncate max-w-[120px]">{productFileName || 'Product'}</span>
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setProductImage, setProductFileName)} className="hidden" />
                </label>
                {productImage && (
                    <div className="flex-shrink-0 w-10 h-10 p-1 border border-gray-200 rounded-md bg-white shadow-sm">
                        <img src={`data:${productImage.mimeType};base64,${productImage.base64}`} alt="Product preview" className="w-full h-full object-contain rounded-sm" />
                    </div>
                )}
            </div>

            {/* Inspiration Image Input */}
            <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 rounded-full transition-colors cursor-pointer bg-slate-100 hover:bg-slate-200 border border-slate-300">
                    <ImageIcon className="w-4 h-4" />
                    <span className="truncate max-w-[120px]">{inspirationFileName || 'Inspiration'}</span>
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setInspirationImage, setInspirationFileName)} className="hidden" />
                </label>
                 {inspirationImage && (
                    <div className="flex-shrink-0 w-10 h-10 p-1 border border-gray-200 rounded-md bg-white shadow-sm">
                        <img src={`data:${inspirationImage.mimeType};base64,${inspirationImage.base64}`} alt="Inspiration preview" className="w-full h-full object-contain rounded-sm" />
                    </div>
                )}
            </div>
          </div>
           <p className="text-xs text-gray-500 mt-3 text-left w-full pl-1">
            <b>Inspiration:</b> We'll analyze the style (colors, mood), not the brand.
          </p>
        </GradientInput>

        {error && <p className="text-red-500 mt-2">{error}</p>}

        <button
          type="submit"
          disabled={!description.trim()}
          className="px-8 py-3 bg-gray-800 text-white font-semibold rounded-full hover:bg-black transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Generate Strategies
        </button>
      </form>
    </div>
  );
};

export default ProductInput;
