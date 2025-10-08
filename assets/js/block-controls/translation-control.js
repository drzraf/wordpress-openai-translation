const { __ } = wp.i18n;
const { useState, useEffect } = wp.element;
const { BlockControls } = wp.blockEditor;
const { ToolbarGroup, ToolbarButton, Dropdown, MenuGroup, MenuItem, Spinner } = wp.components;
const { useDispatch } = wp.data;
const apiFetch = wp.apiFetch;

import { BackendManager } from '../utils/backend-manager';

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

        // Listen for backend changes from sidebar
        const unsubscribe = BackendManager.onBackendChange((newBackend) => {
            setCurrentBackend(newBackend);
        });

        return unsubscribe;
    }, []);

    // Get config from global
    const languages = window.translationConfig?.languages || [];
    const restNamespace = window.translationConfig?.restNamespace || 'wp-translation/v1';

    const translateBlock = async (language, backend = currentBackend) => {
        if (isTranslating) return;

        setIsTranslating(true);

        try {
            // Store original content before translation
            const originalContent = attributes.content || '';
            const originalBlock = {
                name,
                attributes: { ...attributes }
            };

            const response = await apiFetch({
                path: `/${restNamespace}/translate-block-${backend}`,
                method: 'POST',
                data: {
                    block: originalBlock,
                    language,
                },
            });

            if (response.error) {
                throw new Error(response.error);
            }

            // Update block with translated content and backup
            updateBlockAttributes(clientId, {
                content: response.translatedContent,
                _translationBackup: {
                    content: originalContent,
                    timestamp: Date.now(),
                    language,
                    backend,
                    backendName: BackendManager.getBackendName(backend),
                },
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
        ? __('Translating...', 'wordpress-openai-translation')
        : __('Translate Block', 'wordpress-openai-translation') + ' (' + backendName + ')';

    return (
        <BlockControls>
            <ToolbarGroup>
                <Dropdown
                    className="block-translation-dropdown"
                    popoverProps={{ placement: 'bottom-start' }}
                    renderToggle={({ isOpen, onToggle }) => (
                        <ToolbarButton
                            icon={isTranslating ? undefined : 'translation'}
                            label={tooltipLabel}
                            onClick={onToggle}
                            aria-expanded={isOpen}
                            disabled={isTranslating}
                        >
                            {isTranslating && <Spinner style={{ margin: 0 }} />}
                        </ToolbarButton>
                    )}
                    renderContent={({ onClose }) => (
                        <div style={{ minWidth: '200px' }}>
                            <div style={{
                                padding: '8px 12px',
                                borderBottom: '1px solid #ddd',
                                fontSize: '11px',
                                color: '#666',
                                background: '#f9f9f9'
                            }}>
                                {__('Using:', 'wordpress-openai-translation')} <strong>{backendName}</strong>
                            </div>
                            <MenuGroup label={__('Select Language', 'wordpress-openai-translation')}>
                                {languages.map((lang) => (
                                    <MenuItem
                                        key={lang.code}
                                        onClick={() => {
                                            translateBlock(lang.code, currentBackend);
                                            onClose();
                                        }}
                                    >
                                        {lang.label}
                                    </MenuItem>
                                ))}
                            </MenuGroup>
                        </div>
                    )}
                />
            </ToolbarGroup>
        </BlockControls>
    );
};