const HarshVoice = {
    isEnabled: false,
    hasInteracted: false,

    // 1. SAVE to Supabase
    savePreference: async (val) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('profiles').upsert({ id: user.id, voice_enabled: val });
    },

    // 2. LOAD from Supabase
    loadPreference: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase.from('profiles')
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
        btn.innerText = HarshVoice.isEnabled ? "ON" : "OFF";
        btn.classList.toggle('active', HarshVoice.isEnabled);
        
        HarshVoice.savePreference(HarshVoice.isEnabled);
        
        if (HarshVoice.isEnabled) {
            HarshVoice.speak("Voice enabled. Prepare your ears.");
        } else {
            window.speechSynthesis.cancel();
        }
    },

    // 4. SPEAK Function
    speak: (text) => {
        if (!HarshVoice.isEnabled || !text) return;
        
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/[*_`#]/g, ''); // Removes Markdown junk
        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        utterance.rate = 1.1; // Slightly fast
        utterance.pitch = 0.9; // Slightly bored/deep
        
        const voices = window.speechSynthesis.getVoices();
        utterance.voice = voices.find(v => v.name.includes('Google US English')) || voices[0];
        
        window.speechSynthesis.speak(utterance);
    },

    // 5. INITIALIZE the Observer
    init: (containerId) => {
        // Setup toggle button click
        const btn = document.getElementById('voice-toggle');
        if (btn) btn.addEventListener('click', () => HarshVoice.toggle());

        // Watch for new messages
        const chatContainer = document.getElementById(containerId);
        if (!chatContainer) return;

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    // nodeType 1 is an Element. Change 'harsh-message' to your actual bot message class.
                    if (node.nodeType === 1 && node.classList.contains('harsh-message')) {
                        HarshVoice.speak(node.textContent);
                    }
                });
            });
        });

        observer.observe(chatContainer, { childList: true });
    }
};

window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();