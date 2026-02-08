const HarshVoice = {
    isEnabled: false,
    hasInteracted: false,

    // 1. SAVE to Supabase
    savePreference: async (val) => {
        const { data: { user } } = await _sbClient.auth.getUser();
        if (!user) return;
        await _sbClient.from('profiles').upsert({ id: user.id, voice_enabled: val });
    },

    // 2. LOAD from Supabase
    loadPreference: async () => {
        const { data: { user } } = await _sbClient.auth.getUser();
        if (!user) return;

        const { data } = await _sbClient.from('profiles')
            .select('voice_enabled')
            .eq('id', user.id)
            .single();

        if (data) {
            HarshVoice.isEnabled = data.voice_enabled;
            const btn = document.getElementById('voice-toggle');
            if (btn) {
                btn.innerText = HarshVoice.isEnabled ? "ON" : "OFF";
                btn.classList.toggle('active', HarshVoice.isEnabled);
            }
        }
    },

    // 3. TOGGLE Function
    toggle: () => {
        HarshVoice.isEnabled = !HarshVoice.isEnabled;
        const btn = document.getElementById('voice-toggle');
        if (btn) {
            btn.innerText = HarshVoice.isEnabled ? "ON" : "OFF";
            btn.classList.toggle('active', HarshVoice.isEnabled);
        }
        
        HarshVoice.savePreference(HarshVoice.isEnabled);
        
        if (HarshVoice.isEnabled) {
            HarshVoice.speak("Voice enabled. Ready to talk.");
        } else {
            window.speechSynthesis.cancel();
        }
    },

    // 4. SPEAK Function (Cleans text and ignores icons)
    speak: (text) => {
        if (!HarshVoice.isEnabled || !text) return;
        
        window.speechSynthesis.cancel(); // Stop current speech to start fresh

        // CLEANING: Remove Markdown, Emojis commonly used in UI, and extra spaces
        let cleanText = text
            .replace(/[*_`#]/g, '')     // Remove Markdown
            .replace('📋', '')          // Remove Clipboard Icon
            .replace(/\s+/g, ' ')      // Collapse multiple spaces
            .trim();
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        utterance.rate = 1.0; 
        utterance.pitch = 1.0; 
        
        const voices = window.speechSynthesis.getVoices();
        // Try to find a clear English voice
        utterance.voice = voices.find(v => v.name.includes('Google US English')) || 
                          voices.find(v => v.lang.startsWith('en')) || 
                          voices[0];
        
        window.speechSynthesis.speak(utterance);
    },

    // 5. INITIALIZE the Observer (The "Ear" of the App)
    init: (containerId) => {
        const btn = document.getElementById('voice-toggle');
        if (btn) btn.addEventListener('click', () => HarshVoice.toggle());

        const chatContainer = document.getElementById(containerId);
        if (!chatContainer) return;

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    // Check if node is an element and has the trigger class
                    if (node.nodeType === 1 && node.classList.contains('harsh-message')) {
                        
                        // PRECISION PICKUP: Only read the <span> content if it exists
                        // This prevents reading the 📋 button or "thinking" placeholder
                        const textSpan = node.querySelector('span');
                        const textToSpeak = textSpan ? textSpan.innerText : node.innerText;
                        
                        // We check if it's still "thinking" to avoid talking too early
                        if (!textToSpeak.includes("thinking...")) {
                             HarshVoice.speak(textToSpeak);
                        }
                    }
                });
            });
        });

        observer.observe(chatContainer, { childList: true, subtree: true });
    }
};

// Keep voices loaded
window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();