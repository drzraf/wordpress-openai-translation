const { __ } = wp.i18n;
const { registerPlugin } = wp.plugins;
const { useState, useEffect } = wp.element;
const { PanelBody, PanelRow, Button, Dropdown, MenuGroup, MenuItem, Spinner, SelectControl } = wp.components;
const { PluginSidebar } = wp.editPost;
const { useSelect, useDispatch } = wp.data;
const apiFetch = wp.apiFetch;

import { BackendManager } from './utils/backend-manager';

const TranslationPanel = () => {
    const [isTranslating, setIsTranslating] = useState(false);
    const [selectedBackend, setSelectedBackend] = useState('');
    const [backends, setBackends] = useState({});
    const [languages, setLanguages] = useState([]);

    // Initialize from global config
    useEffect(() => {
        if (window.translationConfig) {
            const availableBackends = window.translationConfig.backends || {};
            setBackends(availableBackends);

            // Get backend from manager (synced across components)
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

    // Get current post title and blocks from the editor
    const { title, blocks } = useSelect((select) => ({
        title: select('core/editor').getEditedPostAttribute('title'),
        blocks: select('core/block-editor').getBlocks(),
    }), []);

    // Get dispatch functions for updating editor content
    const { editPost, lockPostSaving, unlockPostSaving } = useDispatch('core/editor');
    const { replaceBlocks } = useDispatch('core/block-editor');
    const { lockPostAutosaving, unlockPostAutosaving } = useDispatch('core/editor');

    const handleTranslation = async (language) => {
        if (!selectedBackend) {
            alert(__('No translation backend selected', 'wordpress-openai-translation'));
            return;
        }

        setIsTranslating(true);

        // Lock the editor to prevent concurrent edits
        lockPostSaving('translation-in-progress');
        lockPostAutosaving('translation-in-progress');

        try {
            const restNamespace = window.translationConfig?.restNamespace || 'wp-translation/v1';
            const response = await apiFetch({
                path: `/${restNamespace}/translate-${selectedBackend}`,
                method: 'POST',
                data: {
                    title,
                    blocks,
                    language,
                },
            });

            if (response.errors) {
                const errorMessages = Object.values(response.errors).join(', ');
                throw new Error(errorMessages);
            }

            // Update the post title
            editPost({ title: response.title });

            // Replace blocks with translated content
            response.blocks.forEach((block) => {
                const newBlock = wp.blocks.createBlock(
                    block.name,
                    {
                        ...block.attributes,
                        dropCap: block.attributes.dropCap === 'true' || block.attributes.dropCap === true,
                    }
                );
                replaceBlocks(block.clientId, newBlock);
            });
        } catch (error) {
            alert(error.message || __('Translation failed', 'wordpress-openai-translation'));
        } finally {
            setIsTranslating(false);
            // Unlock the editor
            unlockPostSaving('translation-in-progress');
            unlockPostAutosaving('translation-in-progress');
        }
    };

    const backendKeys = Object.keys(backends);
    const showBackendSelector = backendKeys.length > 1;

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
                        disabled={isTranslating}
                    />
                </PanelRow>
            )}

            <PanelRow>
                <div style={{ width: '100%' }}>
                    <div style={{ marginBottom: '8px', fontSize: '11px', color: '#757575' }}>
                        {selectedBackend && backends[selectedBackend] && (
                            <span>
                                {__('Using:', 'wordpress-openai-translation')} <strong>{backends[selectedBackend]}</strong>
                            </span>
                        )}
                    </div>
                    <Dropdown
                        className="translation-dropdown"
                        contentClassName="translation-dropdown-content"
                        position="bottom left"
                        renderToggle={({ isOpen, onToggle }) => (
                            <Button
                                onClick={onToggle}
                                aria-expanded={isOpen}
                                disabled={isTranslating || !selectedBackend}
                                variant="secondary"
                                style={{ width: '100%' }}
                            >
                                {isTranslating ? (
                                    <>
                                        <Spinner />
                                        {__('Translating...', 'wordpress-openai-translation')}
                                    </>
                                ) : (
                                    __('Translate to...', 'wordpress-openai-translation')
                                )}
                            </Button>
                        )}
                        renderContent={({ onClose }) => (
                            <MenuGroup label={__('Select Language', 'wordpress-openai-translation')}>
                                {languages.map((lang) => (
                                    <MenuItem
                                        key={lang.code}
                                        onClick={() => {
                                            handleTranslation(lang.code);
                                            onClose();
                                        }}
                                    >
                                        {lang.label}
                                    </MenuItem>
                                ))}
                            </MenuGroup>
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
            title={__('Translation', 'wordpress-openai-translation')}
            icon="translation"
        >
            <TranslationPanel />
        </PluginSidebar>
    );
};

registerPlugin('openai-translation-plugin', {
    render: TranslationSidebar,
});
