'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Calendar, Hotel, FileText, AlertCircle, Star, Loader2, Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import type { ChatMessage } from '@/types';
import { LOGO_NO_BG_SRC } from '@/constants/logos';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';

// ✅ Helper to clean message text by removing any Stripe URL the AI accidentally echoed
function cleanMessageText(message: string): string {
    return message.replace(/https:\/\/checkout\.stripe\.com\S*/g, '').trim();
}

export default function Chat() {
    const router = useRouter();
    const { user } = useAuth();
    const { refreshData } = useData();
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            sender: 'ai',
            message: "Hello! Welcome to Grand Hotel. I'm your AI assistant. How can I help you today?",
            timestamp: new Date().toISOString(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Voice Call Simulation & Speech API State
    const [isCalling, setIsCalling] = useState(false);
    const [callStatus, setCallStatus] = useState<'ringing' | 'connected' | 'ended'>('ringing');
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [callTranscript, setCallTranscript] = useState<string>('');
    const [isAITalking, setIsAITalking] = useState(false);

    const recognitionRef = useRef<any>(null);
    const isMutedRef = useRef(false);
    const isAITalkingRef = useRef(false);
    const isWaitingForAIRef = useRef(false);
    const callStatusRef = useRef(callStatus);
    const isSpeakerOnRef = useRef(isSpeakerOn);
    const messagesRef = useRef<ChatMessage[]>([]);

    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
    useEffect(() => { isAITalkingRef.current = isAITalking; }, [isAITalking]);
    useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);
    useEffect(() => { isSpeakerOnRef.current = isSpeakerOn; }, [isSpeakerOn]);
    useEffect(() => { messagesRef.current = messages; }, [messages]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isCalling && callStatus === 'connected') {
            timer = setInterval(() => setCallDuration(prev => prev + 1), 1000);
        } else {
            setCallDuration(0);
        }
        return () => clearInterval(timer);
    }, [isCalling, callStatus]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const speakText = (text: string, callback?: () => void) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            if (callback) callback();
            return;
        }
        window.speechSynthesis.cancel();
        if (isSpeakerOnRef.current) {
            const cleanText = text
                .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "")
                .replace(/\*+/g, "")
                .replace(/https?:\/\/\S+/g, "payment link")
                .trim();
            const utterance = new SpeechSynthesisUtterance(cleanText);
            setIsAITalking(true);
            isAITalkingRef.current = true;
            utterance.onend = () => {
                setIsAITalking(false);
                isAITalkingRef.current = false;
                isWaitingForAIRef.current = false;
                if (callback) callback();
            };
            utterance.onerror = () => {
                setIsAITalking(false);
                isAITalkingRef.current = false;
                isWaitingForAIRef.current = false;
                if (callback) callback();
            };
            window.speechSynthesis.speak(utterance);
        } else {
            setIsAITalking(false);
            isAITalkingRef.current = false;
            isWaitingForAIRef.current = false;
            if (callback) setTimeout(callback, 500);
        }
    };

    const startListening = () => {
        if (typeof window === 'undefined') return;
        if (isMutedRef.current || isAITalkingRef.current || isWaitingForAIRef.current) return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setCallTranscript("Voice call connected. (Speech Recognition not supported in this browser)");
            return;
        }

        if (!recognitionRef.current) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                if (!isMutedRef.current && !isAITalkingRef.current && !isWaitingForAIRef.current) {
                    setCallTranscript('Listening...');
                }
            };

            recognition.onresult = async (event: any) => {
                const transcript = event.results[0][0].transcript;
                if (transcript && !isMutedRef.current && !isAITalkingRef.current && !isWaitingForAIRef.current) {
                    isWaitingForAIRef.current = true;
                    try { recognition.stop(); } catch (e) { }
                    await handleVoiceInput(transcript);
                }
            };

            recognition.onerror = (event: any) => {
                if (event.error === 'no-speech') {
                    if (callStatusRef.current === 'connected' && !isMutedRef.current && !isAITalkingRef.current && !isWaitingForAIRef.current) {
                        setTimeout(() => {
                            if (callStatusRef.current === 'connected' && !isMutedRef.current && !isAITalkingRef.current && !isWaitingForAIRef.current) {
                                try { recognition.start(); } catch (e) { }
                            }
                        }, 500);
                    }
                }
            };

            recognition.onend = () => {
                if (callStatusRef.current === 'connected' && !isMutedRef.current && !isAITalkingRef.current && !isWaitingForAIRef.current) {
                    setTimeout(() => {
                        if (callStatusRef.current === 'connected' && !isMutedRef.current && !isAITalkingRef.current && !isWaitingForAIRef.current) {
                            try { recognition.start(); } catch (e) { }
                        }
                    }, 300);
                }
            };

            recognitionRef.current = recognition;
        }

        try { recognitionRef.current.start(); } catch (e) { }
    };

    const handleVoiceInput = async (userInputText: string) => {
        isWaitingForAIRef.current = true;
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { }
        }

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            sender: 'user',
            message: userInputText,
            timestamp: new Date().toISOString(),
        };

        const updatedMessages = [...messagesRef.current, userMessage];
        setMessages(updatedMessages);
        setCallTranscript(`You: "${userInputText}"`);
        setIsAITalking(true);

        try {
            const userContext = user ? { name: user.name, email: user.email, role: user.role } : null;
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: updatedMessages, userContext })
            });

            const data = await response.json();
            const aiMessageText = data.message || data.error || "Sorry, I had trouble connecting.";
            // ✅ Use paymentUrl directly from API response (safe, unmangled URL)
            const directPaymentUrl: string | undefined = data.paymentUrl;

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                message: cleanMessageText(aiMessageText),
                timestamp: new Date().toISOString(),
                paymentUrl: directPaymentUrl,
            }]);

            setCallTranscript(`AI: "${cleanMessageText(aiMessageText)}"`);
            refreshData();

            speakText(aiMessageText, () => {
                if (callStatusRef.current === 'connected' && !isMutedRef.current) {
                    startListening();
                }
            });
        } catch (error) {
            const errText = "I had trouble responding. Please check your connection.";
            setCallTranscript(`AI: "${errText}"`);
            speakText(errText, () => {
                if (callStatusRef.current === 'connected' && !isMutedRef.current) startListening();
            });
        }
    };

    const handleVoiceResponse = (option: string) => {
        if (callStatus !== 'connected') return;
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
        handleVoiceInput(option);
    };

    const startCall = () => {
        setIsCalling(true);
        setCallStatus('ringing');
        setCallTranscript('Ringing...');
        setIsAITalking(false);
        isAITalkingRef.current = false;
        isWaitingForAIRef.current = false;
        setIsMuted(false);
        setIsSpeakerOn(true);
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();

        setTimeout(() => {
            setCallStatus('connected');
            const welcomeText = "Hello! Thank you for calling Grand Hotel Assistant. How can I help you today?";
            setCallTranscript(welcomeText);
            speakText(welcomeText, () => startListening());
        }, 2000);
    };

    const endCall = () => {
        setCallStatus('ended');
        setCallTranscript('Call Ended.');
        setIsAITalking(false);
        isAITalkingRef.current = false;
        isWaitingForAIRef.current = false;
        if (typeof window !== 'undefined') {
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        }
        if (recognitionRef.current) {
            try {
                recognitionRef.current.onend = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.onresult = null;
                recognitionRef.current.stop();
            } catch (e) { }
            recognitionRef.current = null;
        }
        setTimeout(() => setIsCalling(false), 800);
    };

    useEffect(() => {
        if (callStatus === 'connected') {
            if (isMuted) {
                if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch (e) { } }
                setCallTranscript('Microphone muted.');
            } else {
                if (!isAITalking && !window.speechSynthesis.speaking) startListening();
            }
        }
    }, [isMuted]);

    useEffect(() => {
        if (callStatus === 'connected' && !isSpeakerOn) {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                setIsAITalking(false);
                isAITalkingRef.current = false;
            }
        }
    }, [isSpeakerOn]);

    useEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            sender: 'user',
            message: input,
            timestamp: new Date().toISOString(),
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');
        setIsTyping(true);

        try {
            const userContext = user ? { name: user.name, email: user.email, role: user.role } : null;
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: updatedMessages, userContext })
            });

            const data = await response.json();
            const aiMessageText = data.message || data.error || "I'm sorry, I'm having trouble connecting right now.";
            // ✅ Use paymentUrl directly from API response (safe, unmangled URL)
            const directPaymentUrl: string | undefined = data.paymentUrl;

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                message: cleanMessageText(aiMessageText),
                timestamp: new Date().toISOString(),
                paymentUrl: directPaymentUrl,
            }]);

            refreshData();
        } catch (error) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                message: "I'm sorry, I encountered an error. Please check your internet connection or try again later.",
                timestamp: new Date().toISOString(),
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleQuickAction = (action: string) => {
        switch (action) {
            case 'availability': router.push('/availability'); break;
            case 'book': router.push('/booking'); break;
            case 'complaint': router.push('/complaint'); break;
            case 'emergency': router.push('/emergency'); break;
            case 'feedback': router.push('/feedback'); break;
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Card className="relative flex flex-col h-[calc(100vh-12rem)] overflow-hidden">
                {/* Chat Header */}
                <div className="px-6 py-4 border-b bg-primary text-primary-foreground rounded-t-lg flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-semibold">AI Assistant Chat</h2>
                        <p className="text-sm opacity-90">Always here to help you</p>
                    </div>
                    <Button
                        onClick={startCall}
                        className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 h-10 w-10 flex items-center justify-center transition-all duration-200 border border-white/20 shadow-md hover:scale-105 active:scale-95 cursor-pointer"
                        aria-label="Call Assistant"
                    >
                        <Phone className="h-5 w-5" />
                    </Button>
                </div>

                {/* Messages Area */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.map((msg) => {
                        // ✅ Use paymentUrl stored directly on the message (from API response field)
                        // Fall back to regex extraction in case of legacy messages
                        const stripeUrl = msg.sender === 'ai'
                            ? ((msg as any).paymentUrl || null)
                            : null;
                        const cleanText = cleanMessageText(msg.message);

                        return (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[70%] rounded-lg px-4 py-2 ${msg.sender === 'user'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-gray-100 text-gray-900'
                                        }`}
                                >
                                    {/* ✅ Message text */}
                                    <p className="whitespace-pre-wrap">{cleanText}</p>

                                    {/* ✅ Payment button — shows when Stripe URL detected */}
                                    {stripeUrl && (
                                        <a
                                            href={stripeUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-3 flex items-center justify-center w-full bg-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors text-sm"
                                        >
                                            💳 Complete Payment Now
                                        </a>
                                    )}

                                    <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-gray-500'}`}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        );
                    })}

                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 rounded-lg px-4 py-2 flex items-center space-x-2">
                                <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                                <span className="text-gray-600">AI is typing...</span>
                            </div>
                        </div>
                    )}
                    <div />
                </div>

                {/* Quick Actions */}
                <div className="px-6 py-3 border-t bg-gray-50">
                    <p className="text-sm font-medium text-gray-700 mb-2">Quick Actions:</p>
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleQuickAction('availability')}>
                            <Calendar className="h-4 w-4 mr-1" />Check Availability
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleQuickAction('book')}>
                            <Hotel className="h-4 w-4 mr-1" />Book Room
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleQuickAction('complaint')}>
                            <FileText className="h-4 w-4 mr-1" />File Complaint
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleQuickAction('emergency')} className="border-red-300 text-red-600 hover:bg-red-50">
                            <AlertCircle className="h-4 w-4 mr-1" />Emergency
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleQuickAction('feedback')}>
                            <Star className="h-4 w-4 mr-1" />Give Feedback
                        </Button>
                    </div>
                </div>

                {/* Input Area */}
                <div className="px-6 py-4 border-t">
                    <div className="flex space-x-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Type your message..."
                            className="flex-1"
                        />
                        <Button onClick={handleSend} disabled={!input.trim()}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Voice Call Overlay */}
                {isCalling && (
                    <div className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-md text-white flex flex-col p-6 rounded-lg animate-in fade-in duration-300">
                        <div className="flex flex-col items-center space-y-2 mt-2 flex-shrink-0">
                            <div className="relative">
                                {callStatus === 'ringing' && (
                                    <div className="absolute -inset-4 rounded-full bg-blue-500/20 animate-pulse pointer-events-none" />
                                )}
                                {callStatus === 'connected' && isAITalking && (
                                    <div className="absolute -inset-4 rounded-full bg-green-500/20 animate-ping pointer-events-none" />
                                )}
                                <div className="h-28 w-28 rounded-full bg-white flex items-center justify-center border-4 border-white/15 shadow-2xl relative z-10 overflow-hidden p-1">
                                    <img src={LOGO_NO_BG_SRC} alt="Grand Hotel Logo" className="h-full w-full object-contain scale-110" />
                                </div>
                            </div>
                            <div className="text-center space-y-0.5">
                                <h3 className="text-xl font-bold tracking-tight">Grand Hotel Assistant</h3>
                                <p className="text-xs font-medium text-slate-400">
                                    {callStatus === 'ringing' && 'Ringing...'}
                                    {callStatus === 'connected' && `Connected • ${formatDuration(callDuration)}`}
                                    {callStatus === 'ended' && 'Call Ended'}
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full py-4 min-h-0 overflow-y-auto scrollbar-hide">
                            {callStatus === 'connected' && (
                                <div className="flex items-center space-x-1.5 h-6 mb-4 flex-shrink-0">
                                    {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                                        <span
                                            key={bar}
                                            style={{ animationDelay: `${bar * 0.15}s` }}
                                            className={`w-1 rounded-full bg-blue-400 ${isAITalking ? 'animate-bounce h-6' : 'h-2'} transition-all duration-300`}
                                        />
                                    ))}
                                </div>
                            )}

                            <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-center shadow-inner min-h-[80px] flex items-center justify-center flex-shrink-0">
                                <p className="text-sm text-slate-200 italic leading-relaxed">{callTranscript}</p>
                            </div>

                            {callStatus === 'connected' && (
                                <div className="mt-4 w-full space-y-2 flex-shrink-0">
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-1">Speak Option:</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Book a Room', 'Room Service', 'Housekeeping', 'Talk to Agent'].map((opt) => (
                                            <button
                                                key={opt}
                                                onClick={() => handleVoiceResponse(opt)}
                                                className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-medium rounded-xl border border-white/10 hover:border-white/20 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] text-center truncate cursor-pointer"
                                            >
                                                💬 {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-center items-center space-x-6 py-2 mt-auto flex-shrink-0">
                            <button
                                onClick={() => setIsMuted(!isMuted)}
                                disabled={callStatus === 'ended'}
                                className={`h-11 w-11 rounded-full flex items-center justify-center border transition-all duration-200 cursor-pointer ${isMuted ? 'bg-red-500/20 border-red-500/30 text-red-500' : 'bg-white/5 border-white/10 text-slate-300'}`}
                            >
                                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                            </button>
                            <button
                                onClick={endCall}
                                className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 flex items-center justify-center text-white shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer animate-pulse"
                            >
                                <PhoneOff className="h-6 w-6" />
                            </button>
                            <button
                                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                                disabled={callStatus === 'ended'}
                                className={`h-11 w-11 rounded-full flex items-center justify-center border transition-all duration-200 cursor-pointer ${isSpeakerOn ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/10 text-slate-300'}`}
                            >
                                {isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}