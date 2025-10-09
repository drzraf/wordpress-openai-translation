<?php
declare(strict_types=1);

namespace Translation\Domain\UseCase\TranslateText;

use Translation\Domain\Service\LocaleValidatorInterface;
use Translation\Domain\Service\TranslatorInterface;

final readonly class TranslateText
{
    public function __construct(
        private TranslatorInterface      $translator,
        private LocaleValidatorInterface $localeValidator
    )
    {
    }

    public function execute(TranslateTextRequest $request, TranslateTextPresenterInterface $presenter): void
    {
        $response = new TranslateTextResponse();

        $this->translateText($request, $response);

        $presenter->present($response);
    }

    private function validateRequest(TranslateTextRequest $request, TranslateTextResponse $response): bool
    {
        if (empty($request->title)) {
            $response->addError('title', 'form.title.required');
        }
        if (empty($request->blocks)) {
            $response->addError('blocks', 'form.blocks.required');
        }
        if (empty($request->targetLanguage)) {
            $response->addError('targetLanguage', 'form.targetLanguage.required');
        }
        return !$response->hasErrors();
    }

    private function validateLanguage(TranslateTextRequest $request, TranslateTextResponse $response): bool
    {
        if (!$this->localeValidator->validate($request->targetLanguage)) {
            $response->addError('targetLanguage', 'form.targetLanguage.not_supported');
        }
        return !$response->hasErrors();
    }

    private function translateText(TranslateTextRequest $request, TranslateTextResponse $response): void
    {
        if (!$this->validateRequest($request, $response)) {
            return;
        }

        if (!$this->validateLanguage($request, $response)) {
            return;
        }

        $this->translateTitle($request->title, $request->targetLanguage, $response);

        // Translates the text of each block (recursively handles nested blocks)
        array_map(fn($block) => $this->translateBlock($block, $request->targetLanguage, $response), $request->blocks);
    }

    public function translateBlock(array $block, string $targetLanguage, TranslateTextResponse $response): void
    {
        $blockName = $block['name'] ?? '';
        $attributes = $block['attributes'] ?? [];
        $innerBlocks = $block['innerBlocks'] ?? [];

        // Extract content based on block type
        $content = match($blockName) {
            'core/paragraph', 'core/heading', 'core/quote' => $attributes['content'] ?? '',
            'core/list' => $attributes['values'] ?? '',
            'core/button' => $attributes['text'] ?? '',
            default => $attributes['content'] ?? '',
        };

        // If this block has translatable content, translate it
        if (!empty($content)) {
            $translation = $this->translator->translate(
                text: $content,
                targetLanguage: $targetLanguage
            );

            if (!$translation) {
                $response->addError('internal', 'internal.error.translation_failed');
                return;
            }

            // Update block with translated content
            $block['attributes'][$this->getContentAttributeName($blockName)] = $translation;
        }

        // Recursively translate inner blocks (for groups, columns, etc.)
        if (!empty($innerBlocks)) {
            $translatedInnerBlocks = [];
            foreach ($innerBlocks as $innerBlock) {
                $innerResponse = new TranslateTextResponse();
                $this->translateBlock($innerBlock, $targetLanguage, $innerResponse);

                // Get the translated inner block
                $translated = $innerResponse->getBlocks();
                if (!empty($translated)) {
                    $translatedInnerBlocks[] = $translated[0];
                }
            }
            $block['innerBlocks'] = $translatedInnerBlocks;
        }

        // Add the (possibly updated) block to response
        $response->addBlock($block);
    }

    private function getContentAttributeName(string $blockName): string
    {
        return match($blockName) {
            'core/list' => 'values',
            'core/button' => 'text',
            default => 'content',
        };
    }

    private function translateTitle(string $title, string $targetLanguage, TranslateTextResponse $response): void
    {
        $title = $this->translator->translate(
            text: $title,
            targetLanguage: $targetLanguage
        );

        if (!$title) {
            $response->addError('internal', 'internal.error.translation_failed');
            return;
        }

        $response->setTitle($title);
    }
}
