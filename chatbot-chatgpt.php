<?php
/*
 * Plugin Name: Chatbot ChatGPT
 * Plugin URI:  https://github.com/kognetiks/chatbot-chatgpt
 * Description: A simple plugin to add a Chatbot ChatGPT to your Wordpress Website.
 * Version:     1.4.2
 * Author:      Kognetiks.com
 * Author URI:  https://www.kognetiks.com
 * License:     GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 *  
 * This program is free software; you can redistribute it and/or modify it under the terms of the GNU
 * General Public License version 2, as published by the Free Software Foundation. You may NOT assume
 * that you can use any other version of the GPL.
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
 * even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * 
 * You should have received a copy of the GNU General Public License
 * along with Chatbot ChatGPT. If not, see https://www.gnu.org/licenses/gpl-2.0.html.
 * 
*/

// If this file is called directly, die.
defined( 'WPINC' ) || die;

// If this file is called directly, die.
if ( ! defined( 'ABSPATH' ) ) {
	die();
}

// Include necessary files
require_once plugin_dir_path(__FILE__) . 'includes/chatbot-chatgpt-settings.php';
require_once plugin_dir_path(__FILE__) . 'includes/chatbot-chatgpt-shortcode.php';

// Diagnostics On or Off - Ver 1.4.2
update_option('chatgpt_diagnostics', 'On');

// Enqueue plugin scripts and styles
function chatbot_chatgpt_enqueue_scripts() {
    // Ensure the Dashicons font is properly enqueued - Ver 1.1.0
    // wp_enqueue_style( 'dashicons' );
    wp_enqueue_style('chatbot-chatgpt-css', plugins_url('assets/css/chatbot-chatgpt.css', __FILE__));
    wp_enqueue_script('chatbot-chatgpt-js', plugins_url('assets/js/chatbot-chatgpt.js', __FILE__), array('jquery'), '1.0', true);

    // Ver 1.4.1
    // Enqueue the chatbot-chatgpt-local.js file
    wp_enqueue_script('chatbot-chatgpt-local', plugins_url('assets/js/chatbot-chatgpt-local.js', __FILE__), array('jquery'), '1.0', true);
    $chatbot_settings = array(
        'chatgpt_bot_name' => esc_attr(get_option('chatgpt_bot_name')),
        'chatgpt_system_message' => esc_attr(get_option('chatgpt_system_message')),
        'chatgpt_initial_greeting' => esc_attr(get_option('chatgpt_initial_greeting')),
        'chatgpt_subsequent_greeting' => esc_attr(get_option('chatgpt_subsequent_greeting')),
        'chatGPTChatBotStatus' => esc_attr(get_option('chatGPTChatBotStatus')),
        'chatgpt_disclaimer_setting' => esc_attr(get_option('chatgpt_disclaimer_setting')),
        'chatgpt_max_tokens_setting' => esc_attr(get_option('chatgpt_max_tokens_setting')),
        'chatgpt_temperature_setting' => esc_attr(get_option('chatgpt_temperature_setting')),
        'chatgpt_width_setting' => esc_attr(get_option('chatgpt_width_setting')),
    );
    wp_localize_script('chatbot-chatgpt-local', 'chatbotSettings', $chatbot_settings);

    wp_localize_script('chatbot-chatgpt-js', 'chatbot_chatgpt_params', array(
        'ajax_url' => admin_url('admin-ajax.php'),
        'api_key' => esc_attr(get_option('chatgpt_api_key')),

    ));
}
add_action('wp_enqueue_scripts', 'chatbot_chatgpt_enqueue_scripts');

// register send email endpoint
add_action('rest_api_init', function () {
    register_rest_route('inno/v1', '/email/', array(
        'methods' => 'POST',
        'callback' => 'send_contact_email',
        'permission_callback' => '__return_true'
    ));
});

