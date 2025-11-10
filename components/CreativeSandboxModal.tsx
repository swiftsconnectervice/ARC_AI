
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateImageVariations, editImageWithMask } from '../services/geminiService';
import { StyleBrief, CreativeImage } from '../types';
import { DownloadIcon, ImageIcon } from './icons';

interface CreativeSandboxModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSetActive: (newImage: CreativeImage) => void;
    onAddVariations: (parentId: string, newVariations: { prompt: string; url: string }[]) => void;
    rootImage: CreativeImage;
    allImagesInTree: CreativeImage[];
    styleBrief: StyleBrief | null;
    campaignName: string;
}

const CreativeSandboxModal: React.FC<CreativeSandboxModalProps> = ({ isOpen, onClose, onSetActive, onAddVariations, rootImage, allImagesInTree, styleBrief, campaignName }) => {
    const [selectedImageId, setSelectedImageId] = useState(rootImage.id);
    const [globalPrompt, setGlobalPrompt] = useState(rootImage.prompt);
    const [localPrompt, setLocalPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
    const [isImageLoaded, setIsImageLoaded] = useState(false);

    // In-painting state
    const [isMaskingMode, setIsMaskingMode] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [promptPosition, setPromptPosition] = useState<{ x: number, y: number } | null>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const imageContainerRef = useRef<HTMLDivElement>(null);

    const selectedImage = allImagesInTree.find(img => img.id === selectedImageId) || rootImage;

    const handleDownload = useCallback((image: CreativeImage) => {
        const link = document.createElement('a');
        link.href = image.url;
        const safeCampaignName = campaignName.replace(/\s/g, '_');
        const safeVersionName = image.versionName.replace(/\s/g, '_');
        const fileExtension = image.url.match(/data:image\/(.+);/)?.[1] || 'png';
        link.download = `${safeCampaignName}_${safeVersionName}.${fileExtension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [campaignName]);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);
    
    useEffect(() => {
        setSelectedImageId(rootImage.id);
        setGlobalPrompt(rootImage.prompt);
        setError(null);
        setIsMaskingMode(false);
        clearMask();
        setExpandedNodeId(null);
    }, [rootImage]);

    useEffect(() => {
        setGlobalPrompt(selectedImage.prompt);
        setIsImageLoaded(false);
        clearMask();
        
        // FIX: Check if the image is already loaded from cache, which can
        // happen before the `onLoad` event handler is attached in a re-render.
        // This is crucial for images with URLs that have just been updated (e.g., from base64 to a cloud URL).
        if (imageRef.current && imageRef.current.complete) {
            setIsImageLoaded(true);
        }
    }, [selectedImage.id, selectedImage.url]);
    
    useEffect(() => {
        if (isMaskingMode && imageRef.current && maskCanvasRef.current) {
            const image = imageRef.current;
            const canvas = maskCanvasRef.current;
            const timer = setTimeout(() => {
                canvas.width = image.clientWidth;
                canvas.height = image.clientHeight;
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isMaskingMode, selectedImage.url, isImageLoaded]);

    const getBrushPos = (canvas: HTMLCanvasElement, e: React.MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isMaskingMode) return;
        setIsDrawing(true);
        const canvas = maskCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const { x, y } = getBrushPos(canvas, e);
        ctx.beginPath();
        ctx.moveTo(x, y);
    }, [isMaskingMode]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !isMaskingMode) return;
        const canvas = maskCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const { x, y } = getBrushPos(canvas, e);
        ctx.lineTo(x, y);
        ctx.strokeStyle = 'rgba(0, 100, 255, 0.7)';
        ctx.lineWidth = 20;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }, [isDrawing, isMaskingMode]);

    const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const canvas = maskCanvasRef.current;
        const container = imageContainerRef.current;
        if (!canvas || !container) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.closePath();
        
        const containerRect = container.getBoundingClientRect();
        const x = e.clientX - containerRect.left;
        const y = e.clientY - containerRect.top;
        setPromptPosition({ x, y });

    }, [isDrawing]);

    const clearMask = () => {
        const canvas = maskCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setPromptPosition(null);
        setLocalPrompt('');
    };

    const getMaskAsBase64 = (): string | null => {
        const canvas = maskCanvasRef.current;
        if (!canvas) return null;

        const pixelBuffer = new Uint32Array(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
        if (!pixelBuffer.some(color => color !== 0)) return null;

        const maskProcessingCanvas = document.createElement('canvas');
        maskProcessingCanvas.width = imageRef.current!.naturalWidth;
        maskProcessingCanvas.height = imageRef.current!.naturalHeight;
        const ctx = maskProcessingCanvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(canvas, 0, 0, maskProcessingCanvas.width, maskProcessingCanvas.height);
        
        const imageData = ctx.getImageData(0, 0, maskProcessingCanvas.width, maskProcessingCanvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            data[i+3] = data[i+3] > 0 ? 255 : 0;
            data[i] = data[i+1] = data[i+2] = data[i+3] > 0 ? 255 : 0;
        }
        ctx.putImageData(imageData, 0, 0);
        
        return maskProcessingCanvas.toDataURL('image/png').split(',')[1];
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const maskBase64 = getMaskAsBase64();
            let newVariations;

            if (maskBase64 && localPrompt.trim()) {
                newVariations = await editImageWithMask(globalPrompt, localPrompt, selectedImage, maskBase64, styleBrief);
            } else {
                newVariations = await generateImageVariations(globalPrompt, selectedImage, styleBrief);
            }
            
            onAddVariations(selectedImage.id, newVariations);

            if (newVariations.length === 0) {
                 setError("Could not generate variations. Please try again or use a different prompt.");
            }
        } catch (err) {
            console.error(err);
            setError("An unexpected error occurred while generating variations.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleUpdateAndClose = () => {
        onSetActive(selectedImage);
    };

    const getPathToRoot = useCallback((startId: string): CreativeImage[] => {
        const path: CreativeImage[] = [];
        let current = allImagesInTree.find(img => img.id === startId);
        while (current) {
            path.unshift(current);
            if (current.parentId === null) break;
            current = allImagesInTree.find(img => img.id === current.parentId);
        }
        return path;
    }, [allImagesInTree]);

    const getChildren = useCallback((parentId: string): CreativeImage[] => {
        return allImagesInTree.filter(img => img.parentId === parentId);
    }, [allImagesInTree]);

    const path = getPathToRoot(selectedImage.id);

    const handleNodeClick = (image: CreativeImage) => {
        setSelectedImageId(image.id);
        const hasChildren = getChildren(image.id).length > 0;
        if (hasChildren) {
             setExpandedNodeId(prevId => prevId === image.id ? null : image.id);
        }
    };
    
    const renderNode = (image: CreativeImage, level: number) => {
        const children = getChildren(image.id);
        const isExpanded = expandedNodeId === image.id;
        const isSelected = selectedImageId === image.id;
        const hasChildren = children.length > 0;

        return (
            <div key={image.id} style={{ marginLeft: `${level > 0 ? 1 : 0}rem` }}>
                 <button
                    onClick={() => handleNodeClick(image)}
                    className={`group relative w-full text-left flex items-center gap-3 p-2 rounded-md transition-colors duration-200 ${isSelected ? 'bg-blue-100' : 'hover:bg-slate-100'}`}
                >
                    <div className={`relative w-12 h-12 flex-shrink-0 rounded-md overflow-hidden bg-slate-100 border-2 transition-colors ${isSelected ? 'border-blue-500' : 'border-transparent'}`}>
                        <img src={image.url} alt={image.prompt} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow overflow-hidden">
                        <p className="font-bold text-sm text-gray-800 truncate">{image.versionName}</p>
                        <p className="text-xs text-gray-500 truncate">{image.prompt}</p>
                    </div>
                     {/* Actions container */}
                    <div className="flex items-center gap-1 ml-auto pl-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(image); }}
                            className="p-1.5 rounded-full text-gray-400 hover:bg-slate-200 hover:text-gray-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                            aria-label={`Download ${image.versionName}`}
                        >
                            <DownloadIcon className="w-4 h-4" />
                        </button>
                        {hasChildren && (
                            <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        )}
                    </div>
                </button>
                {isExpanded && hasChildren && (
                    <div className="pl-4 border-l-2 border-slate-200 ml-6">
                        {children.map(child => renderNode(child, level + 1))}
                    </div>
                )}
            </div>
        )
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-fast">
            <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] max-h-[800px] flex overflow-hidden">
                {/* Main Image Viewer */}
                <div ref={imageContainerRef} className="flex-1 bg-slate-200 grid place-items-center p-4 relative">
                    {!isImageLoaded && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 z-10">
                            <ImageIcon className="w-16 h-16 opacity-50" />
                            <p className="mt-2 font-medium">Loading image...</p>
                        </div>
                    )}
                    <img
                        key={selectedImage.url}
                        ref={imageRef}
                        src={selectedImage.url}
                        alt="Selected creative"
                        className={`max-w-full max-h-full object-contain rounded-lg shadow-lg transition-opacity duration-300 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                        crossOrigin="anonymous"
                        onLoad={() => setIsImageLoaded(true)}
                    />
                     <button 
                        onClick={() => handleDownload(selectedImage)}
                        className="absolute top-4 right-4 p-2 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors z-20"
                        aria-label="Download image"
                    >
                        <DownloadIcon className="w-5 h-5" />
                    </button>
                    {isMaskingMode && (
                        <canvas
                            ref={maskCanvasRef}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-crosshair"
                            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                        />
                    )}
                    {isMaskingMode && promptPosition && (
                        <div className="absolute p-2 bg-white rounded-lg shadow-xl animate-fade-in-fast z-20" style={{ top: `${promptPosition.y}px`, left: `${promptPosition.x}px` }}>
                           <textarea value={localPrompt} onChange={(e) => setLocalPrompt(e.target.value)} placeholder="e.g. 'a bright blue rubber bone'" className="w-48 h-20 p-2 border border-blue-400 rounded-md focus:ring-2 focus:ring-blue-400 text-sm resize-none" autoFocus />
                        </div>
                    )}
                </div>

                {/* Control Panel */}
                <div className="w-full max-w-sm flex flex-col p-6 bg-white border-l border-gray-200 overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-gray-800">Creative Sandbox</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-3xl leading-none">&times;</button>
                    </div>

                    <div className="flex-grow space-y-4">
                        <div>
                            <label htmlFor="global-prompt" className="block text-sm font-medium text-gray-700 mb-1">Scene Description (Global)</label>
                            <textarea id="global-prompt" value={globalPrompt} onChange={(e) => setGlobalPrompt(e.target.value)} className="w-full h-28 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 text-sm" />
                        </div>
                         <div className="flex gap-2">
                             <button onClick={() => setIsMaskingMode(!isMaskingMode)} className={`flex-1 py-2 px-4 text-sm font-semibold rounded-full border-2 ${isMaskingMode ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-gray-300 hover:border-gray-400'}`}>
                                 {isMaskingMode ? 'Brush Active' : 'Select Area'}
                             </button>
                             {isMaskingMode && <button onClick={clearMask} className="py-2 px-4 text-sm font-semibold rounded-full bg-red-100 text-red-700 hover:bg-red-200 border-2 border-red-200">Clear</button>}
                        </div>

                        <button onClick={handleGenerate} disabled={isLoading} className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 disabled:bg-blue-400">
                            {isLoading ? 'Generating...' : `Generate Variations of ${selectedImage.versionName}`}
                        </button>
                        
                        {isLoading && <div className="text-center text-sm text-blue-600">This may take a moment...</div>}
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        
                        <div className="pt-2">
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">Creative Timeline</h3>
                            {/* Breadcrumb */}
                            <div className="text-xs text-gray-500 mb-3 pb-2 border-b flex flex-wrap items-center gap-1">
                                <span className="font-semibold text-gray-600">Path:</span>
                                {path.map((p, index) => (
                                    <React.Fragment key={p.id}>
                                        <button
                                            onClick={() => setSelectedImageId(p.id)}
                                            className="hover:underline hover:text-blue-600 disabled:text-gray-500 disabled:no-underline font-medium"
                                            disabled={p.id === selectedImage.id}
                                        >
                                            {p.versionName}
                                        </button>
                                        {index < path.length - 1 && <span className="text-gray-400">&gt;</span>}
                                    </React.Fragment>
                                ))}
                            </div>
                           
                            <div className="max-h-[22rem] overflow-y-auto pr-2 space-y-1">
                                {renderNode(rootImage, 0)}
                            </div>

                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <button onClick={handleUpdateAndClose} className="w-full py-3 px-4 bg-gray-800 text-white font-bold rounded-full hover:bg-black transition-colors">
                            Use this Image
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreativeSandboxModal;
