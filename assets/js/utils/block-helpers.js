/**
 * Recursively update inner blocks for a parent block
 *
 * @param {string} parentClientId - The parent block's client ID
 * @param {Array} innerBlocks - Array of inner block objects to insert
 * @param {Function} replaceInnerBlocks - The replaceInnerBlocks dispatch function
 */
export const updateBlockRecursively = (parentClientId, innerBlocks, replaceInnerBlocks) => {
    if (!innerBlocks || innerBlocks.length === 0) {
        return;
    }

    // Convert inner blocks to the format expected by replaceInnerBlocks
    const blockObjects = innerBlocks.map(block => {
        // Create block object with proper structure
        const blockObject = wp.blocks.createBlock(
            block.name,
            block.attributes,
            block.innerBlocks ? block.innerBlocks.map(innerBlock =>
                wp.blocks.createBlock(
                    innerBlock.name,
                    innerBlock.attributes,
                    innerBlock.innerBlocks || []
                )
            ) : []
        );

        return blockObject;
    });

    // Replace the inner blocks
    replaceInnerBlocks(parentClientId, blockObjects, false);
};

/**
 * Get full block object including all attributes and inner blocks
 *
 * @param {Object} block - The block object from getBlock()
 * @returns {Object} Block structure with name, attributes, and innerBlocks
 */
export const getFullBlockStructure = (block) => {
    if (!block) {
        return null;
    }

    return {
        clientId: block.clientId,
        name: block.name,
        attributes: { ...block.attributes },
        innerBlocks: block.innerBlocks ? block.innerBlocks.map(getFullBlockStructure) : []
    };
};

/**
 * Create a backup of a block including all attributes and inner blocks
 *
 * @param {Object} block - The block object to backup
 * @param {string} backend - The translation backend used
 * @param {string} backendName - The display name of the backend
 * @param {string} language - The target language
 * @returns {Object} Backup structure
 */
export const createBlockBackup = (block, backend, backendName, language) => {
    return {
        attributes: { ...block.attributes },
        innerBlocks: block.innerBlocks ? block.innerBlocks.map(innerBlock =>
            createBlockBackup(innerBlock, backend, backendName, language)
        ) : [],
        timestamp: new Date().toISOString(),
        backend: backend,
        backendName: backendName,
        language: language
    };
};