// Handle Ajax requests
function chatbot_chatgpt_send_message() {
    // Get the save API key
    $api_key = esc_attr(get_option('chatgpt_api_key'));
    // Get the saved model from the settings or default to gpt-3.5-turbo
    $model = esc_attr(get_option('chatgpt_model_choice', 'gpt-3.5-turbo'));
    // Max tokens - Ver 1.4.2
    $max_tokens = esc_attr(get_option('chatgpt_max_tokens_setting', 150));
    // Temperature - JL
    $temperature = esc_attr(get_option('chatgpt_temperature_setting', 0.5));
    // Send only clean text via the API
    $message = sanitize_text_field($_POST['message']);

    // Check API key and message
    if (!$api_key || !$message) {
        wp_send_json_error('Invalid API key or message');
    }

    // Send message to ChatGPT API
    $response = chatbot_chatgpt_call_api($api_key, $message);

    // Return response
    wp_send_json_success($response);
}

// Add link to chatgtp options - setting page
function chatbot_chatgpt_plugin_action_links($links) {
    $settings_link = '<a href="../wp-admin/options-general.php?page=chatbot-chatgpt">' . __('Settings', 'chatbot-chatgpt') . '</a>';
    array_unshift($links, $settings_link);
    return $links;
}

add_action('wp_ajax_chatbot_chatgpt_send_message', 'chatbot_chatgpt_send_message');
add_action('wp_ajax_nopriv_chatbot_chatgpt_send_message', 'chatbot_chatgpt_send_message');
add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'chatbot_chatgpt_plugin_action_links');

// Call the ChatGPT API
function chatbot_chatgpt_call_api($api_key, $message) {
    // Diagnostics = Ver 1.4.2
    $chatgpt_diagnostics = esc_attr(get_option('chatgpt_diagnostics', 'Off'));

    // The current ChatGPT API URL endpoint for gpt-3.5-turbo and gpt-4
    $api_url = 'https://api.openai.com/v1/chat/completions';

    $headers = array(
        'Authorization' => 'Bearer ' . $api_key,
        'Content-Type' => 'application/json',
    );

    // Select the OpenAI Model
    // Get the saved model from the settings or default to "gpt-3.5-turbo"
    $model = esc_attr(get_option('chatgpt_model_choice', 'gpt-3.5-turbo'));

    // Model temperature - Ver Inno
    $temperature = intval(esc_attr(get_option('chatgpt_temperature_setting', 0.5)));

    // Max tokens - Ver 1.4.2
    $max_tokens = intval(esc_attr(get_option('chatgpt_max_tokens_setting', '150')));

    $system_prompt = esc_attr(get_option('chatgpt_system_message'));

    // Get previous chat messages
    $previous_messages = array(array('role' => 'system', 'content' => $system_prompt,));
    $chat_messages = json_decode(stripslashes($_POST['chat_messages']), true);
    if (is_array($chat_messages) && count($chat_messages) > 0) {
        foreach ($chat_messages as $chat_message) {
            if (!str_contains($chat_message, 'OFF-TOPIC')) {
                echo $chat_message . '<br>';
                $previous_messages[] = array(
                    'role' => $chat_message['role'],
                    'content' => $chat_message['content'],
                );
            } else {
                // remove the last message (the user's off topic request) from $previous_messages
                // array_pop($previous_messages);
                // Continue without adding current message (the reply to the off topic request) to $previous_messages
                continue;
            }
        }
    }

    // Append new user message
    $user_message = array(
        'role' => 'user',
        'content' => $message,
    );
    $messages = array_merge($previous_messages, array($user_message));

    $body = array(
        'model' => $model,
        'messages' => $messages,
        'max_tokens' => $max_tokens,
        'temperature' => $temperature,
    );

    $args = array(
        'headers' => $headers,
        'body' => json_encode($body),
        'method' => 'POST',
        'data_format' => 'body',
        'timeout' => 50,
    );

    $response = wp_remote_post($api_url, $args);

    // Handle any errors that are returned from the chat engine
    if (is_wp_error($response)) {
        return 'Error: ' . $response->get_error_message().' Please check Settings for a valid API key or your OpenAI account for additional information.';
    }

    $response_body_str = wp_remote_retrieve_body($response);
    $response_body = json_decode($response_body_str, true);

    if (isset($response_body['choices']) && !empty($response_body['choices'])) {
        // Handle the response from the chat engine
        $response_content = $response_body['choices'][0]['message']['content'];
        // if (str_contains($response_content, '{')) {
        //     $email_info_dict = extractJSON($response_content);
        //     // $response_content = removeJSON($response_content);
        //     send_contact_email($email_info_dict);
        //     return $response_content;
        // }
        return $response_content;
    } else {
        // Handle any errors that are returned from the chat engine
        // return 'Error: Unable to fetch response from ChatGPT API. Please check Settings for a valid API key or your OpenAI account for additional information.';
        return 'Error: ' . $response_body_str;
    }
}

