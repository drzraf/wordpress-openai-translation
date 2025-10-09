/**
 * Block validation utilities to prevent broken blocks
 */

const { serialize } = wp.blocks;

/**
 * Validate that a block can be serialized without errors
 * This ensures the block won't break when saved
 * 
 * @param {Object} block - Block object with name, attributes, innerBlocks
 * @param {string} context - Context for error reporting (e.g., "block translation")
 * @returns {Object} { valid: boolean, error: string|null }
 */
export const validateBlockSerialization = (block, context = 'unknown') => {
    if (!block || !block.name) {
        const error = `[${context}] Invalid block structure: missing block or block name`;
        console.error(error, {
            block,
            hasName: !!block?.name,
            hasAttributes: !!block?.attributes,
            hasInnerBlocks: !!block?.innerBlocks
        });
        return { valid: false, error };
    }

    try {
        // Attempt to serialize the block
        // This will throw if the block structure is invalid
        const serialized = serialize(block);
        
        if (typeof serialized !== 'string') {
            const error = `[${context}] Block serialization failed: result is not a string`;
            console.error(error, {
                blockName: block.name,
                clientId: block.clientId,
                serializationResult: serialized,
                attributes: block.attributes,
                innerBlocksCount: block.innerBlocks?.length || 0
            });
            return { valid: false, error };
        }

        // Validate innerBlocks recursively
        if (block.innerBlocks && block.innerBlocks.length > 0) {
            for (let i = 0; i < block.innerBlocks.length; i++) {
                const innerBlock = block.innerBlocks[i];
                const innerValidation = validateBlockSerialization(
                    innerBlock,
                    `${context} > innerBlock[${i}]`
                );
                
                if (!innerValidation.valid) {
                    // Propagate inner block error
                    return innerValidation;
                }
            }
        }

        return { valid: true, error: null };

    } catch (error) {
        const errorMsg = `[${context}] Block serialization threw error: ${error.message}`;
        console.error(errorMsg, {
            blockName: block.name,
            clientId: block.clientId,
            errorStack: error.stack,
            attributes: block.attributes,
            innerBlocksCount: block.innerBlocks?.length || 0,
            errorDetails: {
                message: error.message,
                name: error.name
            }
        });
        return { valid: false, error: errorMsg };
    }
};

/**
 * Validate multiple blocks (e.g., from whole-page translation)
 * 
 * @param {Array} blocks - Array of block objects
 * @param {string} context - Context for error reporting
 * @returns {Object} { valid: boolean, error: string|null, failedIndex: number|null }
 */
export const validateBlocks = (blocks, context = 'unknown') => {
    if (!Array.isArray(blocks)) {
        const error = `[${context}] Invalid blocks: not an array`;
        console.error(error, {
            blocksType: typeof blocks,
            blocks
        });
        return { valid: false, error, failedIndex: null };
    }

    for (let i = 0; i < blocks.length; i++) {
        const validation = validateBlockSerialization(blocks[i], `${context}[${i}]`);
        if (!validation.valid) {
            return {
                valid: false,
                error: validation.error,
                failedIndex: i,
                failedBlock: blocks[i]
            };
        }
    }

    return { valid: true, error: null, failedIndex: null };
};