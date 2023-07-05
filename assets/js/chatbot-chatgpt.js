jQuery(document).ready(function ($) {
    const prefix_a = "As an AI language model, ";
    const prefix_b = "I am an AI language model and ";

    var offTopicCounter = 0;

    // Logging for Diagnostics - Ver 1.4.2
    var chatgpt_diagnostics = 'On' //localStorage.getItem('chatgpt_diagnostics') || 'Off';
    localStorage.setItem('chatgpt_diagnostics', chatgpt_diagnostics); // Set if not set

    var messageInput = $('#chatbot-chatgpt-message');
    var conversation = $('#chatbot-chatgpt-conversation');
    var submitButton = $('#chatbot-chatgpt-submit');

    // Set bot width with the default Narrow or from setting Wide - Ver 1.4.2
    var chatgpt_width_setting = localStorage.getItem('chatgpt_width_setting') || 'Narrow';

    var chatGptChatBot = $('#chatbot-chatgpt');
    if (chatgpt_width_setting === 'Wide') {
        chatGptChatBot.addClass('wide');
    } else {
        chatGptChatBot.removeClass('wide');
    }

    // Diagnostics = Ver 1.4.2
    if (chatgpt_diagnostics === 'On') {
        console.log(messageInput);
        console.log(conversation);
        console.log(submitButton);
        console.log(chatGptChatBot);
        console.log('chatgpt_width_setting: ' + chatgpt_width_setting);
    }

    var chatGptOpenButton = $('#chatgpt-open-btn');
    // Use 'open' for an open chatbot or 'closed' for a closed chatbot - Ver 1.1.0
    var chatgpt_start_status = 'closed';
    
    // Initially hide the chatbot - Ver 1.1.0
    chatGptChatBot.hide();
    chatGptOpenButton.show();

    var chatbotContainer = $('<div></div>').addClass('chatbot-container');
    var chatbotCollapseBtn = $('<button></button>').addClass('chatbot-collapse-btn');//.addClass('dashicons dashicons-format-chat'); // Add a collapse button
    var chatbotCollapsed = $('<div></div>').addClass('chatbot-collapsed'); // Add a collapsed chatbot icon dashicons-format-chat f125

    // initialize contactKenState
    var contactKenState = 0;
    var validEmailRegex = "\A[\w!#$%&'*+/=?`{|}~^-]+(?:\.[\w!#$%&'*+/=?`{|}~^-]+)*@↵(?:[A-Z0-9-]+\.)+[A-Z]{2,6}\Z"

    // Support variable greetings based on setting - Ver 1.1.0
    var initialGreeting = localStorage.getItem('chatgpt_initial_greeting') || 'Hello! How can I help you today?';
    localStorage.setItem('chatgpt_initial_greeting', initialGreeting);
    var subsequentGreeting = localStorage.getItem('chatgpt_subsequent_greeting') || 'Hello again! How can I help you?';
    localStorage.setItem('chatgpt_subsequent_greeting', subsequentGreeting);
    // Handle disclaimer - Ver 1.4.1
    var chatgpt_disclaimer_setting = localStorage.getItem('chatgpt_disclaimer_setting') || 'Yes';

    // Append the collapse button and collapsed chatbot icon to the chatbot container
    chatbotContainer.append(chatbotCollapseBtn);
    chatbotContainer.append(chatbotCollapsed);

    // Add initial greeting to the chatbot
    conversation.append(chatbotContainer);

    function initializeChatbot() {
        offTopicCounter = 0;
        var chatgpt_diagnostics = localStorage.getItem('chatgpt_diagnostics') || 'Off';
        var isFirstTime = !localStorage.getItem('chatgptChatbotOpened');
        var initialGreeting;
        // Remove any legacy conversations that might be store in local storage for increased privacy - Ver 1.4.2
        localStorage.removeItem('chatgpt_conversation');
        
        isFirstTime = true;
        if (isFirstTime) {
            initialGreeting = localStorage.getItem('chatgpt_initial_greeting') || 'Hello! How can I help you today?';

            // Logging for Diagnostics - Ver 1.4.2
            if (chatgpt_diagnostics === 'On') {
                console.log("initialGreeting" . initialGreeting);
            }

            // Don't append the greeting if it's already in the conversation
            if (conversation.text().includes(initialGreeting)) {
                return;
            }

            appendMessage(initialGreeting, 'assistant', 'initial-greeting');
            localStorage.setItem('chatgptChatbotOpened', 'true');
            // Save the conversation after the initial greeting is appended - Ver 1.2.0
            sessionStorage.setItem('chatgpt_conversation', conversation.html());

        } else {
            
            initialGreeting = localStorage.getItem('chatgpt_subsequent_greeting') || 'Hello again! How can I help you?';

            // Logging for Diagnostics - Ver 1.4.2
            if (chatgpt_diagnostics === 'On') {
                console.log("initialGreeting" . initialGreeting);
            }

            // Don't append the greeting if it's already in the conversation
            if (conversation.text().includes(initialGreeting)) {
                return;
            }
            
            appendMessage(initialGreeting, 'assistant', 'initial-greeting');
            localStorage.setItem('chatgptChatbotOpened', 'true');
        }
    }


    // Add chatbot header, body, and other elements - Ver 1.1.0
    var chatbotHeader = $('<div></div>').addClass('chatbot-header');
    chatGptChatBot.append(chatbotHeader);

    // Fix for Ver 1.2.0
    chatbotHeader.append(chatbotCollapseBtn);
    chatbotHeader.append(chatbotCollapsed);

    // Attach the click event listeners for the collapse button and collapsed chatbot icon
    chatbotCollapseBtn.on('click', toggleChatbot);
    chatbotCollapsed.on('click', toggleChatbot);
    chatGptOpenButton.on('click', toggleChatbot);

    function appendMessage(message, sender, cssClass) {
        var messageElement = $('<div></div>').addClass('chat-message');
        // var textElement = $('<span></span>').text(message);
        var textElement = $('<p></p>').text(message);

        // Add initial greetings if first time
        if (cssClass) {
            textElement.addClass(cssClass);
        }

        if (sender === 'user') {
            messageElement.addClass('user-message');
            textElement.addClass('user-text');
        } else if (sender === 'assistant') {
            messageElement.addClass('bot-message');
            textElement.addClass('bot-text');
        } else {
            messageElement.addClass('error-message');
            textElement.addClass('error-text');
        }

        messageElement.append(textElement);
        conversation.append(messageElement);

        // Add space between user input and bot response
        // if (sender === 'user' || sender === 'assistant') {
        //     // var spaceElement = $('<div></div>').addClass('message-space');
        //     conversation.append(spaceElement);
        // }

        // Ver 1.2.4
        // conversation.scrollTop(conversation[0].scrollHeight);
        conversation[0].scrollTop = conversation[0].scrollHeight;

        // Save the conversation locally between bot sessions - Ver 1.2.0
        sessionStorage.setItem('chatgpt_conversation', conversation.html());
    }

    function showTypingIndicator() {
        var typingIndicator = $('<div></div>').addClass('typing-indicator');
        var dot1 = $('<span>.</span>').addClass('typing-dot');
        var dot2 = $('<span>.</span>').addClass('typing-dot');
        var dot3 = $('<span>.</span>').addClass('typing-dot');
        
        typingIndicator.append(dot1, dot2, dot3);
        conversation.append(typingIndicator);
        conversation.scrollTop(conversation[0].scrollHeight);
    }

    function removeTypingIndicator() {
        $('.typing-indicator').remove();
    }

    submitButton.on('click', function () {
        var message = messageInput.val().trim();
        var chatgpt_disclaimer_setting = localStorage.getItem('chatgpt_disclaimer_setting') || 'Yes';

        if (!message) {
            return;
        }
            
        messageInput.val('');
        appendMessage(message, 'user');

        var previousMessages = getPreviousMessages();
        
        // chatgpt code for email routine
        if (message.toLowerCase().includes('contact ken')) {
            contactKenState = 1;
            appendMessage("OK, what is your first name? (or type “quit”)", 'assistant');
        } else if (message.toLowerCase() === 'quit' && contactKenState !== 0) {
            contactKenState = 0;
            appendMessage("No Problem. We can chat about innovation, product management, or UX or you can close this chat.", 'assistant');
        } else if (contactKenState !== 0) {
            switch (contactKenState) {
                case 1:
                    firstName = message;
                    appendMessage("What is your last name?", 'assistant');
                    contactKenState = 2;
                    break;
                case 2:
                    lastName = message;
                    appendMessage("Great! What is your email address?", 'assistant');
                    contactKenState = 3;
                    break;
                case 3:
                    userEmail = message;
                    if (!validateEmailFormat(userEmail)) {
                        appendMessage("I'm sorry, that doesn't look like a proper email address. Please be sure it's in the form of name@domain.com", 'assistant');
                        contactKenState = 3;
                        break;
                    }
                    appendMessage("Thank you. What message would you like me to share with Ken?", 'assistant');
                    contactKenState = 4;
                    break;
                case 4:
                    $.ajax({
                        url: "/wp-json/inno/v1/email/",
                        type: "POST",
                        data: {
                            firstName: firstName,
                            lastName: lastName,
                            userEmail: userEmail,
                            bodyHtml: message,
                        },
                        success: function(response){
                            console.log(response); // handle successful response here
                            appendMessage("Cool! I’ve reached out to Ken for you. We can chat about innovation, product management, or UX, or you can close this chat.", 'assistant');
                        },
                        error: function(response){
                            console.error(response); // handle error response here
                            appendMessage("Sorry, I encountered an error while emailing Ken, please try again or we can chat about innovation, product management, or UX, or you can close this chat.", 'assistant');
                        }
                    });
                    contactKenState = 0;
                    break;
            }
        } else {
            $.ajax({
                url: chatbot_chatgpt_params.ajax_url,
                method: 'POST',
                data: {
                    action: 'chatbot_chatgpt_send_message',
                    message: message,
                    chat_messages: JSON.stringify(previousMessages),
                },
                beforeSend: function () {
                    showTypingIndicator();
                    submitButton.prop('disabled', true);
                },
                success: function (response) {
                    removeTypingIndicator();
                    if (response.success) {
                        let botResponse = response.data;

                        if (botResponse.includes('OFF-TOPIC')) {
                            offTopicCounter += 1;
                            if (offTopicCounter != 0 && offTopicCounter % 3 == 0) {
                                offTopicCounter = 0;
                                botResponse = "Remember, I’m only here to talk about innovation, product management, or UX. And you can use me to message Ken.";
                            } else {
                                botResponse = "I don't know about that. Ask me about things I know.";
                            }
                        }

                        if (botResponse.startsWith(prefix_a) && chatgpt_disclaimer_setting === 'No') {
                            botResponse = botResponse.slice(prefix_a.length);
                        } else if (botResponse.startsWith(prefix_b) && chatgpt_disclaimer_setting === 'No') {
                            botResponse = botResponse.slice(prefix_b.length);
                        }
                                        
                        appendMessage(botResponse, 'assistant');
                    } else {
                        // appendMessage('Error: ' + response.data, 'assistant');  // for debugging
                        appendMessage('I’m sorry, I’m having some indigestion at the moment (technical issues). Please ask me again in a few minutes.', 'assistant');
                    }
                },
                error: function () {
                    removeTypingIndicator();
                    appendMessage('I’m sorry, I’m having some indigestion at the moment (technical issues). Please ask me again in a few minutes.', 'assistant');
                },
                complete: function () {
                    removeTypingIndicator();
                    submitButton.prop('disabled', false);
                },
            });
        }
    });
    
    function validateEmailFormat(email) {
        const regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,6})+$/;
        return regex.test(email);
      }

    messageInput.on('keydown', function (e) {
        if (e.keyCode === 13) {
            e.preventDefault();
            submitButton.click();
        }
    });

    // Add the toggleChatbot() function - Ver 1.1.0
    function toggleChatbot() {
        if (chatGptChatBot.is(':visible')) {
            chatGptChatBot.hide();
            chatGptOpenButton.show();
            localStorage.setItem('chatGPTChatBotStatus', 'closed');
            // Clear the conversation when the chatbot is closed - Ver 1.2.0
            // Keep the conversation when the chatbot is closed - Ver 1.2.4
            sessionStorage.removeItem('chatgpt_conversation');
            sessionStorage.clear();
        } else {
            chatGptChatBot.show();
            chatGptOpenButton.hide();
            localStorage.setItem('chatGPTChatBotStatus', 'open');
            loadConversation();
            scrollToBottom();
            sessionStorage.clear();
            
        }
    }

    // Add this function to maintain the chatbot status across page refreshes and sessions - Ver 1.1.0 and updated for Ver 1.4.1
    function loadChatbotStatus() {
        const chatGPTChatBotStatus = localStorage.getItem('chatGPTChatBotStatus');
        // const chatGPTChatBotStatus = localStorage.getItem('chatgpt_start_status');
        
        // If the chatbot status is not set in local storage, use chatgpt_start_status
        if (chatGPTChatBotStatus === null) {
            if (chatgpt_start_status === 'closed') {
                chatGptChatBot.hide();
                chatGptOpenButton.show();
            } else {
                chatGptChatBot.show();
                chatGptOpenButton.hide();
                // Load the conversation when the chatbot is shown on page load
                loadConversation();
                scrollToBottom();
            }
        } else if (chatGPTChatBotStatus === 'closed') {
            if (chatGptChatBot.is(':visible')) {
                chatGptChatBot.hide();
                chatGptOpenButton.show();
            }
        } else if (chatGPTChatBotStatus === 'open') {
            if (chatGptChatBot.is(':hidden')) {
                chatGptChatBot.show();
                chatGptOpenButton.hide();
                loadConversation();
                scrollToBottom();
            }
        }
    }

    // Add this function to scroll to the bottom of the conversation - Ver 1.2.1
    function scrollToBottom() {
        setTimeout(() => {
            // Logging for Diagnostics - Ver 1.4.2
            if (chatgpt_diagnostics === 'On') {
                console.log("Scrolling to bottom");
                console.log("Scroll height: " + conversation[0].scrollHeight);
            }
            conversation.scrollTop(conversation[0].scrollHeight);
        }, 100);  // delay of 100 milliseconds    
    }
   
    // Load conversation from local storage if available - Ver 1.2.0
    function loadConversation() {
        var storedConversation = sessionStorage.getItem('chatgpt_conversation');
        // var storedChats = sessionStorage.getItem('chatgpt_chats')
        if (storedConversation) {
            conversation.append(storedConversation);
            // Use setTimeout to ensure scrollToBottom is called after the conversation is rendered
            setTimeout(scrollToBottom, 0);
        } else {
            initializeChatbot();
        }
    }

    function getPreviousMessages() {
        var previousMessages = [];
        $('.chat-message').each(function () {
            var role = $(this).hasClass('user-message') ? 'user' : 'assistant';
            var content = $(this).find('.user-text, .bot-text').text();
            previousMessages.push({ role: role.toString(), content: content });
        });
        return previousMessages;
    }

    // Call the loadChatbotStatus function here - Ver 1.1.0
    loadChatbotStatus(); 

    // Load the conversation when the chatbot is shown on page load - Ver 1.2.0
    // Let the convesation stay persistent in session storage for increased privacy - Ver 1.4.2
    // loadConversation();

});