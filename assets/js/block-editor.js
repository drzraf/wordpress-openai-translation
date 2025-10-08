const { addFilter } = wp.hooks;
const { createHigherOrderComponent } = wp.compose;
const { Fragment } = wp.element;

import { BlockTranslationControl } from './block-controls/translation-control';
import { BlockRollbackControl } from './block-controls/rollback-control';
import { BatchTranslationControl } from './block-controls/batch-translation';

// Add translation and rollback controls to supported blocks
const withTranslationControls = createHigherOrderComponent((BlockEdit) => {
    return (props) => {
        const { clientId, attributes, name } = props;

        return (
            <Fragment>
                <BlockTranslationControl
                    clientId={clientId}
                    attributes={attributes}
                    name={name}
                />
                <BlockRollbackControl
                    clientId={clientId}
                    attributes={attributes}
                />
                <BlockEdit {...props} />
            </Fragment>
        );
    };
}, 'withTranslationControls');

// Register the filter for all blocks
addFilter(
    'editor.BlockEdit',
    'wordpress-openai-translation/block-controls',
    withTranslationControls
);

// Initialize batch translation controller
document.addEventListener('DOMContentLoaded', () => {
    // The BatchTranslationControl component is a controller,
    // it doesn't render UI but manages batch operations
    const { render } = wp.element;
    const container = document.createElement('div');
    container.style.display = 'none';
    document.body.appendChild(container);

    render(
        wp.element.createElement(BatchTranslationControl),
        container
    );
});