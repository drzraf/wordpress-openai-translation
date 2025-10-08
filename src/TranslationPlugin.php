<?php
declare(strict_types=1);

namespace Translation;

use Translation\Wordpress\Endpoints;
use Translation\Wordpress\Installation;
use Translation\Wordpress\ManageAssets;
use Translation\Wordpress\SettingsPage;

final readonly class TranslationPlugin
{
    const NAMESPACE = 'wp-translation/v1';

    public function __construct(
        private string $file,
        private string $openaiApiKey,
        private string $deeplApiKey,
        private string $validatorName
    )
    {
        new Installation($this->file, $this->validatorName, $this->openaiApiKey, $this->deeplApiKey);
        new SettingsPage($this->file);
        new Endpoints();
        new ManageAssets($this->file);
    }

    public static function getAvailableBackends(): array
    {
        $backends = [];

        if (get_option('openai_translation_api_key')) {
            $backends['openai'] = 'OpenAI';
        }

        // Google Translate is always available (no API key required)
        $backends['google'] = 'Google Translate';

        if (get_option('deepl_translation_api_key')) {
            $backends['deepl'] = 'DeepL';
        }

        return $backends;
    }

    public static function getLanguageList(): array
    {
        $languagesString = defined('TRANSLATION_LANGUAGES') ? TRANSLATION_LANGUAGES : 'en_GB,en_US,fr_FR,es_ES,de_DE,it_IT,ja_JP';
        $locales = array_map('trim', explode(',', $languagesString));

        $languageNames = [
            'en_GB' => __('English (GB)', 'wordpress-openai-translation'),
            'en_US' => __('English (US)', 'wordpress-openai-translation'),
            'fr_FR' => __('French', 'wordpress-openai-translation'),
            'es_ES' => __('Spanish', 'wordpress-openai-translation'),
            'de_DE' => __('German', 'wordpress-openai-translation'),
            'it_IT' => __('Italian', 'wordpress-openai-translation'),
            'ja_JP' => __('Japanese', 'wordpress-openai-translation'),
            'pl_PL' => __('Polish', 'wordpress-openai-translation'),
            'nl_NL' => __('Dutch', 'wordpress-openai-translation'),
            'ro_RO' => __('Romanian', 'wordpress-openai-translation'),
            'pt_PT' => __('Portuguese', 'wordpress-openai-translation'),
            'cs_CZ' => __('Czech', 'wordpress-openai-translation'),
        ];

        $languages = [];
        foreach ($locales as $locale) {
            $languages[] = [
                'code' => $locale,
                'label' => $languageNames[$locale] ?? $locale,
            ];
        }

        return $languages;
    }
}
