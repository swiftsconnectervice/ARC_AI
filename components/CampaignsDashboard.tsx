
import React, { useState } from 'react';
import { CloudIcon, TrashIcon } from './icons';

interface Campaign {
    id: string;
    name: string;
    createdAt?: {
        toDate: () => Date;
    };
    kit?: {
        visuals?: {
            images?: { url: string }[];
        }
    }
}

interface CampaignsDashboardProps {
    campaigns: Campaign[];
    onSelectCampaign: (id: string) => void;
    onCreateNew: () => void;
    onDeleteCampaign: (id: string) => void;
}

const CampaignsDashboard: React.FC<CampaignsDashboardProps> = ({ campaigns, onSelectCampaign, onCreateNew, onDeleteCampaign }) => {
    const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);

    const handleDeleteClick = (e: React.MouseEvent, campaign: Campaign) => {
        e.stopPropagation(); // Prevent the card's onSelectCampaign from firing
        setCampaignToDelete(campaign);
    };

    const confirmDelete = () => {
        if (campaignToDelete) {
            onDeleteCampaign(campaignToDelete.id);
            setCampaignToDelete(null);
        }
    };

    const cancelDelete = () => {
        setCampaignToDelete(null);
    };

    return (
        <div className="p-6 md:p-8 w-full max-w-7xl mx-auto animate-fade-in text-left">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800">My Campaigns</h1>
                <button 
                    onClick={onCreateNew}
                    className="px-5 py-2.5 bg-gray-800 text-white font-semibold rounded-full hover:bg-black transition-colors shadow-sm"
                >
                    + New Campaign
                </button>
            </div>
            
            {campaigns.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {campaigns.map(campaign => {
                        const firstImageUrl = campaign.kit?.visuals?.images?.find(img => img.url && !img.url.startsWith('data:'))?.url;
                        const isSavedToFirebase = firstImageUrl && firstImageUrl.includes('firebasestorage.googleapis.com');
                        return (
                            <div key={campaign.id} className="relative group">
                                <button
                                    onClick={(e) => handleDeleteClick(e, campaign)}
                                    className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white/50 text-gray-500 hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                                    aria-label={`Delete campaign ${campaign.name}`}
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                                <div
                                    onClick={() => onSelectCampaign(campaign.id)}
                                    className="cursor-pointer text-left p-4 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col"
                                >
                                    <div className="relative aspect-video w-full rounded-md bg-slate-100 overflow-hidden mb-3 border border-slate-200">
                                    {firstImageUrl ? (
                                            <img src={firstImageUrl} alt={campaign.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </div>
                                    )}
                                    {isSavedToFirebase && (
                                        <div className="absolute top-2 left-2 p-1 bg-white/80 rounded-full shadow" title="Image saved to the cloud">
                                        <CloudIcon className="w-4 h-4 text-green-600" />
                                        </div>
                                    )}
                                    </div>
                                    <div className="mt-auto">
                                        <h3 className="font-bold text-gray-800 truncate">{campaign.name}</h3>
                                        <p className="text-xs text-gray-500">
                                            Created: {campaign.createdAt ? new Date(campaign.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                    <h3 className="mt-2 text-lg font-medium text-gray-800">No campaigns</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new marketing campaign.</p>
                    <div className="mt-6">
                        <button
                            type="button"
                            onClick={onCreateNew}
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-full text-white bg-gray-800 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                           + New Campaign
                        </button>
                    </div>
                </div>
            )}

            {campaignToDelete && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-fast"
                    aria-labelledby="modal-title"
                    role="dialog"
                    aria-modal="true"
                >
                    <div 
                        className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 text-center"
                    >
                        <h3 id="modal-title" className="text-xl font-bold text-gray-800">Confirm Deletion</h3>
                        <p className="mt-2 text-gray-600">
                            Are you sure you want to permanently delete the campaign "{campaignToDelete.name}"? This action cannot be undone.
                        </p>
                        <div className="mt-6 flex justify-center gap-4">
                            <button 
                                onClick={cancelDelete}
                                className="px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-full hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDelete}
                                className="px-6 py-2 bg-red-600 text-white font-semibold rounded-full hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CampaignsDashboard;
