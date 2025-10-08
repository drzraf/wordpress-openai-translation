<?php

/*
 * Plugin Name: OpenAI Translation
 * Description: Translate content of a post with OpenAI, Google Translate, and DeepL
 * Author: Maxime Nicole
 * Version: 1.2.0
 */

// Make sure we don't expose any info if called directly

if (!function_exists('add_action')) {
    echo 'Hi there!  I\'m just a plugin, not much I can do when called directly.';
    exit;
}

if (!defined('OPENAI_API_KEY')) {
    define('OPENAI_API_KEY', getenv('OPENAI_API_KEY') ?: '');
}
if (!defined('DEEPL_API_KEY')) {
    define('DEEPL_API_KEY', getenv('DEEPL_API_KEY') ?: '');
}

define('OPENAI_TRANSLATION_VALIDATOR', getenv('OPENAI_TRANSLATION_VALIDATOR') ?: 'custom');

// Configurable language list - comma-separated locale codes
if (!defined('TRANSLATION_LANGUAGES')) {
    define('TRANSLATION_LANGUAGES', 'en_GB,en_US,fr_FR,es_ES,de_DE,it_IT,ja_JP,pl_PL,nl_NL,ro_RO,pt_PT,cs_CZ');
}

$autoload = plugin_dir_path(__FILE__) . 'vendor/autoload.php';
if (file_exists($autoload)) {
    require $autoload;
}

$plugin = new Translation\TranslationPlugin(__FILE__, OPENAI_API_KEY, DEEPL_API_KEY, OPENAI_TRANSLATION_VALIDATOR);
