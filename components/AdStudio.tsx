import React, { useState, useEffect } from 'react';
import { CampaignKit, CreativeImage, AdCopy } from '../types';
import { generateAdCopy } from '../services/geminiService';

interface AdStudioProps {
    campaign: CampaignKit;
    onBack: () => void;
    onSaveAdCopy: (channelName: string, creativeImageId: string, copy: AdCopy) => void;
}

const AdStudio: React.FC<AdStudioProps> = ({ campaign, onBack, onSaveAdCopy }) => {
    const [selectedChannel, setSelectedChannel] = useState<string>(campaign.marketingChannels.channels[0]?.name || '');
    const [selectedImage, setSelectedImage] = useState<CreativeImage | null>(campaign.visuals.images.find(img => img.parentId === null) || null);
    const [adCopy, setAdCopy] = useState<AdCopy | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState<'default' | 'post' | 'story'>('default');

    const rootImages = campaign.visuals.images.filter(img => img.parentId === null);

    useEffect(() => {
        if (!selectedImage || !selectedChannel) {
            setAdCopy(null);
            return;
        }

        const existingAd = campaign.ads?.find(
            ad => ad.channelName === selectedChannel && ad.creativeImageId === selectedImage.id
        );

        setAdCopy(existingAd ? existingAd.copy : null);

    }, [selectedImage, selectedChannel, campaign.ads]);

    const handleGenerateAd = async () => {
        if (!selectedChannel || !selectedImage) {
            setError('Please select a channel and an image.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setAdCopy(null);

        try {
            const generatedCopy = await generateAdCopy(campaign, selectedChannel, selectedImage);
            setAdCopy(generatedCopy);
            onSaveAdCopy(selectedChannel, selectedImage.id, generatedCopy);
        } catch (err) {
            console.error(err);
            setError('An error occurred while generating the ad copy. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleTextChange = (field: keyof AdCopy, value: string) => {
        const newCopy = adCopy ? { ...adCopy, [field]: value } : { headline: '', body: '', cta: '', [field]: value };
        setAdCopy(newCopy);
        if (selectedChannel && selectedImage) {
            onSaveAdCopy(selectedChannel, selectedImage.id, newCopy);
        }
    };

    const renderPreviewCore = (mode: typeof previewMode) => (
         <div 
            className={`relative bg-slate-200 bg-cover bg-center shadow-md overflow-hidden flex flex-col text-white ${
                mode === 'story' ? 'justify-between h-full w-full rounded-2xl' : 
                mode === 'post' ? 'h-full w-full' : 
                'aspect-video rounded-lg justify-between p-4'
            }`}
            style={{ backgroundImage: selectedImage ? `url(${selectedImage.url})` : 'none' }}
        >
            {!selectedImage && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-slate-500">Select a visual</p>
                </div>
            )}

            {isLoading && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20">
                    <p className="text-white animate-pulse">Generating copy...</p>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center p-4 z-20">
                    <p className="text-red-100 text-center">{error}</p>
                </div>
            )}

            {adCopy && mode === 'story' && (
                 <div className="w-full h-full flex flex-col justify-between">
                     {/* Story Header */}
                    <div className="p-3 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5"><div className="bg-gray-800 w-full h-full rounded-full"></div></div>
                        <span className="text-xs font-bold" style={{textShadow: '0 1px 3px #000'}}>your_brand</span>
                    </div>
                    {/* Story Ad Content */}
                    <div className="relative z-10 flex flex-col justify-end h-full text-center p-4 pointer-events-none">
                        <div className="space-y-2" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.7)' }}>
                            <h2 className="text-xl font-bold">{adCopy.headline}</h2>
                            <p className="text-xs">{adCopy.body}</p>
                            <button className="mt-2 px-4 py-1.5 bg-white text-black text-xs font-bold rounded-lg pointer-events-auto">
                                {adCopy.cta}
                            </button>
                        </div>
                    </div>
                     {/* Story Footer */}
                    <div className="p-3">
                        <div className="w-full h-8 bg-black/30 rounded-full border border-white/30 text-xs flex items-center px-3">
                            Send message
                        </div>
                    </div>
                 </div>
            )}

            {adCopy && mode === 'default' && (
                <div className="relative z-10 flex flex-col justify-end h-full text-center pointer-events-none">
                    <div className="space-y-2" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.7)' }}>
                        <h2
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => handleTextChange('headline', e.currentTarget.textContent || '')}
                            className="text-2xl font-bold p-1 pointer-events-auto outline-none focus:ring-2 focus:ring-white/50 rounded"
                        >
                            {adCopy.headline}
                        </h2>
                        <p
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => handleTextChange('body', e.currentTarget.textContent || '')}
                            className="text-sm p-1 pointer-events-auto outline-none focus:ring-2 focus:ring-white/50 rounded"
                        >
                            {adCopy.body}
                        </p>
                        <button className="mt-2 px-5 py-2 bg-blue-500 text-white text-xs font-bold rounded-full pointer-events-auto hover:bg-blue-600 transition-colors">
                            {adCopy.cta}
                        </button>
                    </div>
                </div>
            )}
             {!isLoading && !adCopy && !error && selectedImage && mode !== 'post' && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-white/80 bg-black/30 px-3 py-1 rounded-full text-sm" style={{textShadow: '0 1px 2px #000'}}>
                        Generate copy to complete your ad.
                    </p>
                </div>
            )}
            {/* Gradient Overlay for readability */}
            {adCopy && (mode === 'default' || mode === 'story') && <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-0"></div>}
        </div>
    );

    return (
        <div className="w-full max-w-5xl p-6 md:p-8 my-8 bg-white/80 backdrop-blur-lg border border-gray-200 rounded-xl shadow-2xl text-left animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Ad Studio</h1>
                <button onClick={onBack} className="text-gray-600 font-medium hover:text-gray-900 transition-colors text-sm px-4 py-2">
                    &larr; Back to Campaign
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Controls */}
                <div className="space-y-6">
                    <div>
                        <label htmlFor="channel-select" className="block text-sm font-bold text-gray-700 mb-2">1. Select Marketing Channel</label>
                        <select
                            id="channel-select"
                            value={selectedChannel}
                            onChange={(e) => setSelectedChannel(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
                        >
                            {campaign.marketingChannels.channels.map(channel => (
                                <option key={channel.name} value={channel.name}>{channel.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">2. Select a Visual</label>
                        <div className="grid grid-cols-3 gap-2">
                            {rootImages.map(image => {
                                const activeVariation = campaign.visuals.images.find(img => img.id === image.activeVariationId) || image;
                                return (
                                    <button 
                                        key={image.id} 
                                        onClick={() => setSelectedImage(activeVariation)}
                                        className={`aspect-square rounded-md overflow-hidden border-4 transition-colors ${selectedImage?.id === activeVariation.id ? 'border-blue-500' : 'border-transparent hover:border-blue-300'}`}
                                    >
                                        <img src={activeVariation.url} alt={activeVariation.prompt} className="w-full h-full object-cover" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">3. Preview Format</label>
                         <div className="flex space-x-2 rounded-lg bg-slate-200 p-1">
                            {(['default', 'post', 'story'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setPreviewMode(mode)}
                                    className={`w-full rounded-md py-1.5 text-sm font-medium capitalize transition-colors ${
                                        previewMode === mode
                                            ? 'bg-white shadow-sm text-blue-600'
                                            : 'text-gray-600 hover:bg-white/50'
                                    }`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                    </div>
                     <button
                        onClick={handleGenerateAd}
                        disabled={isLoading || !selectedChannel || !selectedImage}
                        className="w-full px-8 py-3 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
                    >
                        {isLoading ? 'Generating Ad...' : '✨ Generate Ad Copy'}
                    </button>
                </div>

                {/* Preview */}
                <div className="bg-slate-100/70 p-4 rounded-lg border border-slate-200">
                    <h2 className="text-lg font-bold text-gray-800 mb-3 text-center">Ad Preview</h2>
                    {previewMode === 'default' && renderPreviewCore('default')}
                    
                    {previewMode === 'post' && (
                        <div className="w-full max-w-[350px] bg-white border border-gray-300 rounded-lg shadow-lg mx-auto text-black">
                            {/* Header */}
                            <div className="flex items-center p-3 border-b border-gray-200">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500"></div>
                                <span className="ml-3 font-semibold text-sm">your_brand</span>
                                <span className="ml-auto text-gray-500 font-bold">...</span>
                            </div>
                            <div className="aspect-square">{renderPreviewCore('post')}</div>
                            <div className="p-3">
                                <div className="flex items-center space-x-4">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"></path></svg>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                                </div>
                                <p className="text-sm font-semibold mt-3">1,234 likes</p>
                                <p className="text-sm mt-1">
                                    <span className="font-semibold">your_brand</span> {adCopy?.body || 'Generate copy to see the description here.'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">View all 42 comments</p>
                            </div>
                        </div>
                    )}
                    
                    {previewMode === 'story' && (
                        <div className="w-full max-w-[240px] aspect-[9/16] bg-gray-800 rounded-3xl shadow-2xl p-2 mx-auto">
                            {renderPreviewCore('story')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdStudio;