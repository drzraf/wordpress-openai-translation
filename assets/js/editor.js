const { __ } = wp.i18n;
const { registerPlugin } = wp.plugins;
const { useState, useEffect } = wp.element;
const { PanelBody, PanelRow, Button, Spinner, SelectControl } = wp.components;
const { PluginSidebar } = wp.editPost;
const { useSelect, useDispatch } = wp.data;

import { BackendManager } from './utils/backend-manager';
import { LanguageDropdown } from './components/LanguageDropdown';
import { translateFullPage, withEditorLock, updateBlockRecursively } from './utils/translation-api';
import { filterUntranslatedBlocks } from './utils/block-filters';

const TranslationPanel = () => {
    const [isTranslating, setIsTranslating] = useState(false);
    const [isTranslatingTitle, setIsTranslatingTitle] = useState(false);
    const [selectedBackend, setSelectedBackend] = useState('');
    const [backends, setBackends] = useState({});
    const [languages, setLanguages] = useState([]);

    // Initialize from global config
    useEffect(() => {
        if (window.translationConfig) {
            const availableBackends = window.translationConfig.backends || {};
            setBackends(availableBackends);

            const currentBackend = BackendManager.getSelectedBackend();
            setSelectedBackend(currentBackend);

            setLanguages(window.translationConfig.languages || []);
        }
    }, []);

    // Sync backend changes across components
    const handleBackendChange = (backend) => {
        setSelectedBackend(backend);
        BackendManager.setSelectedBackend(backend);
    };

    // Get current post title and blocks
    const { title, blocks } = useSelect((select) => ({
        title: select('core/editor').getEditedPostAttribute('title'),
        blocks: select('core/block-editor').getBlocks(),
    }), []);

    // Get dispatch functions
    const dispatch = useDispatch();
    const { editPost } = useDispatch('core/editor');
    const { updateBlockAttributes } = useDispatch('core/block-editor');

    const restNamespace = window.translationConfig?.restNamespace || 'wp-translation/v1';

    // Generic translation handler
    const handleTranslation = async (language, mode) => {
        if (!selectedBackend) {
            alert(__('No translation backend selected', 'wordpress-openai-translation'));
            return;
        }

        const isTitle = mode === 'title';
        const includeAllBlocks = mode === 'all';

        const setLoading = isTitle ? setIsTranslatingTitle : setIsTranslating;
        setLoading(true);

        try {
            await withEditorLock(dispatch, async () => {
                // Prepare blocks based on mode
                let blocksToTranslate;
                if (isTitle) {
                    blocksToTranslate = [];
                } else if (includeAllBlocks) {
                    blocksToTranslate = blocks;
                } else {
                    blocksToTranslate = filterUntranslatedBlocks(blocks);
                    if (blocksToTranslate.length === 0) {
                        alert(__('All blocks have been individually translated. Use "Re-translate All" to override.', 'wordpress-openai-translation'));
                        return;
                    }
                }

                // Call API
                const response = await translateFullPage({
                    backend: selectedBackend,
                    title,
                    blocks: blocksToTranslate,
                    language,
                    restNamespace
                });

                // Update title
                editPost({ title: response.title });

                // Update blocks recursively if not title-only
                if (!isTitle) {
                    response.blocks.forEach((translatedBlock) => {
                        updateBlockRecursively(translatedBlock, updateBlockAttributes);
                    });
                }
            });
        } catch (error) {
            alert(error.message || __('Translation failed', 'wordpress-openai-translation'));
        } finally {
            setLoading(false);
        }
    };

    const backendKeys = Object.keys(backends);
    const showBackendSelector = backendKeys.length > 1;
    const isDisabled = isTranslating || isTranslatingTitle || !selectedBackend;

    return (
        <PanelBody title={__('Translation', 'wordpress-openai-translation')}>
            {showBackendSelector && (
                <PanelRow>
                    <SelectControl
                        label={__('Translation Backend', 'wordpress-openai-translation')}
                        value={selectedBackend}
                        options={[
                            { value: '', label: __('Select backend...', 'wordpress-openai-translation'), disabled: true },
                            ...backendKeys.map(key => ({
                                value: key,
                                label: backends[key]
                            }))
                        ]}
                        onChange={handleBackendChange}
                        disabled={isDisabled}
                    />
                </PanelRow>
            )}

            {/* Full page translation (skips individually translated blocks) */}
            <PanelRow>
                <div style={{ width: '100%' }}>
                    <div style={{ marginBottom: '8px', fontSize: '11px', color: '#757575' }}>
                        {selectedBackend && backends[selectedBackend] && (
                            <span>
                                {__('Using:', 'wordpress-openai-translation')} <strong>{backends[selectedBackend]}</strong>
                            </span>
                        )}
                    </div>
                    <LanguageDropdown
                        languages={languages}
                        onSelect={(language) => handleTranslation(language, 'untranslated')}
                        infoText={__('Translate remaining untranslated blocks', 'wordpress-openai-translation')}
                        renderToggle={({ isOpen, onToggle }) => (
                            <Button
                                onClick={onToggle}
                                aria-expanded={isOpen}
                                disabled={isDisabled}
                                variant="secondary"
                                style={{ width: '100%' }}
                            >
                                {isTranslating ? (
                                    <>
                                        <Spinner />
                                        {__('Translating...', 'wordpress-openai-translation')}
                                    </>
                                ) : (
                                    __('Translate page', 'wordpress-openai-translation')
                                )}
                            </Button>
                        )}
                    />
                </div>
            </PanelRow>

            {/* Re-translate all (including individually translated blocks) */}
            <PanelRow>
                <div style={{ width: '100%' }}>
                    <LanguageDropdown
                        languages={languages}
                        onSelect={(language) => handleTranslation(language, 'all')}
                        infoText={__('Translates all blocks, including previously translated', 'wordpress-openai-translation')}
                        renderToggle={({ isOpen, onToggle }) => (
                            <Button
                                onClick={onToggle}
                                aria-expanded={isOpen}
                                disabled={isDisabled}
                                variant="secondary"
                                style={{ width: '100%' }}
                                isDestructive
                            >
                                {__('Re-translate All', 'wordpress-openai-translation')}
                            </Button>
                        )}
                    />
                </div>
            </PanelRow>


            {/* Title-only translation */}
            <PanelRow>
                <div style={{ width: '100%' }}>
                    <div style={{ marginBottom: '8px', fontSize: '11px', color: '#757575', fontWeight: '600' }}>
                        {__('Translate Title Only', 'wordpress-openai-translation')}
                    </div>
                    <LanguageDropdown
                        languages={languages}
                        onSelect={(language) => handleTranslation(language, 'title')}
                        renderToggle={({ isOpen, onToggle }) => (
                            <Button
                                onClick={onToggle}
                                aria-expanded={isOpen}
                                disabled={isDisabled}
                                variant="secondary"
                                style={{ width: '100%' }}
                            >
                                {isTranslatingTitle ? (
                                    <>
                                        <Spinner />
                                        {__('Translating title...', 'wordpress-openai-translation')}
                                    </>
                                ) : (
                                    __('Translate title', 'wordpress-openai-translation')
                                )}
                            </Button>
                        )}
                    />
                </div>
            </PanelRow>

        </PanelBody>
    );
};

const TranslationSidebar = () => {
    return (
        <PluginSidebar
            name="openai-translation-sidebar"
            title={__('Automated translation', 'wordpress-openai-translation')}
            icon="translation"
        >
            <TranslationPanel />
        </PluginSidebar>
    );
};

registerPlugin('openai-translation-plugin', {
    render: TranslationSidebar,
});
