const { __ } = wp.i18n;
const { BlockControls } = wp.blockEditor;
const { ToolbarGroup, ToolbarButton } = wp.components;
const { useDispatch } = wp.data;

export const BlockRollbackControl = ({ clientId, attributes }) => {
    const { updateBlockAttributes } = useDispatch('core/block-editor');

    // Check if block has translation backup
    const hasBackup = attributes._translationBackup !== undefined;

    if (!hasBackup) {
        return null;
    }

    const handleRollback = () => {
        const backup = attributes._translationBackup;

        // Build confirmation message with translation details
        const backendInfo = backup.backendName || backup.backend || 'Unknown';
        const translationDate = backup.timestamp
            ? new Date(backup.timestamp).toLocaleString()
            : '';

        let confirmMessage = __('Restore original content?', 'wordpress-openai-translation');
        confirmMessage += '\n\n';
        confirmMessage += __('Translation by:', 'wordpress-openai-translation') + ' ' + backendInfo;
        if (translationDate) {
            confirmMessage += '\n' + __('Date:', 'wordpress-openai-translation') + ' ' + translationDate;
        }

        // Confirm rollback action
        const confirmRollback = confirm(confirmMessage);

        if (!confirmRollback) {
            return;
        }

        // Restore original content
        updateBlockAttributes(clientId, {
            content: backup.content,
            _translationBackup: undefined, // Clear backup after restore
        });
    };

    const backup = attributes._translationBackup;
    const backendName = backup.backendName || backup.backend || '';
    const translationDate = backup.timestamp ? new Date(backup.timestamp).toLocaleString() : '';

    // Build tooltip with translation info
    let tooltipText = __('Restore Original', 'wordpress-openai-translation');
    if (backendName) {
        tooltipText += ' (' + backendName;
        if (translationDate) {
            tooltipText += ', ' + translationDate;
        }
        tooltipText += ')';
    }

    return (
        <BlockControls>
            <ToolbarGroup>
                <ToolbarButton
                    icon="undo"
                    label={tooltipText}
                    onClick={handleRollback}
                    className="block-rollback-button"
                    style={{
                        color: '#d94f4f', // Subtle red to indicate destructive action
                    }}
                />
            </ToolbarGroup>
        </BlockControls>
    );
};