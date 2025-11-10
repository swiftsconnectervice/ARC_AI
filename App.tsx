import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AppStep, StrategyBrief, CampaignKit, ProductImage, StyleBrief, CreativeImage, AdCopy } from './types';
import InitialLanding from './components/InitialLanding';
import Landing from './components/Landing';
import ProductInput from './components/ProductInput';
import GeneratingBriefs from './components/GeneratingBriefs';
import Decision from './components/Decision';
import CampaignView from './components/CampaignView';
import AdStudio from './components/AdStudio';
import Sidebar from './components/Sidebar';
import CampaignsDashboard from './components/CampaignsDashboard';
import { ArcLogo } from './components/icons';
import { generateStrategyBriefs, generateCampaignTextContent, generateImage, analyzeImageStyle } from './services/geminiService';
import { auth, db, storage } from './services/firebaseConfig';
import { onSnapshot, collection, query, where, addDoc, doc, updateDoc, getDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { ref, uploadString, getDownloadURL, listAll, deleteObject } from "firebase/storage";

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.LANDING);
  const [view, setView] = useState<'creating' | 'dashboard'>('dashboard');
  
  // Campaign State
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState<string>('');
  const [productDescription, setProductDescription] = useState<string>('');
  const [productImage, setProductImage] = useState<ProductImage | null>(null);
  const [inspirationImage, setInspirationImage] = useState<ProductImage | null>(null);
  const [styleBrief, setStyleBrief] = useState<StyleBrief | null>(null);
  const [strategyBriefs, setStrategyBriefs] = useState<StrategyBrief[] | null>(null);
  const [campaignKit, setCampaignKit] = useState<Partial<CampaignKit> | null>(null);
  
  // UI State
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCampaignSaved, setIsCampaignSaved] = useState<boolean>(false);
  const [saveProgress, setSaveProgress] = useState<{ current: number; total: number } | null>(null);

  const adStudioRef = useRef<HTMLDivElement>(null);

  const resetCampaignState = useCallback(() => {
    setActiveCampaignId(null);
    setCampaignName('');
    setStrategyBriefs(null);
    setCampaignKit(null);
    setError(null);
    setProductDescription('');
    setProductImage(null);
    setInspirationImage(null);
    setStyleBrief(null);
    setIsCampaignSaved(false);
    setSaveProgress(null);
  }, []);

  const handleLogout = useCallback(() => {
    signOut(auth);
    setStep(AppStep.LANDING);
    setView('dashboard');
    setCampaigns([]);
    resetCampaignState();
  }, [resetCampaignState]);

  const handleGoToDashboard = useCallback(() => {
    setView('dashboard');
    setStep(AppStep.INPUT); // Keep sidebar visible
    resetCampaignState();
  }, [resetCampaignState]);
  
  const handleNewCampaign = useCallback(() => {
    resetCampaignState();
    setStep(AppStep.INPUT);
    setView('creating');
  }, [resetCampaignState]);

  const handleGoToAuth = useCallback(() => {
    setStep(AppStep.AUTH);
  }, []);

  const handleAuthSuccess = useCallback(() => {
    const user = auth.currentUser;
    if (user) {
        const campaignsCollection = collection(db, 'campaigns');
        const q = query(campaignsCollection, where('userId', '==', user.uid));
        
        onSnapshot(q, (snapshot) => {
            const userCampaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            userCampaigns.sort((a: any, b: any) => {
                const dateA = a.createdAt?.toDate()?.getTime() || 0;
                const dateB = b.createdAt?.toDate()?.getTime() || 0;
                return dateB - dateA;
            });
            setCampaigns(userCampaigns);
        }, (err: any) => {
            console.error("Snapshot listener error:", err);
            setError("Could not load campaigns. Additional database configuration may be needed.");
        });
    }
    setStep(AppStep.INPUT); // This makes the sidebar appear
    setView('dashboard');
  }, []);

  const handleGenerateBriefs = useCallback(async (description: string, image: ProductImage | null, inspoImage: ProductImage | null) => {
    setProductDescription(description);
    setProductImage(image);
    setInspirationImage(inspoImage);
    setStep(AppStep.GENERATING_BRIEFS);
    setError(null);
    
    try {
      let finalStyleBrief: StyleBrief | null = null;
      if (inspoImage) {
        const analyzedStyle = await analyzeImageStyle(inspoImage);
        setStyleBrief(analyzedStyle);
        finalStyleBrief = analyzedStyle;
      } else {
        setStyleBrief(null);
      }
      
      const { briefs, campaignName } = await generateStrategyBriefs(description, finalStyleBrief);
      setStrategyBriefs(briefs);
      setCampaignName(campaignName);
      setStep(AppStep.DECISION);

      // --- AUTO-SAVE DRAFT ---
      const user = auth.currentUser;
      if (user) {
        const campaignData = {
          name: campaignName,
          productDescription: description,
          styleBrief: finalStyleBrief,
          userId: user.uid,
          createdAt: serverTimestamp(),
          status: 'draft',
          kit: {}
        };
        const campaignRef = await addDoc(collection(db, 'campaigns'), campaignData);
        setActiveCampaignId(campaignRef.id);
        setIsCampaignSaved(true); // Indicate that it's safe
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while designing strategies. Please try again.');
      setStep(AppStep.INPUT);
    }
  }, []);

  const handleSelectBrief = useCallback(async (brief: StrategyBrief) => {
    setStep(AppStep.ASSEMBLING_CAMPAIGN);
    setError(null);
    setCampaignKit({}); 
    setIsCampaignSaved(false); // New content is being generated, so it's not "saved" in its final state yet

    // --- AUTO-UPDATE CAMPAIGN ---
    if (activeCampaignId) {
        const docRef = doc(db, 'campaigns', activeCampaignId);
        await updateDoc(docRef, {
            'kit.strategyTitle': brief.title,
            status: 'assembling',
        });
    }

    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

    try {
        const textContent = await generateCampaignTextContent(productDescription, brief, styleBrief);
        const updateFirestoreKit = (newKitPart: Partial<CampaignKit>) => {
            if (activeCampaignId) {
                const updates: { [key: string]: any } = {};
                for (const key in newKitPart) {
                    updates[`kit.${key}`] = (newKitPart as any)[key];
                }
                const docRef = doc(db, 'campaigns', activeCampaignId);
                updateDoc(docRef, updates);
            }
        };

        await sleep(500);
        setCampaignKit(prev => { const n = { ...prev, strategyTitle: textContent.strategyTitle }; updateFirestoreKit({ strategyTitle: textContent.strategyTitle }); return n; });

        await sleep(700);
        setCampaignKit(prev => { const n = { ...prev, targetAudience: textContent.targetAudience }; updateFirestoreKit({ targetAudience: textContent.targetAudience }); return n; });
        
        await sleep(700);
        setCampaignKit(prev => { const n = { ...prev, keyMessaging: textContent.keyMessaging }; updateFirestoreKit({ keyMessaging: textContent.keyMessaging }); return n; });

        await sleep(700);
        setCampaignKit(prev => { const n = { ...prev, marketingChannels: textContent.marketingChannels }; updateFirestoreKit({ marketingChannels: textContent.marketingChannels }); return n; });

        await sleep(500);
        const initialVisuals = {
            title: textContent.visuals?.title || null,
            images: textContent.visuals.imagePrompts.map((prompt, index) => ({
                id: `root_${index}_${Date.now()}`,
                parentId: null,
                prompt,
                url: '',
                versionName: `Concept ${index + 1}`
            })),
        };
        setCampaignKit(prev => { const n = { ...prev, visuals: initialVisuals }; updateFirestoreKit({ visuals: initialVisuals }); return n; });

        // Generate images, get base64 URLs
        const imageGenerationPromises = initialVisuals.images.map(initialImage =>
            generateImage(initialImage.prompt, productImage, styleBrief)
                .then(generatedImage => ({ id: initialImage.id, base64Url: generatedImage.url, error: null }))
                .catch(err => {
                    console.error(`Failed to generate image for prompt: "${initialImage.prompt}"`, err);
                    return ({ id: initialImage.id, base64Url: null, error: err });
                })
        );
        const generatedImagesResults = await Promise.all(imageGenerationPromises);

        // Update UI with base64 images for immediate feedback
        setCampaignKit(prevKit => {
            if (!prevKit?.visuals) return prevKit;
            const newImages = prevKit.visuals.images.map(img => {
                const result = generatedImagesResults.find(r => r.id === img.id && r.base64Url);
                return result ? { ...img, url: result.base64Url } : img;
            });
            return { ...prevKit, visuals: { ...prevKit.visuals, images: newImages } };
        });

        // Asynchronously upload images to storage and update with permanent URLs
        const user = auth.currentUser;
        if (user && activeCampaignId) {
            const uploadAndUpdateUrls = async () => {
                let currentImages: CreativeImage[] | undefined;
                setCampaignKit(prev => {
                    currentImages = prev.visuals?.images;
                    return prev;
                });
                if (!currentImages) return;

                const finalImages = [...currentImages];
                const uploadPromises = finalImages.map(async (image, index) => {
                    if (image.url && image.url.startsWith('data:')) {
                        try {
                            const storagePath = `campaigns/${user.uid}/${activeCampaignId}/${image.id}.png`;
                            const storageRef = ref(storage, storagePath);
                            const snapshot = await uploadString(storageRef, image.url, 'data_url');
                            const downloadURL = await getDownloadURL(snapshot.ref);
                            finalImages[index] = { ...image, url: downloadURL };
                        } catch (uploadError) {
                            console.error(`Error uploading image ${image.id}:`, uploadError);
                            finalImages[index] = { ...image, url: 'error_uploading' };
                        }
                    }
                });

                await Promise.all(uploadPromises);

                setCampaignKit(prev => ({ ...prev, visuals: { ...prev.visuals!, images: finalImages } }));
                const docRef = doc(db, 'campaigns', activeCampaignId);
                await updateDoc(docRef, { 'kit.visuals.images': finalImages });
            };
            uploadAndUpdateUrls();
        }
        
        setTimeout(() => {
            setStep(AppStep.RESULT);
        }, 1000);

    } catch (err) {
        console.error(err);
        setError('An error occurred while building the campaign kit. Please try again.');
        setStep(AppStep.DECISION);
    }
  }, [productDescription, productImage, styleBrief, activeCampaignId]);
  
  const handleSelectCampaign = useCallback(async (campaignId: string) => {
    const docRef = doc(db, 'campaigns', campaignId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        resetCampaignState();
        setCampaignKit(data.kit || {});
        setProductDescription(data.productDescription || '');
        setStyleBrief(data.styleBrief || null);
        setCampaignName(data.name || '');
        setActiveCampaignId(campaignId);
        setIsCampaignSaved(true);
        setStep(AppStep.RESULT);
        setView('creating');
    } else {
        console.error("No such campaign!");
        setError("Could not load the selected campaign.");
    }
  }, [resetCampaignState]);

  const handleDeleteCampaign = async (campaignId: string) => {
    const user = auth.currentUser;
    if (!user) {
        setError("You must be logged in to delete campaigns.");
        return;
    }

    try {
        // 1. Delete Firestore document
        const docRef = doc(db, 'campaigns', campaignId);
        await deleteDoc(docRef);

        // 2. Delete associated files from Storage
        const storagePath = `campaigns/${user.uid}/${campaignId}`;
        const folderRef = ref(storage, storagePath);
        const fileList = await listAll(folderRef);
        
        const deletePromises = fileList.items.map(itemRef => deleteObject(itemRef));
        await Promise.all(deletePromises);
        
        // If the deleted campaign was the active one, reset the state.
        if (activeCampaignId === campaignId) {
            resetCampaignState();
            setView('dashboard');
            setStep(AppStep.INPUT);
        }

      } catch (err) {
        console.error("Error deleting campaign:", err);
        setError("Could not delete the campaign. Please try again.");
      }
  };

  const handleGoToAdStudio = useCallback(() => {
    if (campaignKit) {
      setStep(AppStep.AD_STUDIO);
      setTimeout(() => {
        adStudioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [campaignKit]);
  
  const handleSetActiveVariation = useCallback((rootImageId: string, variationId: string) => {
    setCampaignKit(prevKit => {
      if (!prevKit?.visuals) return prevKit;
      const newImages = prevKit.visuals.images.map(img => img.id === rootImageId ? { ...img, activeVariationId: variationId } : img );
      const newKit = { ...prevKit, visuals: { ...prevKit.visuals, images: newImages } };
      if (activeCampaignId) {
          const docRef = doc(db, 'campaigns', activeCampaignId);
          updateDoc(docRef, { 'kit.visuals.images': newImages });
      }
      setIsCampaignSaved(false); // Mark that changes need to be saved
      return newKit;
    });
  }, [activeCampaignId]);

  const handleAddVariationsToCampaignImage = useCallback(async (parentId: string, newVariations: { prompt: string; url: string }[]) => {
    const user = auth.currentUser;
    if (!activeCampaignId || !user) return;
    
    // Step 1: Create new image objects and update UI with local base64 URLs for immediate feedback.
    let newCreativeImages: CreativeImage[] = [];
    setCampaignKit(prevKit => {
      if (!prevKit?.visuals) return prevKit;
      const allImages = prevKit.visuals.images;
      const parentImage = allImages.find(img => img.id === parentId);
      if (!parentImage) return prevKit;
      const children = allImages.filter(img => img.parentId === parentId);

      newCreativeImages = newVariations.map((variation, index) => ({
          id: `${parentId}_var_${Date.now()}_${index}`,
          parentId: parentId,
          prompt: variation.prompt,
          url: variation.url, // Temporary base64 url
          versionName: `${parentImage.versionName.split('.')[0]}.${children.length + index + 1}`
      }));
      const newAllImages = [...allImages, ...newCreativeImages];
      return { ...prevKit, visuals: { ...prevKit.visuals, images: newAllImages } };
    });

    // Step 2: Asynchronously upload images and get their permanent download URLs.
    const uploadPromises = newCreativeImages.map(async (image) => {
      try {
          const storagePath = `campaigns/${user.uid}/${activeCampaignId}/${image.id}.png`;
          const storageRef = ref(storage, storagePath);
          const snapshot = await uploadString(storageRef, image.url, 'data_url');
          const downloadURL = await getDownloadURL(snapshot.ref);
          return { ...image, url: downloadURL };
      } catch (uploadError) {
          console.error(`Error uploading variation ${image.id}:`, uploadError);
          return { ...image, url: 'error_uploading' };
      }
    });
    const uploadedImages = await Promise.all(uploadPromises);
    
    // Step 3: Update state and Firestore with the permanent URLs.
    setCampaignKit(prevKit => {
        if (!prevKit?.visuals) return prevKit;
        // Replace the temporary images with the final uploaded versions.
        const finalImages = prevKit.visuals.images.map(img => {
            const uploadedVersion = uploadedImages.find(uImg => uImg.id === img.id);
            return uploadedVersion || img;
        });
        
        const newKit = { ...prevKit, visuals: { ...prevKit.visuals, images: finalImages } };
        
        // Update Firestore with the new complete image list.
        const docRef = doc(db, 'campaigns', activeCampaignId);
        updateDoc(docRef, { 'kit.visuals.images': finalImages });

        setIsCampaignSaved(false); // Still needs a final "Save Campaign" for text content.
        return newKit;
    });
  }, [activeCampaignId]);

  const handleSaveAdCopy = useCallback((channelName: string, creativeImageId: string, copy: AdCopy) => {
    if (!activeCampaignId) return;

    setCampaignKit(prevKit => {
        if (!prevKit) return prevKit;

        const newAds = [...(prevKit.ads || [])];
        const adIndex = newAds.findIndex(ad => ad.channelName === channelName && ad.creativeImageId === creativeImageId);

        const newAdData = { channelName, creativeImageId, copy };

        if (adIndex > -1) {
            newAds[adIndex] = newAdData;
        } else {
            newAds.push(newAdData);
        }

        const newKit = { ...prevKit, ads: newAds };

        const docRef = doc(db, 'campaigns', activeCampaignId);
        updateDoc(docRef, { 'kit.ads': newAds });

        return newKit;
    });
  }, [activeCampaignId]);
    
  const handleSaveCampaign = useCallback(async () => {
    if (!campaignKit || isSaving || !activeCampaignId) return;
    const user = auth.currentUser;
    if (!user) { setError("You must be logged in to save the campaign."); return; }

    setIsSaving(true);
    setError(null);

    try {
        const campaignDataToSave = JSON.parse(JSON.stringify(campaignKit));
        
        // Fallback: Upload any images that might have failed auto-upload.
        const imagesToUpload = campaignDataToSave.visuals?.images?.filter((img: CreativeImage) => img.url && img.url.startsWith('data:'));
        
        if (imagesToUpload && imagesToUpload.length > 0) {
            setSaveProgress({ current: 0, total: imagesToUpload.length });
            
            for (const image of campaignDataToSave.visuals.images) {
                if (image.url && image.url.startsWith('data:')) {
                    console.log(`Uploading image (fallback): ${image.id}`);
                    
                    const storagePath = `campaigns/${user.uid}/${activeCampaignId}/${image.id}.png`;
                    const storageRef = ref(storage, storagePath);
                    
                    try {
                        const snapshot = await uploadString(storageRef, image.url, 'data_url');
                        const downloadURL = await getDownloadURL(snapshot.ref);
                        image.url = downloadURL;
                        setSaveProgress(prev => prev ? { ...prev, current: prev.current + 1 } : null);
                    } catch (uploadError) {
                         console.error(`Error uploading image ${image.id}:`, uploadError);
                         image.url = 'error_uploading'; 
                    }
                }
            }
        }
        
        const docRef = doc(db, 'campaigns', activeCampaignId);
        await updateDoc(docRef, {
            kit: campaignDataToSave,
            status: 'completed'
        });

        setCampaignKit(campaignDataToSave);
        setIsCampaignSaved(true);

    } catch (err: any) {
        console.error("Error saving campaign:", err);
        setError(`Could not save campaign. Error: ${err.message}.`);
    } finally {
        setIsSaving(false);
        setSaveProgress(null);
    }
  }, [campaignKit, isSaving, activeCampaignId]);

  const renderContent = () => {
    if (view === 'dashboard' && step >= AppStep.INPUT) {
      return <CampaignsDashboard campaigns={campaigns} onSelectCampaign={handleSelectCampaign} onCreateNew={handleNewCampaign} onDeleteCampaign={handleDeleteCampaign} />;
    }
    
    // Single-view steps before dashboard/creation logic kicks in
    if (step < AppStep.INPUT) {
        switch (step) {
          case AppStep.LANDING: return <InitialLanding onStart={handleGoToAuth} />;
          case AppStep.AUTH: return <Landing onAuthSuccess={handleAuthSuccess} />;
          default: return null;
        }
    }
    
    // Creation flow
    if (view === 'creating') {
        switch (step) {
          case AppStep.INPUT:
            return <ProductInput onGenerateBriefs={handleGenerateBriefs} initialDescription={productDescription} error={error} />;
          case AppStep.GENERATING_BRIEFS:
            return <GeneratingBriefs />;
          case AppStep.DECISION:
            return strategyBriefs ? <Decision briefs={strategyBriefs} onSelect={handleSelectBrief} error={error} campaignName={campaignName} /> : null;
          default:
            // Handled by the combined view below
            break;
        }

        const isCampaignVisible = campaignKit !== null && [AppStep.ASSEMBLING_CAMPAIGN, AppStep.RESULT, AppStep.AD_STUDIO].includes(step);
        if (isCampaignVisible) {
            return (
                <>
                    <CampaignView 
                        campaign={campaignKit} 
                        isAssembling={step === AppStep.ASSEMBLING_CAMPAIGN} 
                        onGoToDashboard={handleGoToDashboard} 
                        onGoToAdStudio={handleGoToAdStudio}
                        onSetActiveVariation={handleSetActiveVariation}
                        onAddVariations={handleAddVariationsToCampaignImage}
                        showActions={step !== AppStep.AD_STUDIO}
                        styleBrief={styleBrief}
                        onSaveCampaign={handleSaveCampaign}
                        isSaving={isSaving}
                        isCampaignSaved={isCampaignSaved}
                        saveProgress={saveProgress}
                    />
                    <div ref={adStudioRef} className="w-full">
                        {step === AppStep.AD_STUDIO && (
                            <AdStudio 
                                campaign={campaignKit as CampaignKit} 
                                onBack={() => setStep(AppStep.RESULT)} 
                                onSaveAdCopy={handleSaveAdCopy}
                            />
                        )}
                    </div>
                </>
            )
        }
        return <GeneratingBriefs />;
    }
    
    return null; // Fallback
  };

  const isLongformContent = (view === 'dashboard' && step >= AppStep.INPUT) ||
    (campaignKit !== null && [AppStep.ASSEMBLING_CAMPAIGN, AppStep.RESULT, AppStep.AD_STUDIO].includes(step));

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center text-gray-800 font-sans overflow-hidden">
      <div className="absolute inset-0 z-0">
        <svg width="100%" height="100%" viewBox="0 0 1200 800" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
            <defs>
                <filter id="blur-filter" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="80" />
                </filter>
                <radialGradient id="grad1" cx="20%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="rgba(255, 229, 204, 0.6)" />
                    <stop offset="100%" stopColor="rgba(255, 229, 204, 0)" />
                </radialGradient>
                <radialGradient id="grad2" cx="85%" cy="40%" r="70%">
                    <stop offset="0%" stopColor="rgba(204, 229, 255, 0.7)" />
                    <stop offset="100%" stopColor="rgba(204, 229, 255, 0)" />
                </radialGradient>
                <radialGradient id="grad3" cx="50%" cy="85%" r="60%">
                    <stop offset="0%" stopColor="rgba(220, 210, 230, 0.6)" />
                    <stop offset="100%" stopColor="rgba(220, 210, 230, 0)" />
                </radialGradient>
            </defs>
            <g filter="url(#blur-filter)">
                <rect x="0" y="0" width="100%" height="100%" fill="url(#grad1)" />
                <rect x="0" y="0" width="100%" height="100%" fill="url(#grad2)" />
                <rect x="0" y="0" width="100%" height="100%" fill="url(#grad3)" />
            </g>
        </svg>
      </div>
      
      <div className="z-10 w-full h-screen flex">
          {step >= AppStep.INPUT && (
            <Sidebar 
                onNewCampaign={handleNewCampaign} 
                onShowDashboard={handleGoToDashboard} 
                onLogout={handleLogout} 
            />
          )}
          <main className={`flex-grow flex flex-col items-center w-full px-4 text-center overflow-y-auto ${isLongformContent ? 'justify-start py-8' : 'justify-center'}`}>
            {renderContent()}
          </main>
      </div>

    </div>
  );
};

export default App;
