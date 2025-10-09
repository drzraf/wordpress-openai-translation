const { __ } = wp.i18n;
const { useState, useEffect } = wp.element;
const { BlockControls } = wp.blockEditor;
const { ToolbarGroup, ToolbarButton, Spinner } = wp.components;
const { useDispatch } = wp.data;

import { BackendManager } from '../utils/backend-manager';
import { LanguageDropdown } from '../components/LanguageDropdown';
import { translateSingleBlock } from '../utils/translation-api';

export const BlockTranslationControl = ({ clientId, attributes, name }) => {
    const [isTranslating, setIsTranslating] = useState(false);
    const [currentBackend, setCurrentBackend] = useState('');
    const { updateBlockAttributes } = useDispatch('core/block-editor');

    // Only show for supported block types
    const supportedBlocks = ['core/paragraph', 'core/heading', 'core/list', 'core/quote'];
    if (!supportedBlocks.includes(name)) {
        return null;
    }

    // Sync with global backend selection
    useEffect(() => {
        const backend = BackendManager.getSelectedBackend();
        setCurrentBackend(backend);

        const unsubscribe = BackendManager.onBackendChange((newBackend) => {
            setCurrentBackend(newBackend);
        });

        return unsubscribe;
    }, []);

    const languages = window.translationConfig?.languages || [];
    const restNamespace = window.translationConfig?.restNamespace || 'wp-translation/v1';

    const translateBlock = async (language, backend = currentBackend) => {
        if (isTranslating) return;

        setIsTranslating(true);

        try {
            const originalContent = attributes.content || '';
            const originalBlock = {
                name,
                attributes: { ...attributes }
            };

            const response = await translateSingleBlock({
                backend,
                block: originalBlock,
                language,
                restNamespace
            });

            // Update block with translated content and marker
            updateBlockAttributes(clientId, {
                content: response.translatedContent,
                _translationBackup: {
                    content: originalContent,
                    timestamp: Date.now(),
                    language,
                    backend,
                    backendName: BackendManager.getBackendName(backend),
                },
                _individuallyTranslated: {
                    timestamp: Date.now(),
                    language,
                    backend,
                }
            });
        } catch (error) {
            console.error('Block translation failed:', error);
            alert(error.message || __('Translation failed', 'wordpress-openai-translation'));
        } finally {
            setIsTranslating(false);
        }
    };

    // For batch translation (called from outside)
    window.translateBlockAsync = window.translateBlockAsync || {};
    window.translateBlockAsync[clientId] = (language, backend) => {
        return translateBlock(language, backend);
    };

    const backendName = BackendManager.getBackendName(currentBackend);
    const tooltipLabel = isTranslating
        ? __('Translating Block...', 'wordpress-openai-translation')
        : __('Translate Block', 'wordpress-openai-translation') + ' (' + backendName + ')';

    return (
        <BlockControls>
            <ToolbarGroup>
                <LanguageDropdown
                    languages={languages}
                    onSelect={(language) => translateBlock(language, currentBackend)}
                    headerText={__('Block Translation', 'wordpress-openai-translation')}
                    showBackendInfo={true}
                    backendName={backendName}
                    renderToggle={({ isOpen, onToggle }) => (
                        <ToolbarButton
                            icon={isTranslating ? undefined : 'translation'}
                            label={tooltipLabel}
                            onClick={onToggle}
                            aria-expanded={isOpen}
                            disabled={isTranslating}
                            style={{
                                color: isTranslating ? '#666' : '#2271b1'
                            }}
                        >
                            {isTranslating && <Spinner style={{ margin: 0 }} />}
                        </ToolbarButton>
                    )}
                />
            </ToolbarGroup>
        </BlockControls>
    );
};