function removeJSON($inputString) {
    //Matches any JSON string starting with a { and ending with a }
    $pattern = '/{.*?}/'; 
    // Replace the matching substring with an empty string
    $outputString = preg_replace($pattern, "", $inputString);
    // Returns the resulting string
    return $outputString;
  }

function send_contact_email(WP_REST_Request $request) {
    $firstName = $request['firstName'];
    $lastName = $request['lastName'];
    $userEmail = $request['userEmail'];
    $bodyHtml = $request['bodyHtml'];
    
    // $api_key_ee = "B80B27BCF3A88AA9DA98EB5A4B87DFA0C46C6C53671B329A2A1E182B1AAE583F47DF6DE0F53A2726132A50D0AB37ABAA";
    $api_key_ee = esc_attr(get_option('elasticemail_api_key'));
    
    // $from = "inno@kenlonyai.com";
    $from = "ledermau@gmail.com";
    // $from = esc_attr(get_option('contact_email_from_address', "inno@kenlonyai.com"));
    
    $to = "contactme@kenlonyai.com";
    // $to = esc_attr(get_option('contact_email_to_address', "contactme@kenlonyai.com"));
    
    $api_url_ee = 'https://api.elasticemail.com/v2/email/send?';
    $api_url_ee .= 'apikey='.urlencode($api_key_ee);
    $api_url_ee .= '&subject='.urlencode("Message from Chatbot, from " . $firstName . " " . $lastName . " - " . $userEmail);
    $api_url_ee .= '&bodyHtml='.urlencode($bodyHtml);
    $api_url_ee .= '&from='.urlencode($from);
    $api_url_ee .= '&to='.urlencode($to);

    $args = array(
        'body' => json_encode(array()),
        'method' => 'POST',
        'data_format' => 'body',
        'timeout' => 50, // Increase the timeout values to 15 seconds to wait just a bit longer for a response from the engine
    );

    $response = wp_remote_get($api_url_ee, $args);

    // Handle any errors that are returned
    if (is_wp_error($response)) {
        return 'Error sending elasticemail: ' . $response->get_error_message();
    }

    // Return json_decode(wp_remote_retrieve_body($response), true);
    $response_body_str = wp_remote_retrieve_body($response);
    $response_body = json_decode($response_body_str, true);

    return $response_body_str;
}

function enqueue_greetings_script() {
    wp_enqueue_script('greetings', plugin_dir_url(__FILE__) . 'assets/js/greetings.js', array('jquery'), null, true);

    $greetings = array(
        'initial_greeting' => esc_attr(get_option('chatgpt_initial_greeting', 'Hello! How can I help you today?')),
        'subsequent_greeting' => esc_attr(get_option('chatgpt_subsequent_greeting', 'Hello again! How can I help you?')),
    );

    wp_localize_script('greetings', 'greetings_data', $greetings);
}
add_action('wp_enqueue_scripts', 'enqueue_greetings_script');