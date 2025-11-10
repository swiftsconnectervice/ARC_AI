
import React, { useState, useEffect } from 'react';
import { CampaignKit, StyleBrief, CreativeImage } from '../types';
import CreativeSandboxModal from './CreativeSandboxModal';
import Typewriter from './Typewriter';
import { DownloadIcon, CloudIcon, ExportIcon } from './icons';

declare const JSZip: any;

interface CampaignViewProps {
  campaign: Partial<CampaignKit>;
  isAssembling: boolean;
  showActions: boolean;
  onGoToDashboard: () => void;
  onGoToAdStudio: () => void;
  onSetActiveVariation: (rootImageId: string, variationId: string) => void;
  onAddVariations: (parentId: string, newVariations: { prompt: string; url: string }[]) => void;
  styleBrief: StyleBrief | null;
  onSaveCampaign: () => void;
  isSaving: boolean;
  isCampaignSaved: boolean;
  saveProgress: { current: number; total: number } | null;
}

const SectionSkeleton: React.FC = () => (
    <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="h-32 bg-slate-200 rounded-lg"></div>
            <div className="h-32 bg-slate-200 rounded-lg"></div>
        </div>
    </div>
);


const CampaignView: React.FC<CampaignViewProps> = ({ campaign, isAssembling, showActions, onGoToDashboard, onGoToAdStudio, onSetActiveVariation, onAddVariations, styleBrief, onSaveCampaign, isSaving, isCampaignSaved, saveProgress }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTree, setEditingTree] = useState<{ rootImage: CreativeImage; allImages: CreativeImage[] } | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);

    useEffect(() => {
        if (isModalOpen && editingTree && campaign.visuals?.images) {
            const currentRootImage = campaign.visuals.images.find(img => img.id === editingTree.rootImage.id);
            if (currentRootImage) {
                const updatedTreeImages = getTreeForImage(currentRootImage, campaign.visuals.images);
                if (updatedTreeImages.length !== editingTree.allImages.length) {
                    setEditingTree({ rootImage: currentRootImage, allImages: updatedTreeImages });
                }
            }
        }
    }, [campaign.visuals?.images, isModalOpen, editingTree]);

    const getTreeForImage = (rootImage: CreativeImage, allImages: CreativeImage[]): CreativeImage[] => {
        const tree: CreativeImage[] = [rootImage];
        const findChildren = (parentId: string) => {
            const children = allImages.filter(img => img.parentId === parentId);
            children.forEach(child => {
                tree.push(child);
                findChildren(child.id);
            });
        };
        findChildren(rootImage.id);
        return tree;
    };
    
    const handleExportCampaign = async () => {
        if (!campaign || isExporting) return;
        setIsExporting(true);
        setExportError(null);
    
        try {
            const zip = new JSZip();
    
            let summary = `Campaign: ${campaign.strategyTitle || 'N/A'}\n\n`;
            if (campaign.targetAudience) {
                summary += `== Target Audience ==\n`;
                summary += `${campaign.targetAudience.title}\n`;
                summary += `${campaign.targetAudience.description}\n\n`;
            }
            if (campaign.keyMessaging) {
                summary += `== Key Messaging ==\n`;
                campaign.keyMessaging.points.forEach(p => summary += `- ${p}\n`);
                summary += `\n`;
            }
            if (campaign.marketingChannels) {
                summary += `== Marketing Channels ==\n`;
                campaign.marketingChannels.channels.forEach(c => {
                    summary += `${c.name}: ${c.description}\n`;
                });
                summary += `\n`;
            }
            zip.file("summary.txt", summary);
    
            const imgFolder = zip.folder("images");
            if (imgFolder && campaign.visuals?.images) {
                const imagePromises = campaign.visuals.images.map(async (image) => {
                    if (!image.url || image.url.includes('error')) return;
    
                    try {
                        const response = await fetch(image.url);
                        if (!response.ok) {
                           console.error(`Error fetching image ${image.url}: ${response.statusText}`);
                           return;
                        }
                        const blob = await response.blob();
                        const safeVersionName = image.versionName.replace(/[^\w.-]/g, '_');
                        const fileExtension = blob.type.split('/')[1] || 'png';
                        imgFolder.file(`${safeVersionName}.${fileExtension}`, blob);
                    } catch (e) {
                        console.error(`Error fetching or adding image ${image.url} to zip`, e);
                    }
                });
                await Promise.all(imagePromises);
            }
    
            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            const safeCampaignName = (campaign.strategyTitle || 'Campaign').replace(/[^\w.-]/g, '_');
            link.download = `${safeCampaignName}_Export.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
    
        } catch (error) {
            console.error("Could not export campaign", error);
            setExportError("Could not generate the ZIP file. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleOpenSandbox = (rootImage: CreativeImage) => {
        if (!campaign.visuals?.images) return;
        const fullTree = getTreeForImage(rootImage, campaign.visuals.images);
        setEditingTree({ rootImage, allImages: fullTree });
        setIsModalOpen(true);
    };

    const handleCloseSandbox = () => {
        setIsModalOpen(false);
        setEditingTree(null);
    };

    const handleSetActive = (variation: CreativeImage) => {
        if (editingTree) {
            onSetActiveVariation(editingTree.rootImage.id, variation.id);
        }
        handleCloseSandbox();
    };
    
    const handleAddVariations = (parentId: string, newVariations: { prompt: string; url: string }[]) => {
       onAddVariations(parentId, newVariations);
    };

    const handleDownloadImage = (e: React.MouseEvent, image: CreativeImage) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = image.url;
        const safeCampaignName = (campaign.strategyTitle || 'Campaign').replace(/\s/g, '_');
        const safeVersionName = image.versionName.replace(/\s/g, '_');
        const fileExtension = image.url.match(/data:image\/(.+);/)?.[1] || 'png';
        link.download = `${safeCampaignName}_${safeVersionName}.${fileExtension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const allImages = campaign.visuals?.images || [];
    const rootImages = allImages.filter(img => img.parentId === null);

    const saveButtonText = () => {
        if (isCampaignSaved) return 'Campaign Saved ✓';
        if (isSaving) {
            if (saveProgress && saveProgress.total > 0) {
                return `Saving... (${saveProgress.current}/${saveProgress.total})`;
            }
            return 'Saving...';
        }
        return 'Save Campaign';
    };

    const renderContent = () => {
        const showSkeleton = (field: any) => isAssembling && !field;
        const showEmptyState = (field: any) => !isAssembling && !field;

        return (
            <div className="space-y-12">
                 {/* Title */}
                {campaign.strategyTitle && <h1 className="text-3xl md:text-4xl font-bold text-gray-800 text-center">{campaign.strategyTitle}</h1>}
                {showSkeleton(!campaign.strategyTitle) && <div className="flex justify-center mb-8 animate-pulse"><div className="h-10 bg-slate-200 rounded w-3/4 max-w-lg"></div></div>}

                {/* Strategic Core */}
                <section>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-slate-200">Strategic Core</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[10rem]">
                        {campaign.targetAudience ? (
                            <div className="p-6 bg-slate-50/70 border border-slate-200 rounded-lg">
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">{campaign.targetAudience.title}</h3>
                                <Typewriter enabled={isAssembling} text={campaign.targetAudience.description} className="text-gray-600 leading-relaxed text-sm" as="p" />
                            </div>
                        ) : showSkeleton(campaign.targetAudience) ? (
                            <div className="h-40 bg-slate-200 rounded-lg animate-pulse"></div>
                        ) : showEmptyState(campaign.targetAudience) ? (
                             <div className="p-6 bg-slate-50/70 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-sm">Target audience content will be shown here.</div>
                        ) : null}

                        {campaign.keyMessaging ? (
                            <div className="p-6 bg-slate-50/70 border border-slate-200 rounded-lg">
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">{campaign.keyMessaging.title}</h3>
                                <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                                    {campaign.keyMessaging.points.map((point, index) => <li key={index}><Typewriter enabled={isAssembling} text={point} as="span" /></li>)}
                                </ul>
                            </div>
                        ) : showSkeleton(campaign.keyMessaging) ? (
                            <div className="h-40 bg-slate-200 rounded-lg animate-pulse"></div>
                        ) : showEmptyState(campaign.keyMessaging) ? (
                             <div className="p-6 bg-slate-50/70 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-sm">Key messaging will be shown here.</div>
                        ): null}
                    </div>
                </section>
                
                {/* Action Plan */}
                 { (campaign.marketingChannels || isAssembling) &&
                    <section>
                        {campaign.marketingChannels ? (
                            <>
                                <h2 className="text-2xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-slate-200">{campaign.marketingChannels.title}</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {campaign.marketingChannels.channels.map((channel, index) => (
                                        <div key={index} className="p-4 bg-slate-50/70 border border-slate-200 rounded-lg">
                                            <h3 className="font-bold text-gray-800 text-base">{channel.name}</h3>
                                            <Typewriter enabled={isAssembling} text={channel.description} className="text-sm text-gray-600 mt-1" as="p" />
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : showSkeleton(campaign.marketingChannels) && <SectionSkeleton />}
                    </section>
                }


                 {/* Visual Identity */}
                { (campaign.visuals || isAssembling) &&
                    <section>
                        {campaign.visuals ? (
                            <>
                                <h2 className="text-2xl font-bold text-gray-800 mb-2 pb-2 border-b-2 border-slate-200">{campaign.visuals.title}</h2>
                                <p className="text-sm text-gray-500 mb-4">Click an image to open the Creative Sandbox and generate variations.</p>
                                <div className="flex space-x-4 overflow-x-auto py-2 -mx-6 px-6">
                                    {rootImages.map((rootImage) => {
                                        const activeImage = allImages.find(img => img.id === rootImage.activeVariationId) || rootImage;
                                        const isSavedToFirebase = activeImage.url && activeImage.url.includes('firebasestorage.googleapis.com');
                                        return (
                                            <button 
                                                key={rootImage.id} 
                                                onClick={() => handleOpenSandbox(rootImage)}
                                                disabled={!activeImage.url || activeImage.url === 'error'}
                                                className="group relative aspect-video rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-400 focus:ring-opacity-50 disabled:cursor-not-allowed disabled:opacity-60 flex-shrink-0 w-1/4 min-w-[240px]"
                                            >
                                            {activeImage.url && activeImage.url !== 'error' ? (
                                                    <img src={activeImage.url} alt={activeImage.prompt} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                            ) : activeImage.url === 'error' ? (
                                                    <div className="w-full h-full bg-red-50 border border-red-200 text-red-700 flex flex-col items-center justify-center p-2 text-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                                        <p className="font-semibold text-xs">Image Error</p>
                                                    </div>
                                            ) : (
                                                    <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center p-2">
                                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
                                                    </div>
                                            )}
                                            {isSavedToFirebase && (
                                                <div className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full shadow" title="Image saved to the cloud">
                                                    <CloudIcon className="w-5 h-5 text-green-600" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <p className="text-white text-xs text-center font-semibold">Edit with AI</p>
                                                    <button
                                                        onClick={(e) => handleDownloadImage(e, activeImage)}
                                                        className="p-1.5 bg-white/20 rounded-full text-white hover:bg-white/40 transition-colors"
                                                        aria-label="Download image"
                                                    >
                                                        <DownloadIcon className="w-4 h-4" />
                                                    </button>
                                            </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </>
                        ) : (
                            isAssembling && <div className="mt-8 animate-pulse">
                                <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                    <div className="aspect-video bg-slate-200 rounded-lg"></div>
                                    <div className="aspect-video bg-slate-200 rounded-lg"></div>
                                    <div className="aspect-video bg-slate-200 rounded-lg"></div>
                                    <div className="aspect-video bg-slate-200 rounded-lg"></div>
                                </div>
                            </div>
                        )}
                    </section>
                }
            </div>
        )
    }

    return (
    <>
      <div className="w-full max-w-5xl p-6 md:p-8 my-8 bg-white/80 backdrop-blur-lg border border-gray-200 rounded-xl shadow-2xl text-left animate-fade-in">
          
          {isAssembling && !campaign.strategyTitle && (
              <div className="text-center mb-8 animate-fade-in">
                  <h1 className="text-2xl font-semibold text-gray-800">Assembling Your Campaign Kit...</h1>
                  <p className="mt-1 text-gray-600">Watch your strategy come to life.</p>
              </div>
          )}

          {renderContent()}
          
          {showActions && !isAssembling && (
              <div className="mt-12 animate-fade-in">
                  <hr className="border-slate-200/80" />
                  <div className="pt-8 flex flex-col items-center justify-center gap-4">
                      <div className="flex items-center justify-center gap-4 flex-wrap">
                          <button
                              onClick={onSaveCampaign}
                              disabled={isSaving || isCampaignSaved}
                              className="px-5 py-2.5 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 transition-colors shadow-md disabled:bg-green-500 disabled:cursor-default"
                          >
                              {saveButtonText()}
                          </button>
                          <button
                                onClick={handleExportCampaign}
                                disabled={isExporting || isSaving}
                                className="px-5 py-2.5 bg-slate-600 text-white font-semibold rounded-full hover:bg-slate-700 transition-colors shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <ExportIcon className="w-4 h-4" />
                                {isExporting ? 'Exporting...' : 'Export ZIP'}
                            </button>
                          <button onClick={onGoToAdStudio} className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition-colors shadow-md">
                              Assemble Ads
                          </button>
                      </div>
                      {exportError && <p className="text-red-500 text-sm mt-2">{exportError}</p>}
                      <button onClick={onGoToDashboard} className="text-gray-600 font-medium hover:text-gray-900 transition-colors text-sm px-4 py-2 mt-2">
                          Go to Dashboard
                      </button>
                  </div>
              </div>
          )}
      </div>

      {isModalOpen && editingTree && (
          <CreativeSandboxModal 
              isOpen={isModalOpen}
              onClose={handleCloseSandbox}
              onSetActive={handleSetActive}
              onAddVariations={handleAddVariations}
              rootImage={editingTree.rootImage}
              allImagesInTree={editingTree.allImages}
              styleBrief={styleBrief}
              campaignName={campaign.strategyTitle || "Campaign"}
          />
      )}
    </>
    );
};

export default CampaignView;
