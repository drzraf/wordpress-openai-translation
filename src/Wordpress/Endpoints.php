<?php
declare(strict_types=1);

namespace Translation\Wordpress;

use Translation\Domain\Service\CustomLocaleValidator;
use Translation\Domain\Service\DeepLTranslator;
use Translation\Domain\Service\GoogleTranslator;
use Translation\Domain\Service\OpenAITranslator;
use Translation\Domain\Service\SymfonyLocaleValidator;
use Translation\Domain\Service\TranslatorInterface;
use Translation\Domain\UseCase\TranslateText\TranslateText;
use Translation\Domain\UseCase\TranslateText\TranslateTextRequest;
use Translation\Presentation\TranslateTextJsonPresenter;
use Translation\TranslationPlugin;

final class Endpoints
{
    public function __construct()
    {
        add_action('rest_api_init', [$this, 'register_routes']);
    }

    public function register_routes(): void
    {
        $backends = ['openai', 'google', 'deepl'];

        foreach ($backends as $backend) {
            register_rest_route(TranslationPlugin::NAMESPACE, '/translate-' . $backend, [
                'methods' => \WP_REST_Server::CREATABLE,
                'permission_callback' => [$this, 'privileged_permission_callback'],
                'callback' => function(\WP_REST_Request $request) use ($backend) {
                    return $this->translate_text($request, $backend);
                },
            ]);
        }
    }

    public static function privileged_permission_callback(): bool
    {
        return current_user_can('edit_posts') || current_user_can('edit_pages');
    }

    private function createTranslator(string $backend): ?TranslatorInterface
    {
        return match($backend) {
            'openai' => $this->createOpenAITranslator(),
            'google' => new GoogleTranslator(),
            'deepl' => $this->createDeepLTranslator(),
            default => null,
        };
    }

    private function createOpenAITranslator(): ?OpenAITranslator
    {
        $apiKey = get_option('openai_translation_api_key');
        if (empty($apiKey)) {
            return null;
        }
        return new OpenAITranslator($apiKey);
    }

    private function createDeepLTranslator(): ?DeepLTranslator
    {
        $apiKey = get_option('deepl_translation_api_key');
        if (empty($apiKey)) {
            return null;
        }
        return new DeepLTranslator($apiKey);
    }

    public function translate_text(\WP_REST_Request $request, string $backend): \WP_REST_Response
    {
        $response = new \WP_REST_Response();

        // Create translator instance
        $translator = $this->createTranslator($backend);
        if (!$translator) {
            $response->set_data([
                'errors' => ['backend' => 'Translation backend not available or not configured']
            ]);
            $response->set_status(400);
            return $response;
        }

        // Init use case
        $validator = match (get_option('openai_translation_validator_name')) {
            'symfony' => new SymfonyLocaleValidator(),
            default => new CustomLocaleValidator(),
        };
        $translateText = new TranslateText($translator, $validator);
        $presenter = new TranslateTextJsonPresenter();

        // Create request
        $translateTextRequest = new TranslateTextRequest();
        $translateTextRequest->title = $request->get_param('title');
        $translateTextRequest->blocks = $request->get_param('blocks');
        $translateTextRequest->targetLanguage = $request->get_param('language');

        // Execute use case
        $translateText->execute($translateTextRequest, $presenter);

        // Generate response
        $response->set_data($presenter->json());
        if ($presenter->hasErrors()) {
            $response->set_status(400);
        }

        return $response;
    }
}
