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

        // Translates the text of each block
        array_map(fn($block) => $this->translateBlock($block, $request->targetLanguage, $response), $request->blocks);
    }

    public function translateBlock(array $block, string $targetLanguage, TranslateTextResponse $response): void
    {
        $blockName = $block['name'] ?? '';
        $attributes = $block['attributes'] ?? [];

        // Extract content based on block type
        $content = match($blockName) {
            'core/paragraph', 'core/heading', 'core/quote' => $attributes['content'] ?? '',
            'core/list' => $attributes['values'] ?? '',
            default => $attributes['content'] ?? '',
        };

        if (empty($content)) {
            $response->addError('internal', 'internal.error.no_content for ' . $blockName);
            return;
        }

        // Translate the content
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
        $response->addBlock($block);
    }

    private function getContentAttributeName(string $blockName): string
    {
        return match($blockName) {
            'core/list' => 'values',
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
